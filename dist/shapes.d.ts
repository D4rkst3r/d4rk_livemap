import type { MapMarker, MapZone, PlayerDot } from './types';
/** Symbole für `marker.icon`. Ein unbekannter Name fällt auf die Stecknadel zurück. */
export declare const MARKER_ICONS: Record<string, string>;
export declare function playerNode(el: HTMLElement, p: PlayerDot, color: string): HTMLElement;
export declare function markerNode(el: HTMLElement, m: MapMarker): HTMLElement;
export declare function zoneGeoJSON(zones: MapZone[]): GeoJSON.FeatureCollection;
