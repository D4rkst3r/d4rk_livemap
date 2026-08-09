/** Die vier Zahlen des mitgelieferten Kachelsatzes. */
export type Transform = readonly [a: number, b: number, c: number, d: number];
export declare const DEFAULT_TRANSFORM: Transform;
/** Der wirklich darstellbare Bereich in Spielkoordinaten (aus dem Mercator-Rand). */
export declare const GAME_LIMITS: {
    readonly minX: -5661;
    readonly maxX: 6694;
    readonly minY: -4058;
    readonly maxY: 8429;
};
/** Wo das Spiel spielt — die sinnvolle Anfangsansicht, nicht das technische Limit. */
export declare const GAME_BOUNDS: {
    readonly minX: -4096;
    readonly maxX: 4096;
    readonly minY: -4058;
    readonly maxY: 4096;
};
export declare function clampGame(x: number, y: number): [number, number];
/**
 * Spielkoordinate → `[lng, lat]`, so wie MapLibre es erwartet.
 *
 * Die Reihenfolge ist lng zuerst — anders als bei Leaflet, wo lat zuerst kam. Das ist
 * die häufigste Verwechslung beim Umstieg, deshalb steht sie hier als Satz und nicht
 * nur im Typ.
 */
export declare function gameToLngLat(x: number, y: number, t?: Transform): [number, number];
/** Der Rückweg — für Klicks auf die Karte, die im Spiel einen Wegpunkt setzen sollen. */
export declare function lngLatToGame(lng: number, lat: number, t?: Transform): [number, number];
/**
 * Blickrichtung des Spiels → Drehung des Symbols.
 *
 * GTA zählt gegen den Uhrzeigersinn ab Norden, CSS und MapLibre im Uhrzeigersinn.
 * Ohne diese Zeile zeigt jeder Pfeil auf der Karte spiegelverkehrt — ein Fehler, den
 * man erst bemerkt, wenn jemand nach links fährt und der Pfeil nach rechts zeigt.
 */
export declare function headingToBearing(heading: number): number;
