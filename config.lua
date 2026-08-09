--[[
    d4rk_livemap – config.lua
]]

Config                   = {}

-- ── Allgemein ──────────────────────────────────────────────
Config.ResourceName      = 'd4rk_livemap'

-- Update-Intervall: wie oft der Client seine Position sendet (ms)
Config.UpdateInterval    = 2000

-- Spieler die AFK sind ausblenden (nach X Sekunden keine Bewegung)
Config.HideAfkAfter      = 0 -- 0 = nie ausblenden

-- ── Berechtigungen ────────────────────────────────────────
Config.RequirePermission = ''

-- ── Karten-Tiles ──────────────────────────────────────────
Config.TileDirectory     = 'tiles'

-- Mehrere Kachelsaetze? Dann liegen sie unter web/tiles/<stil>/{z}/{x}/{y}.jpg und
-- werden ueber /tiles/<stil>/... abgerufen. Die Liste ist eine WEISSLISTE — was hier
-- nicht steht, wird nicht ausgeliefert, egal was in der Adresse steht.
-- Leer lassen, wenn nur EIN Satz direkt unter web/tiles/{z}/... liegt.
Config.TileStyles        = { 'satellite', 'road', 'roads2', 'minimap' }

-- ── Spieler-Darstellung ───────────────────────────────────
Config.ShowPlayerNames   = true
Config.ShowPlayerCount   = true
Config.PlayerColor       = '#00d4aa'

-- ── Debug ─────────────────────────────────────────────────
Config.Debug             = false

-- ══════════════════════════════════════════════════════════
-- Discord OAuth2 – Zugangsschutz für die Live-Karte
-- ══════════════════════════════════════════════════════════
--
-- SETUP-ANLEITUNG:
--   1. https://discord.com/developers/applications → Neue App erstellen
--   2. OAuth2 → Redirect URI hinzufügen:
--         http://DEINE_SERVER_IP:30120/d4rk_livemap/auth/callback
--   3. Bot-Tab → Bot hinzufügen und auf deinen Discord-Server einladen
--      (nur nötig wenn RequiredRoles gesetzt ist)
--   4. ClientID, ClientSecret, GuildID und Rollen-IDs hier eintragen
--   5. Enabled = true setzen
--
-- ROLLEN-IDs ermitteln:
--   Discord → Server-Einstellungen → Rollen → Rechtsklick → ID kopieren
--   (Entwicklermodus muss aktiv sein: Einstellungen → Erweitert)
--
Config.Discord           = {
    -- Auf true setzen sobald alles konfiguriert ist
    Enabled       = true,

    -- OAuth2 App-Daten (discord.com/developers/applications)
    ClientID      = 'HIER_EINTRAGEN',
    ClientSecret  = 'HIER_EINTRAGEN_NICHT_COMMITTEN',

    -- Discord Server (Guild) ID – wer muss Mitglied sein?
    GuildID       = 'HIER_EINTRAGEN',

    -- Rollen-IDs die Zugang bekommen (leeres Array = jeder Guild-Member darf rein)
    -- Wenn Rollen eingetragen sind: Bot MUSS auf dem Server sein!
    RequiredRoles = {
        '1439019849664696460', -- z.B. "Livemap-Zugang"
        -- '987654321098765432',  -- oder mehrere Rollen (ODER-Verknüpfung)
    },

    -- Muss exakt mit dem Eintrag im Discord Developer Portal übereinstimmen
    RedirectURI   = 'http://localhost:30120/d4rk_livemap/auth/callback',

    -- Wie lange eine Session gültig ist (Sekunden) – Standard: 24h
    SessionExpiry = 86400,

    -- Titel der auf der Login-Seite angezeigt wird
    ServerName    = 'D4rk Dev Server',
}
