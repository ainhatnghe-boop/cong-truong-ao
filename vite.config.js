import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5200, host: '127.0.0.1', open: false },
  preview: { port: 5201, host: '127.0.0.1' },
  build: { chunkSizeWarningLimit: 2000 },
});
