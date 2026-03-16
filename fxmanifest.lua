fx_version 'cerulean'
game 'gta5'

name 'd4rk_livemap'
description 'D4rk Live-Karte – Spielerpositionen + Marker-API für alle Ressourcen'
version '1.0.0'
author 'D4rkst3r'

shared_scripts {
    'config.lua',
}

client_scripts {
    'client/main.lua',
}

server_scripts {
    'server/main.lua',
}

files {
    'web/index.html',
    'web/tiles/**',
    'web/images/*.png',
}

--[[
    ══════════════════════════════════════════════
    EXPORTS (nutzbar aus anderen Ressourcen):
    ══════════════════════════════════════════════

    -- Marker hinzufügen / aktualisieren
    exports.d4rk_livemap:AddMarker({
        id       = 'prop_42',
        x        = 100.0,
        y        = -200.0,
        z        = 30.0,
        label    = 'Holzkiste #42',
        color    = '#00d4aa',
        icon     = 'box',    -- box|cone|barrier|tent|lamp|player|blip|default
        group    = 'Props',
        source   = 'prop_placement',
    })

    exports.d4rk_livemap:RemoveMarker('prop_42')
    exports.d4rk_livemap:ClearMarkers('prop_placement')
    exports.d4rk_livemap:GetMarkers()

    ══════════════════════════════════════════════
    HTTP-ENDPUNKTE:
    ══════════════════════════════════════════════
    GET /d4rk_livemap/               → Web-Interface
    GET /d4rk_livemap/data           → Spieler + Marker als JSON
    GET /d4rk_livemap/players        → Nur Spieler
    GET /d4rk_livemap/markers        → Nur Marker
    GET /d4rk_livemap/markers/add    → Marker hinzufügen
    GET /d4rk_livemap/markers/remove → Marker entfernen
]]
