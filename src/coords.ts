// Spielkoordinaten ↔ Karte.
//
// Die Kacheln unter map.d4rkst3r.de wurden mit Leaflet im Kopf geschnitten. Dort lag
// die Abbildung in vier Zahlen:
//
//     new L.Transformation(0.02072, 117.3, -0.0205, 172.8)
//
// Sie sagen: Weltpixel bei Zoom 0 (Kachelgröße 256) = (a·gx + b, c·gy + d). Die Zahlen
// stehen identisch im alten `frontend/index.html` und im gebauten Bundle der
// React-Fassung — zwei unabhängige Fundstellen, deshalb kann man ihnen trauen.
//
// MapLibre kennt kein CRS.Simple, es rechnet in Web Mercator. Das ist aber kein
// Hindernis, sondern nur eine Umrechnung: MapLibre benutzt DIESELBE XYZ-Pyramide mit
// 256er-Kacheln. Wer die Weltpixel trifft, trifft die Kachel — die Bilder müssen also
// nicht neu geschnitten werden. Genau das macht diese Datei.
//
// Nachgerechnet, nicht behauptet: die Rundreise Spiel → lng/lat → Spiel stimmt auf
// vier Nachkommastellen (siehe die Tests in `coords.test.ts`).
//
// EINE Einschränkung, die aus der Kugel kommt und nicht aus dem Code: Web Mercator
// endet bei ±85.051129°, das entspricht Weltpixel 0 und 256. Umgerechnet heißt das:
//
//     nutzbar ist gx ∈ [-5661, 6694] und gy ∈ [-4058, 8429]
//
// Los Santos passt vollständig hinein. Unterhalb von gy ≈ -4058 liegt offenes Meer,
// und dorthin kommt niemand ohne Cheats. `clampGame` schneidet dort ab, damit ein
// verirrter Punkt die Karte nicht in die Singularität zieht.

/** Die vier Zahlen des mitgelieferten Kachelsatzes. */
export type Transform = readonly [a: number, b: number, c: number, d: number]

export const DEFAULT_TRANSFORM: Transform = [0.02072, 117.3, -0.0205, 172.8]

/** Der wirklich darstellbare Bereich in Spielkoordinaten (aus dem Mercator-Rand). */
export const GAME_LIMITS = {
    minX: -5661, maxX: 6694,
    minY: -4058, maxY: 8429,
} as const

/** Wo das Spiel spielt — die sinnvolle Anfangsansicht, nicht das technische Limit. */
export const GAME_BOUNDS = { minX: -4096, maxX: 4096, minY: -4058, maxY: 4096 } as const

const TILE = 256
const RAD = Math.PI / 180
const DEG = 180 / Math.PI

export function clampGame(x: number, y: number): [number, number] {
    return [
        Math.min(GAME_LIMITS.maxX, Math.max(GAME_LIMITS.minX, x)),
        Math.min(GAME_LIMITS.maxY, Math.max(GAME_LIMITS.minY, y)),
    ]
}

/**
 * Spielkoordinate → `[lng, lat]`, so wie MapLibre es erwartet.
 *
 * Die Reihenfolge ist lng zuerst — anders als bei Leaflet, wo lat zuerst kam. Das ist
 * die häufigste Verwechslung beim Umstieg, deshalb steht sie hier als Satz und nicht
 * nur im Typ.
 */
export function gameToLngLat(x: number, y: number, t: Transform = DEFAULT_TRANSFORM): [number, number] {
    const [gx, gy] = clampGame(x, y)
    const px = t[0] * gx + t[1]
    const py = t[2] * gy + t[3]
    const lng = (px / TILE) * 360 - 180
    const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * py) / TILE))) * DEG
    return [lng, lat]
}

/** Der Rückweg — für Klicks auf die Karte, die im Spiel einen Wegpunkt setzen sollen. */
export function lngLatToGame(lng: number, lat: number, t: Transform = DEFAULT_TRANSFORM): [number, number] {
    const px = ((lng + 180) / 360) * TILE
    const py = (TILE / 2) * (1 - Math.asinh(Math.tan(lat * RAD)) / Math.PI)
    return [(px - t[1]) / t[0], (py - t[3]) / t[2]]
}

/**
 * Blickrichtung des Spiels → Drehung des Symbols.
 *
 * GTA zählt gegen den Uhrzeigersinn ab Norden, CSS und MapLibre im Uhrzeigersinn.
 * Ohne diese Zeile zeigt jeder Pfeil auf der Karte spiegelverkehrt — ein Fehler, den
 * man erst bemerkt, wenn jemand nach links fährt und der Pfeil nach rechts zeigt.
 */
export function headingToBearing(heading: number): number {
    return (360 - (heading % 360) + 360) % 360
}
