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
/** Wo das Spiel spielt — die sinnvolle Anfangsansicht, nicht das technische Limit.
 *
 *  NICHT symmetrisch, und das ist kein Tippfehler: Los Santos liegt im Sueden, Paleto
 *  Bay bei y ≈ 6500 im Norden. Mit ±4096 faellt der halbe Norden aus dem Bild — genau
 *  das ist beim ersten Sichttest passiert. Dieselben Zahlen benutzt auch die Karten-App
 *  des Handys in `Config.Maps`. */
export declare const GAME_BOUNDS: {
    readonly minX: -4000;
    readonly maxX: 4500;
    readonly minY: -4000;
    readonly maxY: 8000;
};
export declare function clampGame(x: number, y: number): [number, number];
/** Kantenlänge einer Kachel in Pixeln. Der ganze Kachelsatz ist darauf geschnitten. */
export declare const TILE_SIZE = 256;
/**
 * Spielkoordinate → Weltpixel auf einer Zoomstufe.
 *
 * Der direkte Weg zu einer Kachel: `Math.floor(px / TILE_SIZE)` ist die Kachelnummer,
 * der Rest ist die Stelle darin. Das braucht, wer ein STANDBILD zeigen will statt
 * einer bedienbaren Karte — eine Vorschau in einer Chat-Blase zum Beispiel.
 *
 * Warum das eine eigene Funktion wert ist: ein `<img>` mit einer Kachel braucht kein
 * CORS und keine 800 KB MapLibre. Für eine Blase, die man antippt statt zu bedienen,
 * ist beides Verschwendung.
 */
export declare function gameToPixel(x: number, y: number, zoom: number, t?: Transform): [number, number];
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
