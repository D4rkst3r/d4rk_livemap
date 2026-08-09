// Die Kachelsätze und der Style, den MapLibre braucht.
//
// MapLibre will einen Style — auch dann, wenn es nur ein Rasterbild anzeigen soll. Das
// ist kein Umweg, sondern der Punkt, an dem der spätere Wechsel auf Vektorkacheln
// nichts weiter ist als ein anderer Style: die Karte selbst bleibt, wie sie ist.

import type { StyleSpecification } from 'maplibre-gl'

/** Die vier geschnittenen Sätze. Der Schlüssel ist der Ordnername unter `tileBaseUrl`. */
export const TILE_STYLES = {
    satellite: { label: 'Satellit', dark: true },
    road:      { label: 'Straßen', dark: true },
    roads2:    { label: 'Straßen 2', dark: true },
    minimap:   { label: 'Minimap', dark: true },
} as const

export type TileStyle = keyof typeof TILE_STYLES

export const MIN_ZOOM = 0
export const MAX_ZOOM = 5

/**
 * Style für einen Kachelsatz.
 *
 * `maxzoom` steht auf 5, weil dort die Bilder enden — MapLibre skaliert darüber hinaus
 * die letzte Stufe hoch, statt 404er zu laden. Ohne die Angabe wäre jede Stufe über 5
 * eine leere Karte, und genau dorthin zoomt man beim Betrachten einer Straße.
 */
export function tileStyle(
    baseUrl: string,
    style: TileStyle = 'satellite',
    background = '#07080f',
    urlTemplate?: string,
): StyleSpecification {
    const base = baseUrl.replace(/\/+$/, '')
    // Zwei Kachelsaetze existieren nebeneinander: der Web-Host legt sie unter
    // `/tiles/{stil}/{z}/{x}/{y}.jpg` ab, die FiveM-Resource hat nur einen Satz unter
    // `/tiles/{z}/{x}/{y}.jpg`. Statt einen von beiden umzubauen — 57 MB Bilder neu
    // sortieren, damit ein Pfad huebscher aussieht — nimmt das Paket die Vorlage
    // entgegen. `{style}` wird ersetzt, der Rest bleibt MapLibres Platzhalter.
    const url = (urlTemplate ?? '{base}/tiles/{style}/{z}/{x}/{y}.jpg')
        .replace('{base}', base)
        .replace('{style}', style)
    return {
        version: 8,
        sources: {
            gta: {
                type: 'raster',
                tiles: [url],
                tileSize: 256,
                minzoom: MIN_ZOOM,
                maxzoom: MAX_ZOOM,
                attribution: `GTA5 ${TILE_STYLES[style].label}`,
            },
        },
        layers: [
            // Der Hintergrund ist nicht Deko: außerhalb der Kacheln (Meer, Ränder)
            // wäre sonst das Nichts zu sehen, und das flackert beim Ziehen.
            { id: 'bg', type: 'background', paint: { 'background-color': background } },
            { id: 'gta', type: 'raster', source: 'gta', paint: { 'raster-fade-duration': 120 } },
        ],
        // Kein `glyphs`: MapLibre prueft den Style und lehnt einen Schluessel mit
        // `undefined` ab ("string expected, undefined found"). Weglassen heisst
        // weglassen — und Schrift braucht eine reine Rasterkarte nicht.
    } as StyleSpecification
}
