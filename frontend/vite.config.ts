import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Keep your existing aliases, but add conditions and mainFields
    alias: {
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    // Force Vite to prefer browser/module exports over CJS
    conditions: ['browser', 'development'],
    mainFields: ['module', 'browser', 'main'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5678/webhook', // Весь трафик в n8n
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ''), // /api/chat -> /chat, /api/projects -> /projects
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // CRITICAL: Force Vitest to process React instead of letting Node load the CJS build
    server: {
      deps: {
        inline: ['react', 'react-dom', '@testing-library/react'],
      },
    },
    // Ensure we pick up the browser builds, not the Node builds
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
  },
} as UserConfig)
