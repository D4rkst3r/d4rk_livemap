# d4rk_livemap

<<<<<<< HEAD
GTA-V-Karte für FiveM. Seit Fassung 3 ist der Kern ein **Paket**, keine Webseite:
dieselbe Karte läuft im Handy (NUI), im Behörden-Tablet und im Browser.

```
src/        @d4rk/livemap — der wiederverwendbare Kern (MapLibre)
demo/       Sichttest mit Referenzpunkten
fivem/      dünne Lua-Brücke, die Positionen meldet
backend/    Node-Backend der alten Fassung (Discord-Login, socket.io)
frontend/   die alte Webseite (Leaflet, ein 1500-Zeilen-index.html)
=======
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
>>>>>>> resource-variante-2026-03
```

---

<<<<<<< HEAD
## Warum das Paket

Die Fassung davor konnte alles — und war deshalb nirgends wiederverwendbar. Zeichnen,
Datenholen, Anmeldung und Seitenleiste lagen in einer Datei. Als das Backend
abgeschaltet wurde, war die Karte mit tot, obwohl die Kacheln bis heute ausgeliefert
werden.

Der Kern weiß deshalb **nicht**, woher die Daten kommen. Kein socket.io, keine
REST-Adresse, keine Anmeldung. Wer ihn benutzt, ruft `setPlayers(...)` — ob die Liste
aus einem WebSocket, aus einem NUI-Callback oder aus einer Testdatei stammt, ist Sache
der App.

Der Kern bringt auch keine Kacheln mit. `tileBaseUrl` zeigt auf den Host.

---

## Benutzen

```bash
npm i github:D4rkst3r/d4rk_livemap maplibre-gl
```

```tsx
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LiveMapView } from '@d4rk/livemap'

<LiveMapView
    maplibre={maplibregl}
    tileBaseUrl="https://map.d4rkst3r.de"
    mapStyle="satellite"
    players={players}          // [{ id, name, x, y, heading?, vehicle? }]
    markers={markers}
    zones={zones}
    onMapClick={(x, y) => setWaypoint(x, y)}
/>
```

Ohne React geht es genauso:

```ts
import { LiveMap } from '@d4rk/livemap'
const map = new LiveMap(maplibregl, el, { tileBaseUrl: '…' })
await map.ready()
map.setPlayers([...])
```

`maplibre-gl` wird **hereingereicht statt importiert**. Zwei MapLibre-Kopien auf einer
Seite teilen sich keine Klassen, und dann schlägt jedes `instanceof` still fehl.

---

## ⚠ Der Kachel-Host braucht CORS

Leaflet lud Kacheln als `<img>` — dafür braucht es keine Freigabe. MapLibre lädt sie in
WebGL-Texturen und **braucht** sie. Ohne den Header bleibt die Karte schwarz, während
Punkte und Zonen normal erscheinen; das ist das Fehlerbild, an dem man es erkennt.

`map.d4rkst3r.de` schickt ihn zurzeit nicht. Ein Header genügt:

```nginx
location /tiles/ {
    add_header Access-Control-Allow-Origin "*" always;
}
```

Hinter Cloudflare geht es auch als Transform Rule (Response Header ändern). Für die
lokale Entwicklung reicht der Proxy in `vite.demo.config.ts`.

---

## Die vier Zahlen

Die Kacheln wurden für Leaflet geschnitten. Dort stand die Abbildung als

```js
new L.Transformation(0.02072, 117.3, -0.0205, 172.8)
```

also: Weltpixel bei Zoom 0 (Kachelgröße 256) = `(a·gx + b, c·gy + d)`.

MapLibre kennt kein `CRS.Simple`, es rechnet in Web Mercator — benutzt aber **dieselbe
XYZ-Pyramide**. Wer die Weltpixel trifft, trifft die Kachel. `src/coords.ts` rechnet
genau das um, die Bilder mussten nicht neu geschnitten werden.

Diese Zahlen kann man nicht herleiten. Sie stammen aus zwei unabhängigen Fundstellen
(dem alten `frontend/index.html` und dem gebauten Bundle der verlorenen React-Fassung)
und stehen deshalb in `test/coords.test.js` unter Test statt nur in einem Kommentar.

Eine Grenze kommt aus der Kugel und nicht aus dem Code: Web Mercator endet bei
±85.051129°. Nutzbar ist `gx ∈ [-5661, 6694]`, `gy ∈ [-4058, 8429]`. Los Santos passt
vollständig hinein; unterhalb von `gy ≈ -4058` liegt offenes Meer.

---

## Entwickeln

```bash
npm install
npm run typecheck
npm run build      # dist/ wird mitverwaltet, damit ein git-Install nichts bauen muss
npm test           # prüft die Umrechnung
npx vite --config vite.demo.config.ts    # Sichttest auf :3100
```

Der Sichttest setzt Marker auf bekannte Orte (LSIA, Legion Square, Sandy Shores,
Paleto Bay, Mount Chiliad). Liegen die falsch, stimmt die Umrechnung nicht — das sieht
man in zwei Sekunden und keine Testsuite ersetzt es.
=======
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
>>>>>>> resource-variante-2026-03
