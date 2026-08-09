// Wie ein Punkt auf der Karte aussieht.
//
// Bewusst reines DOM mit Inline-Stilen und kein Stylesheet: das Paket wird in eine
// FiveM-NUI, in ein Tablet-Frontend und in eine Webseite eingebaut, und jede davon
// bringt ihr eigenes CSS mit. Ein Stylesheet aus dem Paket würde dort entweder
// überschrieben oder es überschriebe fremdes — beides fällt erst im Betrieb auf.
//
// ⚠ EINE REGEL, die hier alles bestimmt: das Wurzel-Element eines Markers gehört
// MapLibre, nicht uns. MapLibre schreibt die Position als `transform` genau dorthin.
// Wer darauf `style.cssText = '…'` setzt, löscht sie — und dann kleben alle Marker in
// der linken oberen Ecke, bis die nächste Kartenbewegung sie neu setzt. Genau dieses
// Bild ("erst beim Zoomen richtig") hat es gegeben, bevor die Gestaltung in ein
// Kind-Element gewandert ist.
//
// Deshalb: die Wurzel bekommt nur Größe, einmalig und über Einzel-Eigenschaften. Alles
// Sichtbare hängt darunter.
//
// LESBARKEIT über einem Satellitenbild ist der zweite Punkt, der die Gestaltung
// bestimmt. Der erste Entwurf hatte farbige Symbole auf durchscheinendem Grund in
// derselben Farbe — über hellem Sand und dunklem Wasser war davon fast nichts zu
// sehen. Jetzt gilt die Regel, die auch echte Kartendienste benutzen:
//
//   deckende Farbfläche · weißes Symbol · dunkler Saum darum
//
// Der Saum ist der eigentliche Trick. Er trennt den Punkt von hellem UND von dunklem
// Untergrund, und deshalb funktioniert dieselbe Farbe über Wüste und über Meer.

import { headingToBearing } from './coords'
import { iconSvg } from './icons'
import type { MapMarker, MapZone, PlayerDot } from './types'

/** Kurznamen für `marker.icon` → Lucide-Symbol.
 *
 *  Die linke Spalte sind die Namen, die andere Resourcen schon benutzen
 *  (`icon = 'box'` steht so in prop_placement). Sie bleiben gültig, auch wenn das
 *  Symbol dahinter jetzt ein anderes ist — eine Umbenennung, die fremden Code
 *  stillschweigend auf die Stecknadel zurückfallen lässt, wäre keine Verbesserung. */
export const MARKER_ICONS: Record<string, string> = {
    box: 'package', cone: 'traffic-cone', barrier: 'shield', tent: 'tent',
    lamp: 'lamp-ceiling', blip: 'circle-dot', fire: 'flame', medic: 'ambulance',
    police: 'shield', tow: 'truck', default: 'map-pin',
    // Die Themen der Warnungen-App im Handy, damit beide dieselben Symbole zeigen.
    general: 'siren', health: 'heart-pulse', weather: 'cloud-lightning',
    traffic: 'traffic-cone', missing: 'user-search', alert: 'triangle-alert',
}

/** Größe der Wurzel setzen, ohne alles andere zu verlieren. */
function sizeRoot(el: HTMLElement, size: number) {
    el.style.width = size + 'px'
    el.style.height = size + 'px'
    el.style.cursor = 'pointer'
}

/** Kind holen oder anlegen — dort darf frei gestaltet werden. */
function child(el: HTMLElement, idx: number): HTMLElement {
    let n = el.children[idx] as HTMLElement | undefined
    while (!n) {
        el.appendChild(document.createElement('div'))
        n = el.children[idx] as HTMLElement | undefined
    }
    return n
}

export function playerNode(el: HTMLElement, p: PlayerDot, color: string): HTMLElement {
    sizeRoot(el, 32)

    const dot = child(el, 0)
    const tag = child(el, 1)

    dot.style.cssText =
        'width:28px;height:28px;margin:2px;border-radius:50%;' +
        'display:flex;align-items:center;justify-content:center;color:#fff;' +
        `background:${color};` +
        // Zwei Ringe statt eines: innen ein heller Rand, damit der Punkt auf dunklem
        // Wasser nicht verschwindet, außen ein dunkler, damit er auf hellem Sand
        // nicht ausfranst. Danach erst der weiche Schatten.
        `box-shadow:0 0 0 1.5px rgba(255,255,255,.55), 0 0 0 3.5px rgba(7,8,15,.65),` +
        ` 0 2px 6px rgba(0,0,0,.5)`
    // Symbol nur neu setzen, wenn es sich wirklich ändert: `innerHTML` bei jedem Takt
    // baut sonst zweimal die Sekunde ein SVG neu, für jeden Spieler.
    const glyph = p.vehicle ? 'car' : 'user'
    if (dot.dataset.icon !== glyph) {
        dot.dataset.icon = glyph
        dot.innerHTML = iconSvg(glyph, 14, 2.3)
    }

    // Blickrichtung dreht NUR den Punkt. Drehte man den Marker selbst, stünde der
    // Name kopfüber — und ein Name, den man drehen muss, ist keiner.
    dot.style.transform = p.heading != null
        ? `rotate(${headingToBearing(p.heading)}deg)` : ''

    // Der Name steht unter dem Punkt und nicht darin: übereinander gelegt wird er bei
    // zwei Spielern nebeneinander unlesbar, darunter verschiebt er sich nur.
    tag.style.cssText =
        'position:absolute;top:33px;left:50%;transform:translateX(-50%);white-space:nowrap;' +
        'background:rgba(7,8,15,.92);border-radius:4px;padding:1px 5px;' +
        `border-bottom:2px solid ${color};` +
        'font-size:9.5px;font-weight:700;color:#fff;letter-spacing:.01em;' +
        'text-shadow:0 1px 2px rgba(0,0,0,.6);pointer-events:none'
    if (tag.textContent !== p.name) tag.textContent = p.name
    tag.style.display = p.name ? '' : 'none'

    return el
}

export function markerNode(el: HTMLElement, m: MapMarker): HTMLElement {
    sizeRoot(el, 30)

    const color = m.color || '#3b82f6'
    // Erst der Kurzname, dann der Lucide-Name direkt — so kann eine Resource auch
    // `icon = 'wrench'` schreiben, ohne dass hier eine Zeile dazukommt.
    const glyph = MARKER_ICONS[m.icon ?? 'default'] ?? m.icon ?? 'map-pin'
    const dot = child(el, 0)
    dot.style.cssText =
        'width:26px;height:26px;margin:2px;border-radius:50%;' +
        'display:flex;align-items:center;justify-content:center;color:#fff;' +
        `background:${color};` +
        'box-shadow:0 0 0 1.5px rgba(255,255,255,.5), 0 0 0 3px rgba(7,8,15,.6),' +
        ' 0 2px 5px rgba(0,0,0,.45)'
    if (dot.dataset.icon !== glyph) {
        dot.dataset.icon = glyph
        dot.innerHTML = iconSvg(glyph, 14, 2.3)
    }
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
