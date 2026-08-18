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
  // Local stand-in for api/rpc-proxy.js (which Vercel serves in production).
  // Tachi's hosted POST / Bitcoin-RPC-proxy endpoint doesn't send CORS
  // headers on its preflight, so the browser can't call it directly — see
  // api/rpc-proxy.js and PROGRESS.md (2026-08-15) for the full story.
  server: {
    proxy: {
      '/api/rpc-proxy': {
        target: 'https://rpc-signet.tachibtc.com',
        changeOrigin: true,
        rewrite: () => '/',
      },
    },
  },
})