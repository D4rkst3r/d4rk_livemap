fx_version 'cerulean'
game 'gta5'

name 'd4rk_livemap'
description 'D4rk Live-Karte – Spielerpositionen + Marker-API + Discord OAuth2'
version '1.1.0'
author 'D4rkst3r'

shared_scripts {
    'config.lua',
}

client_scripts {
    'client/main.lua',
}

server_scripts {
    'server/auth.lua',   -- Discord OAuth2 + Session-Verwaltung (zuerst laden!)
    'server/main.lua',   -- HTTP-Handler + Spieler/Marker-API
}

files {
    'web/index.html',
    'web/login.html',
    'web/assets/*',
    'web/tiles/**',
    'web/images/*.png',
}

--[[
    ══════════════════════════════════════════════
    DISCORD AUTH SETUP:
    ══════════════════════════════════════════════

    1. https://discord.com/developers/applications
       → Neue Applikation erstellen
       → OAuth2 → Redirect URIs → hinzufügen:
         http://DEINE_SERVER_IP:30120/d4rk_livemap/auth/callback

    2. Bot → Bot hinzufügen → Server einladen
       (nur nötig wenn Config.Discord.RequiredRoles gesetzt ist)

    3. In config.lua:
         Config.Discord.Enabled      = true
         Config.Discord.ClientID     = '...'
         Config.Discord.ClientSecret = '...'
         Config.Discord.GuildID      = '...'
         Config.Discord.RequiredRoles = { 'ROLLEN_ID' }
         Config.Discord.RedirectURI  = 'http://IP:30120/d4rk_livemap/auth/callback'

    ══════════════════════════════════════════════
    EXPORTS (nutzbar aus anderen Ressourcen):
    ══════════════════════════════════════════════

    exports.d4rk_livemap:AddMarker({
        id='prop_42', x=100.0, y=-200.0, z=30.0,
        label='Holzkiste #42', color='#00d4aa',
        icon='box', group='Props', source='prop_placement',
    })
    exports.d4rk_livemap:RemoveMarker('prop_42')
    exports.d4rk_livemap:ClearMarkers('prop_placement')
    exports.d4rk_livemap:GetMarkers()

    ══════════════════════════════════════════════
    HTTP-ENDPUNKTE:
    ══════════════════════════════════════════════
    GET /d4rk_livemap/            → Web-Interface (Login-geschützt)
    GET /d4rk_livemap/login       → Login-Seite
    GET /d4rk_livemap/auth/login  → Discord OAuth starten
    GET /d4rk_livemap/auth/callback → OAuth Callback (von Discord)
    GET /d4rk_livemap/auth/logout → Session beenden
    GET /d4rk_livemap/data        → Spieler + Marker als JSON (Auth nötig)
    GET /d4rk_livemap/players     → Nur Spieler (Auth nötig)
    GET /d4rk_livemap/markers     → Nur Marker (Auth nötig)
    GET /d4rk_livemap/stats       → Statistiken (Auth nötig)
]]
