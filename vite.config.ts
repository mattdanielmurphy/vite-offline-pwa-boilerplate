import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      workbox: {
        globPatterns: ["**/*"],
      },
      includeAssets: [
        "**/*",
      ],
      manifest: {
        "theme_color": "#F6CC35",
        "background_color": "#FFFFFF",
        "display": "standalone",
        "scope": "/",
        "start_url": "/",
        "short_name": "Shift Reporter",
        "description": "Shift reporter for the Admiralty. Bespoke app by Matthew Daniel Murphy.",
        "name": "Shift Reporter",
        "icons": [
            {
                "src": "/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/icon-256x256.png",
                "sizes": "256x256",
                "type": "image/png"
            },
            {
                "src": "/icon-384x384.png",
                "sizes": "384x384",
                "type": "image/png"
            },
            {
                "src": "/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
      },
    }),
  ],
  build: {
    rollupOptions: {
      external: ['workbox-window']
    }
  }
});
