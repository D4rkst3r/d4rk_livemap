# d4rk_livemap

Standalone Live-Karte für FiveM.
Echtzeit-Spielerpositionen + Marker-API für alle eigenen Ressourcen.

---

## Features

| Feature | Details |
|---|---|
| Live-Spielerpositionen | Aktualisierung alle 2 Sekunden |
| Follow-Modus | Karte folgt einem Spieler |
| Marker-API | Marker aus anderen Ressourcen einfügen |
| Gruppen-Filter | Marker nach Kategorie filtern |
| Leaflet + GTA5 CRS | Echte GTA5-Koordinaten, keine Umrechnung |
| Tile-Support | Eigene GTA5-Kacheln aus YTD-Dateien |
| Sidebar | Spielerliste + Markerliste |

---

## Installation

```
ensure d4rk_livemap
```

Karte: `http://SERVER_IP:30120/d4rk_livemap/`

---

## Karten-Tiles einrichten (empfohlen)

Ohne Tiles wird ein Fallback-Satellitenbild genutzt.
Für echte GTA5-Minimap-Kacheln:

1. GTA5-Dateien mit [OpenIV](https://openiv.com) öffnen
2. `GTA V\x64b.rpf\data\cdimages\scaleform_generic.rpf\minimap_sea_*.ytd` extrahieren
3. Python-Script von [TGRHavoc/live_map-interface](https://github.com/TGRHavoc/live_map-interface) nutzen:
   ```
   python extract_png.py minimap_sea_0_0.ytd
   ```
4. Erzeugte PNGs in `web/tiles/{z}/{x}_{y}.png` ablegen
5. Server neustarten

---

## Aus anderen Ressourcen nutzen

```lua
-- server/main.lua deiner Ressource:

-- Marker hinzufügen
exports.d4rk_livemap:AddMarker({
    id     = 'prop_' .. propId,
    x      = posData.x,
    y      = posData.y,
    z      = posData.z,
    label  = propConfig.label .. ' #' .. propId,
    color  = '#00d4aa',
    icon   = 'box',        -- box | cone | barrier | tent | lamp | blip | default
    group  = propConfig.category or 'Props',
    source = 'prop_placement',
})

-- Marker entfernen
exports.d4rk_livemap:RemoveMarker('prop_' .. propId)

-- Alle Marker einer Ressource löschen
exports.d4rk_livemap:ClearMarkers('prop_placement')
```

---

## prop_placement Integration

In `server/main.lua` von prop_placement:

```lua
-- Nach TriggerClientEvent('prop_placement:propPlaced', ...):
pcall(function()
    exports.d4rk_livemap:AddMarker({
        id     = 'prop_' .. propId,
        x      = posData.x,
        y      = posData.y,
        z      = posData.z,
        label  = propConfig.label .. ' #' .. propId,
        color  = ({Allgemein='#60a5fa',Polizei='#f87171',Baustelle='#fbbf24',Admin='#c084fc'})[propConfig.category] or '#00d4aa',
        icon   = 'box',
        group  = propConfig.category or 'Props',
        source = 'prop_placement',
    })
end)

-- Nach TriggerClientEvent('prop_placement:propRemoved', ...):
pcall(function() exports.d4rk_livemap:RemoveMarker('prop_' .. propId) end)

-- Im DB-Lade-Thread (einmalig beim Start):
CreateThread(function()
    Wait(2000) -- warten bis d4rk_livemap bereit ist
    for id, prop in pairs(placedProps) do
        pcall(function()
            local cfg = Config.Props[prop.itemName]
            exports.d4rk_livemap:AddMarker({
                id     = 'prop_' .. id,
                x      = prop.x, y = prop.y, z = prop.z,
                label  = (cfg and cfg.label or prop.itemName) .. ' #' .. id,
                color  = ({Allgemein='#60a5fa',Polizei='#f87171',Baustelle='#fbbf24',Admin='#c084fc'})[(cfg and cfg.category)] or '#00d4aa',
                icon   = 'box',
                group  = (cfg and cfg.category) or 'Props',
                source = 'prop_placement',
            })
        end)
    end
end)
```

---

## HTTP-API

| Endpunkt | Beschreibung |
|---|---|
| `GET /d4rk_livemap/` | Web-Interface |
| `GET /d4rk_livemap/data` | Spieler + Marker (kombiniert) |
| `GET /d4rk_livemap/players` | Nur Spieler |
| `GET /d4rk_livemap/markers` | Nur Marker |
| `GET /d4rk_livemap/markers/add?id=X&x=Y&y=Z&...` | Marker hinzufügen |
| `GET /d4rk_livemap/markers/remove?id=X` | Marker entfernen |
| `GET /d4rk_livemap/markers/clear?source=X` | Gruppe löschen |
| `GET /d4rk_livemap/stats` | Statistiken |

---

## Dateistruktur

```
d4rk_livemap/
├── fxmanifest.lua
├── config.lua
├── client/
│   └── main.lua          ← Position-Sender
├── server/
│   └── main.lua          ← HTTP-API + Registry + Exports
└── web/
    ├── index.html         ← Leaflet-Interface
    └── tiles/             ← GTA5-Kacheln hier ablegen
        └── {z}/
            └── {x}_{y}.png
```
