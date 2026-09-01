import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // The repo keeps a single .env.local at its root; without this Vite would
  // only look inside packages/web and VITE_API_URL would silently fall back.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: { port: 5173 },
  build: { sourcemap: true },
});
