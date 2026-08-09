import type { Map as MLMap } from 'maplibre-gl';
import { type TileStyle } from './tiles';
import type { LiveMapOptions, MapMarker, MapZone, PlayerDot } from './types';
type ML = typeof import('maplibre-gl');
export declare class LiveMap {
    private map;
    private ml;
    private opts;
    private players;
    private markers;
    private colors;
    private colorIdx;
    private follow;
    /** Die Farbfolge für Spieler ohne eigene Farbe — aus der alten Karte übernommen,
     *  damit ein Server, der beide nebeneinander laufen lässt, nicht zwei Paletten hat. */
    static PALETTE: string[];
    /**
     * @param ml   die maplibre-gl-Instanz des Aufrufers. Sie wird hereingereicht und
     *             nicht importiert: zwei Kopien auf einer Seite teilen sich keine
     *             Klassen, und dann schlägt jedes `instanceof` still fehl.
     */
    constructor(ml: ML, container: HTMLElement, opts: LiveMapOptions);
    /** Die rohe MapLibre-Karte — für alles, was dieses Paket bewusst nicht kann. */
    get raw(): MLMap;
    /** Wartet, bis die Karte gezeichnet werden kann. */
    ready(): Promise<void>;
    setStyle(style: TileStyle): void;
    private colorFor;
    /**
     * Spieler setzen. Der VOLLSTÄNDIGE Stand, nicht ein Zusatz — wer fehlt, verschwindet.
     *
     * Vorhandene Punkte werden bewegt statt neu gebaut. Das ist nicht Feinschliff: ein
     * neuer DOM-Knoten je Aktualisierung heißt bei 500 ms Takt, dass die Karte
     * flackert und jeder offene Tooltip zuklappt.
     */
    setPlayers(list: PlayerDot[]): void;
    setMarkers(list: MapMarker[]): void;
    private lastZones;
    /** Zonen als GeoJSON — hier sind es Flächen, und Flächen kann MapLibre selbst. */
    setZones(list: MapZone[]): void;
    /** Hinfliegen. `zoom` weglassen heißt: Zoomstufe behalten. */
    flyTo(x: number, y: number, zoom?: number): void;
    /** Einem Spieler folgen, `null` beendet es. */
    setFollow(id: string | number | null): void;
    resize(): void;
    destroy(): void;
}
export {};
