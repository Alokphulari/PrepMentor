import process from "node:process"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: process.env.VITE_API_PROXY_TARGET
    ? {
      proxy: {
        "/api": {
          target: process.env.VITE_API_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    }
    : undefined,
})
