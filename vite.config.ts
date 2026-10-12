import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Absolute, not './'. A relative base breaks every real path: at /plugins/x the
  // browser resolves "./assets/index.js" against /plugins/, the SPA rewrite answers
  // that with index.html, and the module script is refused for being HTML — a blank
  // page. Absolute paths resolve identically from any URL.
  base: '/',
  build: {
    outDir: 'dist',
    // The catalogue bundles ~2.8 MB of first-party plugin documentation, so the
    // default 500 kB warning is expected rather than a problem.
    chunkSizeWarningLimit: 3000,
  },
  server: {
    port: 5273,
    strictPort: false,
  },
});
