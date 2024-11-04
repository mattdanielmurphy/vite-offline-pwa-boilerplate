import { DEV_CONFIG } from "./src/config"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			// Disable service worker in development
			disable: DEV_CONFIG.DISABLE_CACHING,
			workbox: {
				globPatterns: ["**/*"],
			},
			includeAssets: ["**/*"],
			manifest: {
				theme_color: "#1a1a1a",
				background_color: "#1a1a1a",
				display: "standalone",
				scope: "/",
				start_url: "/",
				short_name: "Shift Reporter",
				description: "Shift reporter for the Admiralty. Bespoke app by Matthew Daniel Murphy.",
				name: "Shift Reporter",
				icons: [
					{
						src: "/icon-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/icon-256x256.png",
						sizes: "256x256",
						type: "image/png",
					},
					{
						src: "/icon-384x384.png",
						sizes: "384x384",
						type: "image/png",
					},
					{
						src: "/icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
				],
			},
		}),
	],
	build: {
		rollupOptions: {
			external: ["workbox-window"],
		},
	},
	server: {
		headers: DEV_CONFIG.DISABLE_CACHING
			? {
					"Cache-Control": "no-store",
			  }
			: {},
	},
})
