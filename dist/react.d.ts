import { LiveMap } from './LiveMap';
import type { LiveMapOptions, MapMarker, MapZone, PlayerDot } from './types';
type Props = Omit<LiveMapOptions, 'style'> & {
    /** Der Kachelsatz. Heisst hier `mapStyle`, weil `style` in React das CSS ist. */
    mapStyle?: LiveMapOptions['style'];
    /** Die maplibre-gl-Instanz. Hereingereicht statt importiert — siehe LiveMap. */
    maplibre: typeof import('maplibre-gl');
    players?: PlayerDot[];
    markers?: MapMarker[];
    zones?: MapZone[];
    follow?: string | number | null;
    className?: string;
    style?: React.CSSProperties;
    /** Wird einmal mit der fertigen Karte gerufen — für flyTo und alles Weitere. */
    onReady?: (map: LiveMap) => void;
};
export declare function LiveMapView({ maplibre, players, markers, zones, follow, className, style, mapStyle, onReady, ...rest }: Props): import("react").JSX.Element;
export {};
