export declare const ICON_SVG: Record<string, string>;
/** Ein fertiges <svg>. Die Linienfarbe erbt es vom Elternteil (currentColor).
 *  `weight` etwas kräftiger als Lucides 2, wenn das Symbol klein und weiß auf
 *  einer Farbfläche sitzt — dünne Linien verschwinden dort. */
export declare function iconSvg(name: string, size?: number, weight?: number): string;
