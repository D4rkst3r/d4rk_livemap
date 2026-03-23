--[[
    ╔══════════════════════════════════════════════════════════╗
    ║              d4rk_api – Konfiguration                    ║
    ║   Passe diese Datei an deinen Server an                  ║
    ╚══════════════════════════════════════════════════════════╝
]]

Config = {}

-- ── Ressource ────────────────────────────────────────────────
Config.ResourceName = 'd4rk_api'

-- ── Position senden ──────────────────────────────────────────
-- Wie oft soll die Position an den Server gesendet werden? (in ms)
-- Empfehlung: 1000-2000ms
Config.UpdateInterval = 2000

-- ── Interner API-Token ───────────────────────────────────────
-- MUSS exakt mit FIVEM_SECRET in der Backend .env übereinstimmen!
-- Generieren: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Config.InternalSecret = 'HIER_DEINEN_GEHEIMEN_TOKEN_EINTRAGEN'

-- ── Event-Log ────────────────────────────────────────────────
-- Wie viele Events sollen gespeichert werden?
Config.MaxEventLog = 200

-- ── Debug ────────────────────────────────────────────────────
-- true = ausführliche Logs in der FiveM-Konsole
Config.Debug = false
