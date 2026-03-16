--[[
    d4rk_livemap – config.lua
]]

Config = {}

-- ── Allgemein ──────────────────────────────────────────────
Config.ResourceName = 'd4rk_livemap'

-- Update-Intervall: wie oft der Client seine Position sendet (ms)
Config.UpdateInterval = 2000

-- Spieler die AFK sind ausblenden (nach X Sekunden keine Bewegung)
Config.HideAfkAfter = 0  -- 0 = nie ausblenden

-- ── Berechtigungen ────────────────────────────────────────
-- Wer darf die Karte sehen? (Ace Permission)
-- '' = alle können die Karte sehen (kein Login)
-- 'livemap.view' = nur Spieler mit dieser Permission
Config.RequirePermission = ''

-- ── Karten-Tiles ──────────────────────────────────────────
-- Tiles in web/tiles/ ablegen:
--   web/tiles/{z}/{x}_{y}.png  (nach TGRHavoc-Format)
-- Wenn keine Tiles vorhanden → Fallback auf Satellitenbild
Config.TileDirectory = 'tiles'

-- ── Spieler-Darstellung ───────────────────────────────────
Config.ShowPlayerNames = true
Config.ShowPlayerCount = true
Config.PlayerColor     = '#00d4aa'

-- ── Debug ─────────────────────────────────────────────────
Config.Debug = false
