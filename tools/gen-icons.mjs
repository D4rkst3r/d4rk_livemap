// Erzeugt `src/icons.ts` aus lucide-react.
//
// Warum generiert und nicht von Hand: SVG-Pfade abzutippen geht schief, und zwar
// unauffällig — ein falscher Bogen sieht auf 16 Pixeln noch richtig aus. Die Pfade
// kommen deshalb aus demselben Paket, das auch d4rk_phone benutzt, damit die Karte
// und das Handy wirklich dieselben Symbole zeichnen.
//
// Aufruf:  node tools/gen-icons.mjs [pfad/zu/lucide-react]

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const LUCIDE = process.argv[2]
    ?? 'C:/Users/az319/Playground/D4rkst3r/FiveM/d4rk_phone/web/node_modules/lucide-react'
const DIR = join(LUCIDE, 'dist/esm/icons')

// Was eine Karte braucht. Die Schlüssel sind die Namen, die in `marker.icon` stehen —
// die alten Namen (box, cone, ...) bleiben als Zweitname erhalten, damit bestehende
// Aufrufe aus anderen Resourcen nicht auf einen Schlag ins Leere zeigen.
const WANT = [
    'package', 'traffic-cone', 'shield', 'heart-pulse', 'cloud-lightning',
    'user-search', 'flame', 'ambulance', 'truck', 'map-pin', 'circle-dot',
    'user', 'car', 'tent', 'lamp-ceiling', 'siren', 'wrench', 'triangle-alert',
    'building-2', 'pin',
]

const icons = {}
for (const name of WANT) {
    const file = join(DIR, name + '.mjs')
    if (!existsSync(file)) { console.error('fehlt:', name); continue }
    const src = readFileSync(file, 'utf8')
    const m = src.match(/const __iconNode = (\[[\s\S]*?\]);/)
    if (!m) { console.error('kein __iconNode:', name); continue }
    // Lucides iconNode ist [[tag, attrs], ...] — daraus das Innere eines <svg> bauen.
    const nodes = JSON.parse(m[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'))
    icons[name] = nodes.map(([tag, attrs]) => {
        const a = Object.entries(attrs)
            .filter(([k]) => k !== 'key')
            .map(([k, v]) => `${k}="${v}"`).join(' ')
        return `<${tag} ${a}/>`
    }).join('')
}

const header = `// Symbole für die Karte — echte Icons, keine Emojis.
//
// Emojis gingen im ersten Wurf schneller, passen aber nicht: das Handy zeichnet
// überall Lucide-Strichsymbole, und ein 🚧 daneben sieht aus wie ein Fremdkörper.
// Dazu kommt, dass jedes System Emojis anders zeichnet — dieselbe Karte sähe unter
// Windows, im Spiel und auf dem Handy verschieden aus.
//
// Die Pfade stammen aus lucide-react, derselben Fassung, die d4rk_phone benutzt, und
// wurden aus dem Paket gezogen statt nachgezeichnet. Als Zeichenkette und nicht als
// React-Komponente, weil der Kern ohne React laufen muss.
//
// ERZEUGT von tools/gen-icons.mjs — nicht von Hand ändern.

`

const body = `export const ICON_SVG: Record<string, string> = ${JSON.stringify(icons, null, 4)}

/** Ein fertiges <svg>. Die Linienfarbe erbt es vom Elternteil (currentColor). */
export function iconSvg(name: string, size = 16): string {
    const inner = ICON_SVG[name] ?? ICON_SVG['map-pin']
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
        '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'
}
`

writeFileSync(new URL('../src/icons.ts', import.meta.url), header + body)
console.log('src/icons.ts:', Object.keys(icons).length, 'Symbole')
