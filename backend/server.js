/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║              d4rk_livemap – Backend v2.0                 ║
 * ║   Discord OAuth2 · Socket.io · FiveM API-Proxy           ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Dieses Backend übernimmt drei Aufgaben:
 *   1. Discord OAuth2 Login für das Web-Frontend
 *   2. Socket.io Server – sendet Echtzeit-Daten an alle Clients
 *   3. FiveM-Poller – fragt den FiveM-Server alle 500ms ab
 */

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const session    = require('express-session');
const cors       = require('cors');
const helmet     = require('helmet');
const fetch      = require('node-fetch');

const { requireSession, API_KEYS } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const apiRoutes  = require('./routes/api');

// ─────────────────────────────────────────────────────────────
// App-Setup
// ─────────────────────────────────────────────────────────────

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;

// Erlaubte Origins für CORS (aus .env laden)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_WWW,
  process.env.BACKEND_URL,
  'http://localhost:3000',
  'http://localhost:5500',
].filter(Boolean);

// ─────────────────────────────────────────────────────────────
// Socket.io
// ─────────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin:      allowedOrigins,
    credentials: true,
    methods:     ['GET', 'POST'],
  },
  // Nur HTTP-Polling (kein WebSocket-Upgrade)
  // → funktioniert zuverlässig hinter Apache/nginx-Proxies
  transports:      ['polling'],
  pingTimeout:     60000,
  pingInterval:    25000,
  allowUpgrades:   false,
  httpCompression: false,
});

// Socket.io für andere Module zugänglich machen
app.set('io', io);

// ── Socket.io Auth-Middleware ─────────────────────────────────
// Prüft API-Key oder Session beim Verbinden
io.use((socket, next) => {
  const apiKey = socket.handshake.auth?.apiKey || socket.handshake.query?.apiKey;
  if (apiKey && API_KEYS[apiKey]) {
    socket.auth = { type: 'apikey', name: API_KEYS[apiKey].name };
    return next();
  }
  // Ohne Auth: anonymous – Frontend prüft bereits per /auth/me
  socket.auth = { type: 'anonymous' };
  next();
});

// ── Socket.io Events ─────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client verbunden: ${socket.id} (gesamt: ${io.engine.clientsCount})`);

  // Sofort aktuellen Kartenstand schicken
  if (lastState) {
    socket.emit('map:update', lastState);
  }

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.io] Client getrennt: ${socket.id} (${reason})`);
  });

  // Client kann manuell ein Update anfordern
  socket.on('map:request', () => {
    if (lastState) socket.emit('map:update', lastState);
  });
});

// ─────────────────────────────────────────────────────────────
// FiveM-Poller
// Fragt den FiveM-Server regelmäßig ab und pusht Änderungen
// an alle verbundenen Clients via Socket.io
// ─────────────────────────────────────────────────────────────

let lastState     = null;   // Letzter bekannter Kartenstand
let lastStateHash = '';     // Hash zum Erkennen von Änderungen
let pollErrors    = 0;      // Fehler-Zähler für Logging

/**
 * Erstellt einen einfachen Hash aus den Spielerdaten
 * um unnötige Socket-Broadcasts zu vermeiden
 */
function hashState(data) {
  const players = (data.players || []).map(p => `${p.id}:${p.x}:${p.y}`).sort().join('|');
  const markers = (data.markers || []).length;
  const zones   = (data.zones   || []).length;
  return `p${players}_m${markers}_z${zones}`;
}

/**
 * Fragt den FiveM-Server ab und broadcastet Änderungen
 */
async function pollFiveM() {
  const base   = (process.env.FIVEM_URL || '').replace(/\/$/, '');
  const secret = process.env.FIVEM_SECRET || '';

  if (!base) return;

  try {
    const sep = '/d4rk_api/internal/data';
    const url = `${base}${sep}${secret ? `?token=${encodeURIComponent(secret)}` : ''}`;

    const res = await fetch(url, {
      headers: {
        'X-Internal-Secret': secret,
        'Accept': 'application/json',
      },
      timeout: 3000,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    pollErrors = 0;

    // Fahrzeuge aus Spielerdaten ableiten
    data.vehicles = (data.players || [])
      .filter(p => p.inVeh)
      .map(p => ({
        playerId:   p.id,
        playerName: p.name,
        vehicle:    p.veh,
        x: p.x, y: p.y, z: p.z,
        heading: p.heading,
      }));

    data.timestamp = Date.now();

    // Nur bei Änderungen broadcasten
    const hash = hashState(data);
    if (hash !== lastStateHash) {
      lastStateHash = hash;
      lastState     = data;
      io.emit('map:update', data);

      if (process.env.DEBUG === 'true') {
        console.log(`[Poller] Update: ${(data.players||[]).length} Spieler, ${(data.markers||[]).length} Marker`);
      }
    }

  } catch (err) {
    pollErrors++;
    if (pollErrors <= 3 || pollErrors % 30 === 0) {
      console.error(`[Poller] FiveM nicht erreichbar (${pollErrors}x): ${err.message}`);
    }
    if (pollErrors === 3) {
      io.emit('map:offline', { message: 'FiveM nicht erreichbar', since: Date.now() });
    }
  }
}

// Poller starten – nur wenn Clients verbunden sind (spart Ressourcen)
setInterval(() => {
  if (io.engine.clientsCount > 0) {
    pollFiveM();
  }
}, 500);

console.log('[Poller] Gestartet (500ms Intervall)');

// ─────────────────────────────────────────────────────────────
// Express Middleware
// ─────────────────────────────────────────────────────────────

// Sicherheits-Header (CSP deaktiviert für Socket.io-Kompatibilität)
app.use(helmet({ contentSecurityPolicy: false }));

// Proxy vertrauen (wichtig für HTTPS hinter Apache/nginx)
app.set('trust proxy', 1);

// CORS
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // Server-zu-Server Requests erlauben
    if (allowedOrigins.includes(origin)) return cb(null, true);
    console.warn('[CORS] Geblockt:', origin);
    cb(new Error('CORS: Origin nicht erlaubt'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (Cookie-basiert)
app.use(session({
  secret:            process.env.SESSION_SECRET || 'BITTE_IN_ENV_SETZEN',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   parseInt(process.env.SESSION_MAX_AGE) || 86400000,
    sameSite: 'none', // Nötig für Cross-Site Redirects (Discord OAuth)
  },
}));

// ── Debug-Logging ─────────────────────────────────────────────
if (process.env.DEBUG === 'true') {
  app.use((req, res, next) => {
    const auth = req.headers['x-api-key']
      ? '[API-KEY]'
      : (req.session?.user ? `[${req.session.user.username}]` : '[anon]');
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${auth}`);
    next();
  });
}

// ─────────────────────────────────────────────────────────────
// Routen
// ─────────────────────────────────────────────────────────────

// Login-Redirect
app.get('/login', (req, res) => {
  res.redirect((process.env.FRONTEND_URL || '/') + '/login.html');
});

// Root-Redirect → Frontend
app.get('/', (req, res) => {
  res.redirect(process.env.FRONTEND_URL || '/');
});

// Status-Endpunkt (kein Auth nötig – für Health-Checks)
app.get('/status', (req, res) => {
  res.json({
    status:    'online',
    clients:   io.engine.clientsCount,
    lastPoll:  lastState?.timestamp || null,
    pollErrors,
    uptime:    Math.floor(process.uptime()),
    version:   require('./package.json').version,
  });
});

// Auth-Routen (/auth/login, /auth/callback, /auth/logout, /auth/me)
app.use('/auth', authRoutes);

// API-Routen (/api/players, /api/markers, ...)
app.use('/api', apiRoutes);

// ─────────────────────────────────────────────────────────────
// Fehlerbehandlung
// ─────────────────────────────────────────────────────────────

// 404
app.use((req, res) => {
  if (req.accepts('json')) {
    return res.status(404).json({
      error:     'Not Found',
      path:      req.path,
      available: ['/status', '/auth/login', '/auth/me', '/api/data'],
    });
  }
  res.status(404).send('404 – Seite nicht gefunden');
});

// Allgemeiner Fehler-Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  if (req.accepts('json')) {
    return res.status(500).json({
      error:   'Interner Serverfehler',
      message: process.env.DEBUG === 'true' ? err.message : 'Interner Fehler',
    });
  }
  res.status(500).send('500 – Interner Serverfehler');
});

// ─────────────────────────────────────────────────────────────
// Server starten
// ─────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║         D4rk LiveMap Backend v2.0            ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Backend:  http://localhost:${PORT}`);
  console.log(`  Frontend: ${process.env.FRONTEND_URL || 'nicht gesetzt'}`);
  console.log(`  FiveM:    ${process.env.FIVEM_URL || 'nicht gesetzt'}`);
  console.log(`  API-Keys: ${Object.keys(API_KEYS).length} konfiguriert`);
  console.log(`  Debug:    ${process.env.DEBUG === 'true' ? 'AN' : 'AUS'}`);
  console.log('──────────────────────────────────────────────');
});
