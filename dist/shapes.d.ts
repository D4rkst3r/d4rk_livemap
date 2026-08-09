import type { MapMarker, MapZone, PlayerDot } from './types';
/** Kurznamen für `marker.icon` → Lucide-Symbol.
 *
 *  Die linke Spalte sind die Namen, die andere Resourcen schon benutzen
 *  (`icon = 'box'` steht so in prop_placement). Sie bleiben gültig, auch wenn das
 *  Symbol dahinter jetzt ein anderes ist — eine Umbenennung, die fremden Code
 *  stillschweigend auf die Stecknadel zurückfallen lässt, wäre keine Verbesserung. */
export declare const MARKER_ICONS: Record<string, string>;
export declare function playerNode(el: HTMLElement, p: PlayerDot, color: string): HTMLElement;
export declare function markerNode(el: HTMLElement, m: MapMarker): HTMLElement;
export declare function zoneGeoJSON(zones: MapZone[]): GeoJSON.FeatureCollection;
