// Ein Ersatz-Server fuer den Sichttest: er tut so, als waere er die FiveM-Resource.
//
// Er liefert `web/` aus, ersetzt dieselben Platzhalter wie `server/main.lua`, reicht
// die Kacheln vom echten Host durch (samt CORS, das dieser noch nicht schickt) und
// erfindet ein paar Spieler. Damit laesst sich die Oberflaeche pruefen, ohne einen
// FXServer zu starten — und der Kachel-Pfad wird dabei wirklich benutzt statt geglaubt.

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const WEB = new URL('../web/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const UPSTREAM = 'https://map.d4rkst3r.de'
const STYLES = ['satellite', 'road', 'roads2', 'minimap']

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
               '.css': 'text/css', '.map': 'application/json' }

let t = 0
const players = () => {
    t += 0.06
    return [
        { id: 1, name: 'Streife 12', x: 215 + Math.cos(t) * 700, y: -810 + Math.sin(t) * 700,
          heading: (t * 57.3) % 360, vehicle: 'police' },
        { id: 2, name: 'Rettung 3', x: 1961 + Math.cos(t * .7) * 500, y: 3740 + Math.sin(t * .7) * 500 },
        { id: 3, name: 'Zu Fuss unterwegs', x: -1037, y: -2738 },
        { id: 4, name: 'Paleto Nord', x: -100, y: 6460, vehicle: 'pickup' },
    ]
}
const markers = [
    { id: 'unfall_7', x: 1200, y: -1400, label: 'Unfall #7', icon: 'cone', color: '#f59e0b', group: 'Verkehr', source: 'dispatch' },
    { id: 'kiste_42', x: -300, y: -900, label: 'Holzkiste #42', icon: 'box', color: '#00d4aa', group: 'Props', source: 'prop_placement' },
]

createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const p = url.pathname

    const tile = p.match(/\/tiles\/(?:(\w+)\/)?(\d+)\/(\d+)\/(\d+)\.jpg$/)
    if (tile) {
        const [, style, z, x, y] = tile
        const up = `${UPSTREAM}/tiles/${style ?? 'satellite'}/${z}/${x}/${y}.jpg`
        const r = await fetch(up)
        const buf = Buffer.from(await r.arrayBuffer())
        res.writeHead(r.status, { 'Content-Type': 'image/jpeg',
                                  'Access-Control-Allow-Origin': '*' })
        return res.end(buf)
    }

    if (p === '/data') {
        const list = players()
        res.writeHead(200, { 'Content-Type': 'application/json',
                             'Access-Control-Allow-Origin': '*' })
        return res.end(JSON.stringify({ players: list, markers, playerCount: list.length }))
    }

    const file = p === '/' ? 'index.html' : p.replace(/^\//, '')
    try {
        let body = await readFile(join(WEB, file))
        if (file === 'index.html') {
            body = body.toString()
                .replace('%SESSION_JSON%', JSON.stringify({ username: 'D4rkst3r' }).replaceAll('"', '&quot;'))
                .replace('%MAP_CONFIG%', JSON.stringify({ styles: STYLES }).replaceAll('"', '&quot;'))
        }
        res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' })
        res.end(body)
    } catch {
        res.writeHead(404); res.end('nicht gefunden')
    }
}).listen(3200, () => console.log('Mock läuft auf http://localhost:3200'))
