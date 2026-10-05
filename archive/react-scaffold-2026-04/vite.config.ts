import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { createReadStream, existsSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),

    // Serve the media/ folder from the project root during dev
    {
      name: 'serve-media',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith('/media/')) return next()
          const rel = decodeURIComponent(req.url.slice(1)) // strip leading /
          const mediaRoot = resolve(__dirname, 'media')
          const filePath = resolve(__dirname, rel)
          // Basic path traversal guard
          if (!filePath.startsWith(mediaRoot)) return next()
          if (!existsSync(filePath)) return next()
          res.setHeader('Content-Type', 'audio/wav')
          res.setHeader('Accept-Ranges', 'bytes')
          createReadStream(filePath).pipe(res)
        })
      },
    },

    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Vocality in Guitar Timbre',
        short_name: 'VoGT',
        description: 'Guitar timbre listening experiment',
        theme_color: '#0f0c29',
        background_color: '#0f0c29',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Don't precache audio files — serve them on demand
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
