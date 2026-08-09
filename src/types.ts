// Was auf der Karte liegen kann.
//
// Alle Positionen sind SPIELKOORDINATEN (x/y wie `GetEntityCoords`), nicht lng/lat.
// Die Umrechnung passiert genau einmal, in `coords.ts` — wer hier etwas hineinreicht,
// rechnet nichts um.

import type { TileStyle } from './tiles'

export type Vec2 = { x: number; y: number }

export type PlayerDot = {
    /** Stabil über die Zeit — daran hängen Farbe, Verfolgen und Wiederfinden. */
    id: string | number
    name: string
    x: number
    y: number
    z?: number
    /** Blickrichtung des Spiels (gegen den Uhrzeigersinn ab Norden). */
    heading?: number
    /** Überschreibt die automatisch vergebene Farbe. */
    color?: string
    /** Sitzt im Fahrzeug — der Punkt zeigt dann einen Wagen statt einer Person. */
    vehicle?: string | null
}

export type MapMarker = {
    id: string
    x: number
    y: number
    label?: string
    /** Name aus `MARKER_ICONS` — oder direkt ein Emoji. */
    icon?: string
    color?: string
    group?: string
    source?: string
}

export type MapZone = {
    id: string
    type?: 'circle' | 'polygon'
    x: number
    y: number
    /** Nur bei `circle`, in Metern (= Spieleinheiten). */
    radius?: number
    /** Nur bei `polygon`, mindestens drei Punkte. */
    points?: Vec2[]
    label?: string
    color?: string
    fillColor?: string
    opacity?: number
    group?: string
}

export type LiveMapOptions = {
    /** Basis der Kacheln OHNE `/tiles` am Ende, z.B. `https://map.d4rkst3r.de`. */
    tileBaseUrl: string
    style?: TileStyle
    zoom?: number
    center?: Vec2
    /** Höchste Zoomstufe. Über 5 gibt es keine Bilder mehr, MapLibre skaliert dann die
     *  letzte Stufe hoch — für eine Straßenansicht ist das besser als eine leere Karte. */
    maxZoom?: number
    background?: string
    /** Eigene Kachel-Vorlage, falls der Host anders aufgebaut ist. `{base}` und
     *  `{style}` werden ersetzt, `{z}/{x}/{y}` bleiben MapLibres Platzhalter.
     *  Vorgabe: `{base}/tiles/{style}/{z}/{x}/{y}.jpg` — die FiveM-Resource mit nur
     *  einem Satz nimmt `{base}/tiles/{z}/{x}/{y}.jpg`. */
    tileUrl?: string

    /** Bedienelemente. Im Handy will man keine — dort wird gewischt. */
    zoomControl?: boolean
    attribution?: boolean
    /** Drehen und Neigen. Aus, weil eine gedrehte Karte „die Straße geht nach oben"
     *  kaputt macht. */
    rotate?: boolean

    /** Antippen eines Punktes. Ohne diese Angabe passiert nichts: Sprechblasen bringt
     *  das Paket bewusst keine mit — wie eine Auswahl aussieht, weiß nur die App. */
    onSelect?: (kind: 'player' | 'marker' | 'zone', id: string | number) => void
    /** Klick auf die freie Karte, in Spielkoordinaten. Damit setzt das Handy den
     *  Wegpunkt. */
    onMapClick?: (x: number, y: number) => void
}
