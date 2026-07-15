import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: './server/PrimeExchanges.Api/wwwroot',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      // Forward /api requests to the local ASP.NET Core dev server during
      // development. Adjust the target to match your local backend port.
      // In production, the SPA and /api are served from the same origin.
      '/api': {
        target: 'http://localhost:5062',
        changeOrigin: true,
      },
    },
  },
})
