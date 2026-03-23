/**
 * d4rk_livemap – middleware/auth.js
 * Authentifizierung via Discord-Session oder API-Key
 */

// ── API-Keys aus .env laden ──────────────────────────────────
// Format in .env: APIKEY_1=secretkey:Name:read,markers,admin
function loadApiKeys() {
    const keys = {};
    let i = 1;
    while (process.env[`APIKEY_${i}`]) {
        const raw   = process.env[`APIKEY_${i}`];
        const parts = raw.split(':');
        if (parts.length >= 3) {
            const key   = parts[0].trim();
            const name  = parts[1].trim();
            const perms = parts[2].split(',').map(p => p.trim()).filter(Boolean);
            keys[key]   = { name, permissions: perms };
        }
        i++;
    }
    return keys;
}

const API_KEYS = loadApiKeys();

// ── Hilfsfunktionen ──────────────────────────────────────────

function hasPermission(permissions, required) {
    if (permissions.includes('admin')) return true;
    return permissions.includes(required);
}

// ── Middleware ───────────────────────────────────────────────

/**
 * Prüft ob die Anfrage entweder:
 *   a) eine gültige Discord-Session hat, oder
 *   b) einen gültigen API-Key im Header X-API-Key trägt
 *
 * Setzt req.auth = { type: 'session'|'apikey', name, permissions }
 */
function requireAuth(req, res, next) {
    // 1. API-Key im Header?
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        const keyData = API_KEYS[apiKey];
        if (!keyData) {
            return res.status(401).json({
                error:   'Ungültiger API-Key',
                message: 'Der angegebene API-Key ist nicht gültig.',
            });
        }
        req.auth = {
            type:        'apikey',
            name:        keyData.name,
            permissions: keyData.permissions,
        };
        return next();
    }

    // 2. Discord-Session vorhanden?
    if (req.session && req.session.user) {
        req.auth = {
            type:        'session',
            name:        req.session.user.username,
            permissions: ['read', 'markers', 'admin'], // Browser-Session hat alles
        };
        return next();
    }

    // 3. Weder noch → 401
    return res.status(401).json({
        error:    'Nicht authentifiziert',
        login:    '/auth/login',
        message:  'Bitte mit Discord einloggen oder X-API-Key Header setzen.',
    });
}

/**
 * Factory: erzeugt eine Middleware die eine bestimmte Permission prüft
 * Verwendung: requirePermission('markers') als Route-Middleware
 */
function requirePermission(perm) {
    return (req, res, next) => {
        if (!req.auth) {
            return res.status(401).json({ error: 'Nicht authentifiziert' });
        }
        if (!hasPermission(req.auth.permissions, perm)) {
            return res.status(403).json({
                error:      'Keine Berechtigung',
                required:   perm,
                yourPerms:  req.auth.permissions,
                message:    `Dein API-Key benötigt die Permission "${perm}".`,
            });
        }
        next();
    };
}

/**
 * Middleware für Browser-Routen (kein JSON, Redirect zur Login-Seite)
 */
function requireSession(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
}

module.exports = { requireAuth, requirePermission, requireSession, API_KEYS, hasPermission };