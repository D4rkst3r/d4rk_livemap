// Die Live-Karte, so wie der Browser sie sieht.
//
// Diese Datei macht nur zwei Dinge: Daten holen und sie an `LiveMapView` reichen. Alles
// Kartenhafte — Umrechnung, Kacheln, Punkte, Zonen — liegt im Paket unter `../../src`
// und wird vom Handy und vom Tablet genauso benutzt.
//
// Der Unterschied zur alten Fassung ist genau der: dort standen Zeichnen und
// Datenholen in einer Datei mit 1500 Zeilen, und als das Backend abgeschaltet wurde,
// war die Karte mit tot. Hier ist der Transport austauschbar — die Karte nicht.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LiveMapView, TILE_STYLES, type LiveMap, type MapMarker, type PlayerDot, type TileStyle }
    from '@d4rk/livemap'
import maplibregl from 'maplibre-gl'

/** Was der Server beim Ausliefern in die Seite schreibt. */
function meta<T>(name: string, fallback: T): T {
    const raw = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content
    if (!raw || raw.startsWith('%')) return fallback
    try { return JSON.parse(raw) as T } catch { return fallback }
}

type Session = { username?: string; avatar?: string; userId?: string }
type MapConfig = { styles?: TileStyle[]; base?: string }
type Feed = { players: PlayerDot[]; markers: MapMarker[]; playerCount: number }

// Die Resource haengt unter /d4rk_livemap/, kann aber auch an der Wurzel stehen.
// Statt das zu raten, wird es aus der eigenen Adresse gelesen.
const BASE = location.pathname.replace(/\/(index\.html)?$/, '') || ''

export default function App() {
    const session = useMemo(() => meta<Session>('d4rk-session', {}), [])
    const cfg = useMemo(() => meta<MapConfig>('d4rk-mapconfig', {}), [])
    const styles = cfg.styles?.length ? cfg.styles : null

    const [feed, setFeed] = useState<Feed>({ players: [], markers: [], playerCount: 0 })
    const [online, setOnline] = useState<boolean | null>(null)
    const [style, setStyle] = useState<TileStyle>(
        (localStorage.getItem('d4rk_mapStyle') as TileStyle) || styles?.[0] || 'satellite')
    const [follow, setFollow] = useState<string | number | null>(null)
    const [query, setQuery] = useState('')
    const map = useRef<LiveMap | null>(null)

    // Ein Abruf im Takt statt eines WebSockets: die Resource liefert ueber den
    // FiveM-HTTP-Port, und der spricht kein WebSocket. Zwei Sekunden reichen fuer eine
    // Uebersichtskarte — wer jemandem folgt, sieht ihn ruckeln, aber nicht springen.
    const pull = useCallback(async () => {
        try {
            const r = await fetch(`${BASE}/data`, { credentials: 'include' })
            if (!r.ok) throw new Error(String(r.status))
            setFeed(await r.json())
            setOnline(true)
        } catch {
            setOnline(false)
        }
    }, [])

    useEffect(() => {
        void pull()
        let timer = 0
        const tick = () => {
            // Steht der Reiter im Hintergrund, wird nicht abgefragt. Zwanzig offene
            // Karten, die niemand ansieht, sind sonst zwanzig Abrufe alle zwei
            // Sekunden — auf einem Spielserver.
            if (!document.hidden) void pull()
            timer = window.setTimeout(tick, 2000)
        }
        timer = window.setTimeout(tick, 2000)
        const onShow = () => { if (!document.hidden) void pull() }
        document.addEventListener('visibilitychange', onShow)
        return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onShow) }
    }, [pull])

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return feed.players
        return feed.players.filter((p) => String(p.name).toLowerCase().includes(q))
    }, [feed.players, query])

    const jumpTo = (p: PlayerDot) => {
        map.current?.flyTo(p.x, p.y, Math.max(4, map.current.raw.getZoom()))
    }

    return (
        <div className="shell">
            <aside className="side">
                <header className="brand">
                    <span className="dot" data-on={online === true} />
                    <b>D4rk LiveMap</b>
                    <span className="count">{feed.playerCount} online</span>
                </header>

                {session.username && (
                    <div className="me">
                        {session.avatar && <img src={session.avatar} alt="" />}
                        <span>{session.username}</span>
                        <a href={`${BASE}/auth/logout`}>Abmelden</a>
                    </div>
                )}

                {styles && styles.length > 1 && (
                    <div className="styles">
                        {styles.map((s) => (
                            <button key={s} data-active={s === style}
                                    onClick={() => { setStyle(s); localStorage.setItem('d4rk_mapStyle', s) }}>
                                {TILE_STYLES[s]?.label ?? s}
                            </button>
                        ))}
                    </div>
                )}

                <input className="search" value={query} placeholder="Spieler suchen"
                       onChange={(e) => setQuery(e.target.value)} />

                <div className="list">
                    {shown.length === 0 && <p className="empty">Niemand da.</p>}
                    {shown.map((p) => (
                        <div key={p.id} className="row" data-follow={follow === p.id}>
                            <button className="name" onClick={() => jumpTo(p)}>
                                <b>{p.name}</b>
                                <small>{p.x.toFixed(0)}, {p.y.toFixed(0)}{p.vehicle ? ' · 🚗' : ''}</small>
                            </button>
                            <button className="pin" title="Folgen"
                                    onClick={() => setFollow(follow === p.id ? null : p.id)}>
                                {follow === p.id ? '📌' : '📍'}
                            </button>
                        </div>
                    ))}
                </div>

                {feed.markers.length > 0 && (
                    <>
                        <h3>Marker <span>{feed.markers.length}</span></h3>
                        <div className="list small">
                            {feed.markers.map((m) => (
                                <button key={m.id} className="name"
                                        onClick={() => map.current?.flyTo(m.x, m.y)}>
                                    <b>{m.label || m.id}</b>
                                    <small>{m.group || m.source || '–'}</small>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {online === false && (
                    <p className="warn">Keine Verbindung zum Server.</p>
                )}
            </aside>

            <main className="map">
                <LiveMapView
                    maplibre={maplibregl}
                    tileBaseUrl={BASE}
                    // Ohne Stil-Liste liegt in der Resource nur EIN Kachelsatz, direkt
                    // unter /tiles/{z}/{x}/{y}.jpg statt in Unterordnern.
                    tileUrl={styles ? undefined : '{base}/tiles/{z}/{x}/{y}.jpg'}
                    mapStyle={style}
                    players={feed.players}
                    markers={feed.markers}
                    follow={follow}
                    zoomControl
                    onSelect={(kind, id) => { if (kind === 'player') setFollow(id) }}
                    onReady={(m) => { map.current = m }}
                />
            </main>
        </div>
    )
}
