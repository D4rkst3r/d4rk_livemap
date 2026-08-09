// Wie ein Punkt auf der Karte aussieht.
//
// Bewusst reines DOM mit Inline-Stilen und kein Stylesheet: das Paket wird in eine
// FiveM-NUI, in ein Tablet-Frontend und in eine Webseite eingebaut, und jede davon
// bringt ihr eigenes CSS mit. Ein Stylesheet aus dem Paket würde dort entweder
// überschrieben oder es überschriebe fremdes — beides fällt erst im Betrieb auf.
//
// Die Knoten werden WIEDERVERWENDET (`el` kommt herein und geht verändert hinaus),
// nicht jedes Mal neu gebaut. Bei einem halben Sekundentakt ist der Unterschied
// zwischen "Attribut ändern" und "Knoten ersetzen" der zwischen einer ruhigen und
// einer flackernden Karte.

import { headingToBearing } from './coords'
import type { MapMarker, MapZone, PlayerDot } from './types'

/** Symbole für `marker.icon`. Ein unbekannter Name fällt auf die Stecknadel zurück. */
export const MARKER_ICONS: Record<string, string> = {
    box: '📦', cone: '🚧', barrier: '🚔', tent: '⛺',
    lamp: '💡', blip: '⭕', fire: '🔥', medic: '🚑',
    police: '👮', tow: '🛻', default: '📍',
}

export function playerNode(el: HTMLElement, p: PlayerDot, color: string): HTMLElement {
    el.style.cssText = 'width:32px;height:32px;cursor:pointer;will-change:transform'

    let dot = el.firstElementChild as HTMLElement | null
    if (!dot) {
        dot = document.createElement('div')
        el.appendChild(dot)
        const tag = document.createElement('div')
        el.appendChild(tag)
    }
    const tag = el.lastElementChild as HTMLElement

    dot.style.cssText =
        `width:32px;height:32px;border-radius:50%;background:${color}22;` +
        `border:2px solid ${color};display:flex;align-items:center;justify-content:center;` +
        `font-size:13px;box-shadow:0 0 10px ${color}55`
    const glyph = p.vehicle ? '🚗' : '👤'
    if (dot.textContent !== glyph) dot.textContent = glyph

    // Blickrichtung dreht NUR den Punkt. Drehte man den ganzen Marker, stuende der
    // Name darunter kopfueber — und ein Name, den man drehen muss, ist keiner.
    dot.style.transform = p.heading != null
        ? `rotate(${headingToBearing(p.heading)}deg)` : ''

    // Der Name steht unter dem Punkt und nicht darin: übereinander gelegt wird er bei
    // zwei Spielern nebeneinander unlesbar, darunter verschiebt er sich nur.
    tag.style.cssText =
        'position:absolute;top:34px;left:50%;transform:translateX(-50%);white-space:nowrap;' +
        `background:rgba(7,8,15,.85);border:1px solid ${color}66;border-radius:4px;` +
        'padding:1px 5px;font-size:9px;font-weight:700;color:#fff;pointer-events:none'
    if (tag.textContent !== p.name) tag.textContent = p.name
    tag.style.display = p.name ? '' : 'none'

    return el
}

export function markerNode(el: HTMLElement, m: MapMarker): HTMLElement {
    const color = m.color || '#3b82f6'
    const glyph = MARKER_ICONS[m.icon ?? 'default'] ?? m.icon ?? MARKER_ICONS.default
    el.style.cssText =
        `width:30px;height:30px;border-radius:50%;background:${color}20;` +
        `border:2px solid ${color};display:flex;align-items:center;justify-content:center;` +
        `font-size:13px;box-shadow:0 0 8px ${color}44;cursor:pointer`
    if (el.textContent !== glyph) el.textContent = glyph
    if (m.label) el.title = m.label
    return el
}

// -- Zonen ---------------------------------------------------------------------------

import { gameToLngLat } from './coords'

/** Ein Kreis in Spielmetern, als Vieleck. MapLibre kennt keinen Kreis in Weltmaßen —
 *  `circle` wäre in Bildschirmpixeln und würde beim Zoomen nicht mitwachsen. */
function circlePoints(x: number, y: number, radius: number, steps = 48): [number, number][] {
    const out: [number, number][] = []
    for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2
        out.push(gameToLngLat(x + Math.cos(a) * radius, y + Math.sin(a) * radius))
    }
    return out
}

export function zoneGeoJSON(zones: MapZone[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: zones.map((z) => {
            const color = z.color || '#3b82f6'
            const ring = (z.type === 'polygon' && z.points && z.points.length > 2)
                ? [...z.points.map((p) => gameToLngLat(p.x, p.y)),
                   gameToLngLat(z.points[0].x, z.points[0].y)]
                : circlePoints(z.x, z.y, z.radius ?? 50)
            return {
                type: 'Feature' as const,
                geometry: { type: 'Polygon' as const, coordinates: [ring] },
                properties: {
                    id: z.id,
                    label: z.label ?? z.id,
                    color,
                    fill: z.fillColor || color,
                    opacity: z.opacity ?? 0.2,
                },
            }
        }),
    }
}
