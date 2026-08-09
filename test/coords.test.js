// Die vier Zahlen aus `coords.ts` sind rekonstruiert, nicht hergeleitet — die Quellen
// der React-Fassung sind verloren. Deshalb steht hier ein Test und kein Kommentar:
// wenn jemand an der Umrechnung dreht, faellt es hier auf und nicht erst dann, wenn
// ein Streifenwagen im Meer steht.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gameToLngLat, lngLatToGame, headingToBearing, clampGame, GAME_LIMITS } from '../dist/index.js'

const near = (a, b, eps = 1e-3) =>
    assert.ok(Math.abs(a - b) < eps, `${a} != ${b} (Abweichung ${Math.abs(a - b)})`)

test('Rundreise Spiel -> lng/lat -> Spiel', () => {
    for (const [x, y] of [[0, 0], [-1200, -1500], [3500, -500], [4096, 4096], [-4000, 3000]]) {
        const [lng, lat] = gameToLngLat(x, y)
        const [bx, by] = lngLatToGame(lng, lat)
        near(bx, x); near(by, y)
    }
})

test('Kachelrand: der Nullpunkt liegt dort, wo Leaflet ihn hatte', () => {
    // Weltpixel bei Zoom 0 = (0.02072*gx + 117.3, -0.0205*gy + 172.8).
    // Fuer gx=0 also px=117.3 -> lng = 117.3/256*360 - 180
    const [lng] = gameToLngLat(0, 0)
    near(lng, (117.3 / 256) * 360 - 180, 1e-9)
})

test('Ausserhalb der Mercator-Kugel wird abgeschnitten statt zu entgleisen', () => {
    const [, y] = clampGame(0, -99999)
    assert.equal(y, GAME_LIMITS.minY)
    const [lng, lat] = gameToLngLat(0, -99999)
    assert.ok(Number.isFinite(lng) && Number.isFinite(lat))
    assert.ok(lat > -85.06, 'bleibt innerhalb der Mercator-Grenze')
})

test('Blickrichtung dreht sich richtig herum', () => {
    assert.equal(headingToBearing(0), 0)
    assert.equal(headingToBearing(90), 270)   // GTA: 90 = Westen, Karte: 270
    assert.equal(headingToBearing(270), 90)
    assert.equal(headingToBearing(360), 0)
})
