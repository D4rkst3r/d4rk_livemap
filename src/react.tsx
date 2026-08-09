// React-Hülle um `LiveMap`.
//
// Dünn mit Absicht: sie hängt die Karte an ein div, reicht die Daten durch und räumt
// beim Verlassen auf. Alles, was darüber hinausgeht — Seitenleiste, Suche, Filter —
// ist Sache der App, weil es in einem Handy anders aussehen muss als in einem
// Behörden-Tablet.
//
// Die Karte wird EINMAL gebaut. Optionen, die sich später ändern, werden über die
// Methoden nachgezogen; ein Neuaufbau bei jeder Änderung würde die Ansicht
// zurücksetzen, und wer gerade irgendwo hingezoomt hat, verliert seine Stelle.

import { useEffect, useRef } from 'react'
import { LiveMap } from './LiveMap'
import type { LiveMapOptions, MapMarker, MapZone, PlayerDot } from './types'

type Props = Omit<LiveMapOptions, 'style'> & {
    /** Der Kachelsatz. Heisst hier `mapStyle`, weil `style` in React das CSS ist. */
    mapStyle?: LiveMapOptions['style']
    /** Die maplibre-gl-Instanz. Hereingereicht statt importiert — siehe LiveMap. */
    maplibre: typeof import('maplibre-gl')
    players?: PlayerDot[]
    markers?: MapMarker[]
    zones?: MapZone[]
    follow?: string | number | null
    className?: string
    style?: React.CSSProperties
    /** Wird einmal mit der fertigen Karte gerufen — für flyTo und alles Weitere. */
    onReady?: (map: LiveMap) => void
}

export function LiveMapView({
    maplibre, players, markers, zones, follow, className, style, mapStyle, onReady, ...rest
}: Props) {
    const host = useRef<HTMLDivElement>(null)
    const map = useRef<LiveMap | null>(null)
    const ready = useRef(false)

    useEffect(() => {
        if (!host.current) return
        const m = new LiveMap(maplibre, host.current, { ...rest, style: mapStyle })
        map.current = m
        void m.ready().then(() => { ready.current = true; onReady?.(m) })

        // Ein Handy dreht sich, ein Tablet-Fenster ändert die Größe. Ohne das bleibt
        // die Karte in der alten Größe stehen und zeigt graue Ränder.
        const ro = new ResizeObserver(() => m.resize())
        ro.observe(host.current)
        return () => { ro.disconnect(); m.destroy(); map.current = null; ready.current = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => { if (players) map.current?.setPlayers(players) }, [players])
    useEffect(() => { if (markers) map.current?.setMarkers(markers) }, [markers])
    useEffect(() => { if (zones) map.current?.setZones(zones) }, [zones])
    useEffect(() => { map.current?.setFollow(follow ?? null) }, [follow])
    useEffect(() => { if (mapStyle) map.current?.setStyle(mapStyle) }, [mapStyle])

    return <div ref={host} className={className}
                style={{ width: '100%', height: '100%', ...style }} />
}
