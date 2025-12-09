import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5678/webhook', // Весь трафик в n8n
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // /api/chat -> /chat, /api/projects -> /projects
      },
    },
  },
})