import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_API_BASE': JSON.stringify(
      process.env.VITE_API_BASE || 'http://localhost:3001'
    ),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'FIFA 2026 Match Watch Finder',
        short_name: 'FIFA 2026',
        description:
          'Track remaining FIFA World Cup 2026 fixtures and Germany watch links.',
        start_url: '/',
        display: 'standalone',
        background_color: '#08131f',
        theme_color: '#0f3a5d',
        icons: [
          {
            src: '/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.+\/api\/matches/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'matches-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
})
