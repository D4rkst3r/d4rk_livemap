# 🗺️ d4rk_livemap

Echtzeit-Livekarte für FiveM mit Discord-Login, Spielerpositionen, Markern und Zonen.

![Version](https://img.shields.io/badge/Version-2.0.0-teal)
![FiveM](https://img.shields.io/badge/FiveM-Kompatibel-blue)
![License](https://img.shields.io/badge/Lizenz-MIT-green)

---

## ✨ Features

| Feature | Beschreibung |
|---|---|
| 🔴 Echtzeit-Positionen | Spielerpositionen via Socket.io (500ms Update) |
| 🔐 Discord Login | OAuth2-Authentifizierung mit Rollen-Prüfung |
| 📍 Marker-API | Marker aus anderen FiveM-Ressourcen hinzufügen |
| 🔵 Zonen | Kreise und Polygone auf der Karte |
| 🚗 Fahrzeuge | Separate Fahrzeug-Anzeige |
| 📋 Events | Login/Logout und Marker-Events protokollieren |
| 🗺️ Tile-Support | Eigene GTA5-Kartenkacheln |
| 🔑 API-Keys | Externe Tools können Marker setzen |

---

## 📋 Voraussetzungen

- **FiveM-Server** (txAdmin oder manuell)
- **Webserver** mit Node.js ≥ 18 (z.B. VPS, Plesk-Hosting)
- **Discord Application** (für OAuth2 Login)
- **Cloudflare Account** (kostenlos, empfohlen für den Tunnel)

---

## 🚀 Installation

### Schritt 1 – FiveM Ressource installieren

1. Den Ordner `fivem/` als `d4rk_api` in dein FiveM-Ressourcen-Verzeichnis kopieren:
   ```
   resources/[local]/d4rk_api/
   ```

2. `config.lua` öffnen und `InternalSecret` setzen:
   ```lua
   Config.InternalSecret = 'DEIN_GEHEIMER_TOKEN'
   ```
   > Token generieren: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. In der `server.cfg` hinzufügen:
   ```
   ensure d4rk_api
   ```

4. FiveM-Server neu starten.

---

### Schritt 2 – Discord Application einrichten

1. Gehe zu [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → Name eingeben (z.B. „LiveMap")
3. **OAuth2** → **Redirects** → URL eintragen:
   ```
   https://api.deine-domain.de/auth/callback
   ```
4. **Client ID** und **Client Secret** notieren
5. Server-ID herausfinden: Rechtsklick auf deinen Discord-Server → **ID kopieren**
   (Entwicklermodus muss aktiviert sein: Einstellungen → Erweitert → Entwicklermodus)

---

### Schritt 3 – Cloudflare Tunnel einrichten (empfohlen)

Der Cloudflare Tunnel ermöglicht die Verbindung zwischen dem Webserver und dem FiveM-Server
**ohne Portfreigabe in der Firewall**.

1. [Cloudflare-Account](https://cloudflare.com) erstellen (kostenlos)
2. Deine Domain zu Cloudflare hinzufügen
3. `cloudflared` auf dem **FiveM-Server PC** herunterladen:
   - Windows: [cloudflared-windows-amd64.exe](https://github.com/cloudflare/cloudflared/releases/latest)
   - Linux: `curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared && chmod +x cloudflared`

4. Einloggen und Tunnel erstellen:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create fivem-api
   ```

5. Config-Datei erstellen (`~/.cloudflared/config.yml`):
   ```yaml
   tunnel: DEINE_TUNNEL_ID
   credentials-file: /pfad/zur/TUNNEL_ID.json

   ingress:
     - hostname: fivem-api.deine-domain.de
       service: http://localhost:30120
     - service: http_status:404
   ```

6. DNS-Eintrag setzen:
   ```bash
   cloudflared tunnel route dns fivem-api fivem-api.deine-domain.de
   ```

7. Tunnel beim Systemstart automatisch starten:
   ```bash
   # Linux (systemd)
   cloudflared service install
   systemctl enable cloudflared
   systemctl start cloudflared

   # Windows (Task Scheduler)
   # Siehe docs/windows-autostart.md
   ```

8. In der Backend `.env` eintragen:
   ```env
   FIVEM_URL=https://fivem-api.deine-domain.de
   ```

> **Alternative ohne Cloudflare:** Direkte IP verwenden (`FIVEM_URL=http://SERVER_IP:30120`),
> dann muss Port 30120 in der Firewall freigegeben sein.

---

### Schritt 4 – Backend konfigurieren

1. In den `backend/`-Ordner wechseln
2. `.env.example` kopieren:
   ```bash
   cp .env.example .env
   ```
3. `.env` öffnen und alle Werte eintragen (Kommentare erklären jeden Eintrag)

4. Abhängigkeiten installieren:
   ```bash
   npm install
   ```

5. Backend starten:
   ```bash
   # Direkt
   node server.js

   # Mit pm2 (empfohlen für Produktion)
   npm install -g pm2
   pm2 start server.js --name d4rk-livemap
   pm2 save
   pm2 startup
   ```

---

### Schritt 5 – Frontend deployen

Den Inhalt des `frontend/`-Ordners auf deinen Webserver hochladen:
- `index.html` → Kartenansicht (erfordert Login)
- `login.html` → Discord Login-Seite

Bei Plesk: Dateien in den `httpdocs`-Ordner der Frontend-Domain hochladen.

---

### Schritt 6 – Karten-Tiles einrichten (optional)

Ohne Tiles wird ein einfarbiger Hintergrund angezeigt. Für echte GTA5-Kacheln:

1. GTA5-Dateien mit [OpenIV](https://openiv.com) öffnen
2. `GTA V\x64b.rpf\data\cdimages\scaleform_generic.rpf\minimap_sea_*.ytd` extrahieren
3. Mit dem mitgelieferten Script konvertieren:
   ```bash
   cd tools/
   npm install
   node tile_cutter.js
   ```
4. Erstellte Tiles auf den Tile-Server hochladen

---

## ⚙️ Konfiguration

### Backend `.env` – wichtigste Einstellungen

| Variable | Beschreibung |
|---|---|
| `FIVEM_URL` | URL zum FiveM-Server (direkt oder Cloudflare Tunnel) |
| `FIVEM_SECRET` | Geheimer Token (muss mit `Config.InternalSecret` übereinstimmen) |
| `DISCORD_CLIENT_ID` | Discord Application Client ID |
| `DISCORD_CLIENT_SECRET` | Discord Application Client Secret |
| `DISCORD_GUILD_ID` | Discord Server-ID |
| `DISCORD_REQUIRED_ROLES` | Rollen-IDs mit Zugang (leer = alle Mitglieder) |
| `APIKEY_1` | API-Key für externe Tools (Format: `key:Name:permissions`) |

Alle Optionen mit Erklärungen in `.env.example`.

---

## 🔌 Marker-API (aus anderen FiveM-Ressourcen)

```lua
-- server/main.lua deiner Ressource:

-- Marker hinzufügen
exports.d4rk_api:AddMarker({
    id     = 'shop_' .. shopId,
    x      = pos.x,
    y      = pos.y,
    z      = pos.z,
    label  = 'Shop #' .. shopId,
    color  = '#00d4aa',
    icon   = 'default',  -- box | cone | barrier | tent | lamp | blip | default
    group  = 'Shops',
    source = 'mein_shop_script',
})

-- Marker entfernen
exports.d4rk_api:RemoveMarker('shop_' .. shopId)

-- Alle Marker einer Ressource löschen
exports.d4rk_api:ClearMarkers('mein_shop_script')
```

---

## 🌐 HTTP-API

Alle Endpunkte erfordern entweder eine Discord-Session oder den Header `X-API-Key`.

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/status` | GET | Server-Status (kein Auth) |
| `/auth/login` | GET | Discord Login starten |
| `/auth/me` | GET | Aktuelle Session prüfen |
| `/auth/logout` | GET | Ausloggen |
| `/api/data` | GET | Spieler + Marker + Zonen kombiniert |
| `/api/players` | GET | Alle Spieler |
| `/api/markers` | GET | Alle Marker |
| `/api/zones` | GET | Alle Zonen |
| `/api/vehicles` | GET | Alle Fahrzeuge |
| `/api/events` | GET | Event-Log |
| `/api/stats` | GET | Statistiken |

---

## 📁 Dateistruktur

```
d4rk_livemap/
├── backend/                  ← Node.js Backend
│   ├── server.js             ← Hauptdatei
│   ├── package.json
│   ├── .env.example          ← Konfigurationsvorlage
│   ├── middleware/
│   │   └── auth.js           ← Discord-Session + API-Key Auth
│   └── routes/
│       ├── auth.js           ← Discord OAuth2 Routen
│       └── api.js            ← FiveM API-Proxy Routen
│
├── frontend/                 ← Web-Interface
│   ├── index.html            ← Kartenansicht
│   └── login.html            ← Login-Seite
│
├── fivem/                    ← FiveM Ressource (d4rk_api)
│   ├── fxmanifest.lua
│   ├── config.lua            ← FiveM Konfiguration
│   ├── client/
│   │   └── main.lua          ← Position senden
│   └── server/
│       └── main.lua          ← HTTP-API + Exports
│
└── README.md
```

---

## 🔧 Fehlerbehebung

### Karte lädt nicht / CORS-Fehler
- Prüfe ob `FRONTEND_URL` und `FRONTEND_URL_WWW` in der `.env` korrekt gesetzt sind
- Stelle sicher dass das Backend erreichbar ist: `https://api.deine-domain.de/status`

### Discord Login schlägt fehl
- Prüfe ob die Redirect-URI **exakt** im Discord Developer Portal eingetragen ist
- Nach Änderungen am Secret muss das Backend neu gestartet werden

### FiveM nicht erreichbar (502-Fehler)
- Prüfe ob `d4rk_api` in der FiveM-Konsole läuft: `restart d4rk_api`
- Prüfe ob `FIVEM_SECRET` in `.env` und `Config.InternalSecret` in `config.lua` übereinstimmen
- Bei direkter IP: Prüfe ob der Port in der Firewall freigegeben ist
- Bei Cloudflare Tunnel: Prüfe ob `cloudflared` läuft

### Socket.io Timeout
- Das Backend muss auf `0.0.0.0` binden (nicht nur `localhost`)
- Bei Plesk: Node.js App muss als Plesk-App laufen, nicht als Proxy

---

## 📄 Lizenz

MIT License – Frei verwendbar, auch für kommerzielle Projekte.

---

## 👤 Autor

Erstellt von **D4rkst3r**
