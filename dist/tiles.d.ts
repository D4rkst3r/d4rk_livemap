import type { StyleSpecification } from 'maplibre-gl';
/** Die vier geschnittenen Sätze. Der Schlüssel ist der Ordnername unter `tileBaseUrl`. */
export declare const TILE_STYLES: {
    readonly satellite: {
        readonly label: "Satellit";
        readonly dark: true;
    };
    readonly road: {
        readonly label: "Straßen";
        readonly dark: true;
    };
    readonly roads2: {
        readonly label: "Straßen 2";
        readonly dark: true;
    };
    readonly minimap: {
        readonly label: "Minimap";
        readonly dark: true;
    };
};
export type TileStyle = keyof typeof TILE_STYLES;
export declare const MIN_ZOOM = 0;
export declare const MAX_ZOOM = 5;
/**
 * Style für einen Kachelsatz.
 *
 * `maxzoom` steht auf 5, weil dort die Bilder enden — MapLibre skaliert darüber hinaus
 * die letzte Stufe hoch, statt 404er zu laden. Ohne die Angabe wäre jede Stufe über 5
 * eine leere Karte, und genau dorthin zoomt man beim Betrachten einer Straße.
 */
export declare function tileStyle(baseUrl: string, style?: TileStyle, background?: string): StyleSpecification;
