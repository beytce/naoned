import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Comptoirs",
        short_name: "Comptoirs",
        description: "Jeu de commerce multijoueur en saisons historiques",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        background_color: "#13101A",
        theme_color: "#13101A",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // The API is never served from the cache.
        navigateFallbackDenylist: [/^\/api\//],
        // Push notifications (public/push-sw.js).
        importScripts: ["push-sw.js"],
      },
    }),
  ],
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },
});
