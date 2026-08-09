import { defineConfig } from 'vite'

// Bibliothek, kein Programm: maplibre-gl und react bleiben draussen. Wer sie mit
// hineinpackt, hat sie im Zweifel doppelt im Speicher — und zwei MapLibre-Instanzen
// auf einer Seite ist genau der Fehler, den `LiveMap` mit dem hereingereichten
// Modul vermeidet.
export default defineConfig({
    build: {
        lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
        rollupOptions: { external: ['maplibre-gl', 'react', 'react/jsx-runtime'] },
        sourcemap: true,
        target: 'es2020',
    },
})
