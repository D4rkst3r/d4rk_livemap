import { defineConfig } from 'vite'

// Der Kachel-Host schickt (noch) kein `Access-Control-Allow-Origin`, und MapLibre
// braucht es, weil es die Bilder in WebGL-Texturen laedt — anders als Leaflet, das
// sie nur als <img> anzeigte. Fuer den Sichttest reicht der Dev-Server sie durch und
// setzt den Header selbst. Im Betrieb gehoert er auf den Host.
export default defineConfig({
    root: 'demo',
    server: {
        port: 3100,
        proxy: {
            '/tiles': {
                target: 'https://map.d4rkst3r.de',
                changeOrigin: true,
                headers: { Origin: 'https://map.d4rkst3r.de' },
            },
        },
    },
})
