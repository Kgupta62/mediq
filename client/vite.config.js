import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const ignore = () => {}
const quiet = (p) => {
  p.on('error', ignore)
  p.on('proxyReqWs', (_req, socket) => socket.on('error', ignore))
  p.on('open', (socket) => socket.on('error', ignore))
}

const proxy = {
  '/api': { target: 'http://localhost:5000', changeOrigin: true, configure: quiet },
  '/socket.io': { target: 'http://localhost:5000', changeOrigin: true, ws: true, configure: quiet },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          socket: ['socket.io-client'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})
