import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // ExcelJS pesa ~900 kB, pero se carga solo al exportar (import dinámico).
    chunkSizeWarningLimit: 1000,
  },
});
