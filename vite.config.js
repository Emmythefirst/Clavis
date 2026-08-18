import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // @tachibtc/taurus-vault-core (via bitcoinjs-lib) assumes Node's `global` —
  // alias it to globalThis so the browser bundle resolves it. Buffer itself
  // is polyfilled in src/polyfills.js (imported first in main.jsx).
  define: {
    global: 'globalThis',
  },
  // @tachibtc/taurus-vault-core imports Node's `crypto` module directly
  // (createHash, for TachiTx hashing) — alias it to a minimal browser shim.
  // See src/lib/crypto-shim.js for why this isn't crypto-browserify wholesale.
  // Must be a real filesystem path (not a Vite-root-relative "/src/..."
  // string) — the dev server's dependency pre-bundler resolves aliases from
  // a different working directory than the production build does, and a
  // leading "/" gets read as an OS-absolute path there ("No such file or
  // directory"), even though `vite build` resolves it fine.
  resolve: {
    alias: {
      crypto: fileURLToPath(new URL('./src/lib/crypto-shim.js', import.meta.url)),
    },
  },
  // Local stand-in for api/rpc-proxy.js (which Vercel serves in production).
  // Tachi's hosted POST routes don't send CORS headers on their preflight,
  // so the browser can't call them directly — see api/rpc-proxy.js and
  // PROGRESS.md (2026-08-15) for the full story. Mirrors that function's
  // ?path= convention so both dev and prod resolve the same target.
  server: {
    proxy: {
      '/api/rpc-proxy': {
        target: 'https://rpc-signet.tachibtc.com',
        changeOrigin: true,
        rewrite: (path) => new URLSearchParams(path.split('?')[1] || '').get('path') || '/',
      },
    },
  },
})