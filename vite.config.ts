import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
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
