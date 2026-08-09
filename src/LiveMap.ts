// Die Karte selbst — ohne React, ohne Transport, ohne Anmeldung.
//
// Das ist die eine Entscheidung, die dieses Paket überhaupt wiederverwendbar macht:
// hier steht NICHT, woher die Spieler kommen. Kein socket.io, kein NUI-fetch, keine
// REST-Adresse. Wer die Karte benutzt, ruft `setPlayers(...)` — ob die Daten aus einem
// WebSocket, aus einem Handy-Callback oder aus einer Testdatei stammen, ist ihre Sache
// und nicht unsere.
//
// Genau daran ist die alte Fassung gescheitert: dort hing das Zeichnen am Backend, und
// als das Backend abgeschaltet wurde, war die Karte mit tot.
//
// Zeichnen über HTML-Marker und nicht über GeoJSON-Layer: es geht um Dutzende Punkte,
// nicht um Tausende. Ein DOM-Knoten je Spieler kostet bei dieser Größenordnung nichts
// und erspart ein Symbol-Sprite samt Schriftsatz — was in einer NUI, die offline
// laufen muss, ein echter Vorteil ist.

import type { Map as MLMap, Marker as MLMarker, MapOptions } from 'maplibre-gl'
import { gameToLngLat, lngLatToGame } from './coords'
import { MAX_ZOOM, MIN_ZOOM, tileStyle, type TileStyle } from './tiles'
import { markerNode, playerNode, zoneGeoJSON } from './shapes'
import type { LiveMapOptions, MapMarker, MapZone, PlayerDot } from './types'

type ML = typeof import('maplibre-gl')

export class LiveMap {
    private map: MLMap
    private ml: ML
    private opts: LiveMapOptions
    private players = new Map<string, MLMarker>()
    private markers = new Map<string, MLMarker>()
    private colors = new Map<string, string>()
    private colorIdx = 0
    private follow: string | null = null

    /** Die Farbfolge für Spieler ohne eigene Farbe — aus der alten Karte übernommen,
     *  damit ein Server, der beide nebeneinander laufen lässt, nicht zwei Paletten hat. */
    static PALETTE = ['#00d4aa', '#60a5fa', '#a78bfa', '#f59e0b',
                      '#22c55e', '#f43f5e', '#06b6d4', '#ec4899']

    /**
     * @param ml   die maplibre-gl-Instanz des Aufrufers. Sie wird hereingereicht und
     *             nicht importiert: zwei Kopien auf einer Seite teilen sich keine
     *             Klassen, und dann schlägt jedes `instanceof` still fehl.
     */
    constructor(ml: ML, container: HTMLElement, opts: LiveMapOptions) {
        this.ml = ml
        this.opts = opts
        const center = opts.center ?? { x: 0, y: 0 }

        this.map = new ml.Map({
            container,
            style: tileStyle(opts.tileBaseUrl, opts.style ?? 'satellite', opts.background),
            center: gameToLngLat(center.x, center.y),
            zoom: opts.zoom ?? 3,
            minZoom: MIN_ZOOM,
            maxZoom: opts.maxZoom ?? MAX_ZOOM + 3,
            attributionControl: opts.attribution === true ? undefined : false,
            // Ein Spielplan hat kein Oben-Links-Nordpfeil-Bedürfnis, und eine gedrehte
            // Karte macht "die Straße geht nach oben" kaputt. Drehen bleibt aus, bis es
            // jemand ausdrücklich einschaltet.
            dragRotate: opts.rotate === true,
            pitchWithRotate: opts.rotate === true,
            touchZoomRotate: true,
            renderWorldCopies: false,
        } as MapOptions)

        if (opts.rotate !== true) this.map.touchZoomRotate.disableRotation()
        if (opts.zoomControl) this.map.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right')

        if (opts.onMapClick) {
            this.map.on('click', (e) => {
                const [x, y] = lngLatToGame(e.lngLat.lng, e.lngLat.lat)
                opts.onMapClick!(x, y)
            })
        }
    }

    /** Die rohe MapLibre-Karte — für alles, was dieses Paket bewusst nicht kann. */
    get raw(): MLMap { return this.map }

    /** Wartet, bis die Karte gezeichnet werden kann. */
    ready(): Promise<void> {
        return this.map.loaded()
            ? Promise.resolve()
            : new Promise((r) => this.map.once('load', () => r()))
    }

    setStyle(style: TileStyle) {
        this.opts.style = style
        // `setStyle` wirft die eigenen Layer weg, HTML-Marker überleben es aber —
        // deshalb muss hier nichts neu aufgebaut werden außer den Zonen.
        this.map.setStyle(tileStyle(this.opts.tileBaseUrl, style, this.opts.background))
        this.map.once('styledata', () => { if (this.lastZones) this.setZones(this.lastZones) })
    }

    private colorFor(id: string, given?: string): string {
        if (given) return given
        let c = this.colors.get(id)
        if (!c) {
            c = LiveMap.PALETTE[this.colorIdx++ % LiveMap.PALETTE.length]
            this.colors.set(id, c)
        }
        return c
    }

    /**
     * Spieler setzen. Der VOLLSTÄNDIGE Stand, nicht ein Zusatz — wer fehlt, verschwindet.
     *
     * Vorhandene Punkte werden bewegt statt neu gebaut. Das ist nicht Feinschliff: ein
     * neuer DOM-Knoten je Aktualisierung heißt bei 500 ms Takt, dass die Karte
     * flackert und jeder offene Tooltip zuklappt.
     */
    setPlayers(list: PlayerDot[]) {
        const seen = new Set<string>()
        for (const p of list) {
            const id = String(p.id)
            seen.add(id)
            const color = this.colorFor(id, p.color)
            const pos = gameToLngLat(p.x, p.y)
            const existing = this.players.get(id)
            if (existing) {
                existing.setLngLat(pos)
                playerNode(existing.getElement(), p, color)
            } else {
                const el = playerNode(document.createElement('div'), p, color)
                if (this.opts.onSelect) {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation()
                        this.opts.onSelect!('player', p.id)
                    })
                }
                // KEIN `setRotation` und kein `rotationAlignment`: das dreht den
                // ganzen Knoten, und damit steht der Name auf dem Kopf. Die
                // Blickrichtung sitzt im Punkt, der Zettel bleibt aufrecht.
                this.players.set(id, new this.ml.Marker({ element: el })
                    .setLngLat(pos).addTo(this.map))
            }
        }
        for (const [id, m] of this.players) {
            if (!seen.has(id)) { m.remove(); this.players.delete(id) }
        }
        if (this.follow) {
            const me = list.find((p) => String(p.id) === this.follow)
            if (me) this.map.easeTo({ center: gameToLngLat(me.x, me.y), duration: 400 })
        }
    }

    setMarkers(list: MapMarker[]) {
        const seen = new Set<string>()
        for (const mk of list) {
            seen.add(mk.id)
            const pos = gameToLngLat(mk.x, mk.y)
            const existing = this.markers.get(mk.id)
            if (existing) {
                existing.setLngLat(pos)
                markerNode(existing.getElement(), mk)
            } else {
                const el = markerNode(document.createElement('div'), mk)
                if (this.opts.onSelect) {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation()
                        this.opts.onSelect!('marker', mk.id)
                    })
                }
                this.markers.set(mk.id, new this.ml.Marker({ element: el })
                    .setLngLat(pos).addTo(this.map))
            }
        }
        for (const [id, m] of this.markers) {
            if (!seen.has(id)) { m.remove(); this.markers.delete(id) }
        }
    }

    private lastZones: MapZone[] | null = null

    /** Zonen als GeoJSON — hier sind es Flächen, und Flächen kann MapLibre selbst. */
    setZones(list: MapZone[]) {
        this.lastZones = list
        const data = zoneGeoJSON(list)
        const src = this.map.getSource('zones')
        if (src) { (src as maplibregl.GeoJSONSource).setData(data); return }
        if (!this.map.isStyleLoaded()) { this.map.once('idle', () => this.setZones(list)); return }

        this.map.addSource('zones', { type: 'geojson', data })
        this.map.addLayer({
            id: 'zones-fill', type: 'fill', source: 'zones',
            paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'opacity'] },
        })
        this.map.addLayer({
            id: 'zones-line', type: 'line', source: 'zones',
            paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.8 },
        })
        if (this.opts.onSelect) {
            this.map.on('click', 'zones-fill', (e) => {
                const id = e.features?.[0]?.properties?.id
                if (id != null) this.opts.onSelect!('zone', String(id))
            })
        }
    }

    /** Hinfliegen. `zoom` weglassen heißt: Zoomstufe behalten. */
    flyTo(x: number, y: number, zoom?: number) {
        this.map.flyTo({ center: gameToLngLat(x, y), zoom: zoom ?? this.map.getZoom(), duration: 700 })
    }

    /** Einem Spieler folgen, `null` beendet es. */
    setFollow(id: string | number | null) {
        this.follow = id == null ? null : String(id)
    }

    resize() { this.map.resize() }

    destroy() {
        for (const m of this.players.values()) m.remove()
        for (const m of this.markers.values()) m.remove()
        this.players.clear()
        this.markers.clear()
        this.map.remove()
    }
}
