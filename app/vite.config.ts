import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Baut in `../web/`, weil genau dort die FiveM-Resource sucht. Kein zweiter
// Kopierschritt, kein Ordner, der irgendwann auseinanderlaeuft.
export default defineConfig({
    root: __dirname,
    plugins: [react()],
    resolve: { alias: { '@d4rk/livemap': resolve(__dirname, '../src/index.ts') } },
    build: {
        outDir: resolve(__dirname, '../web'),
        emptyOutDir: false,   // login.html und tiles/ leben schon dort
        assetsDir: 'assets',
        rollupOptions: {
            output: {
                // Feste Namen statt Hashes: die fxmanifest listet Dateien, und eine
                // Liste, die sich bei jedem Build aendert, vergisst man einmal —
                // dann liefert der Server die alte Datei aus und niemand weiss warum.
                entryFileNames: 'assets/app.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name][extname]',
            },
        },
    },
})
