import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild', // explicitly use esbuild (default, but safe to specify)
    cssCodeSplit: true, // ensures CSS is bundled per-component (default true)
  },
  css: {
    devSourcemap: true, // helpful for debugging in dev
  },
});