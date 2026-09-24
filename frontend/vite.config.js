import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api and WebSocket traffic are proxied to FastAPI on :8000.
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,

    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },

      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})