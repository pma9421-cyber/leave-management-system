import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

/**
 * Cloudflare Pages-ready Vite configuration.
 *
 * This project is deployed as a static SPA. Development-only REST middleware
 * previously mounted under /api/audit-logs has intentionally been removed:
 * Vite dev-server middleware does not exist after a Pages static deployment,
 * and the application currently persists audit logs in browser storage.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
