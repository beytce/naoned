import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "icons/apple-touch-icon.png", "icons/logo-256.webp"],
      manifest: {
        name: "Fondaco",
        short_name: "Fondaco",
        description: "Jeu de commerce multijoueur en saisons historiques",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        background_color: "#1E1611",
        theme_color: "#1E1611",
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
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        // The large icons are fetched by the system when the app is added: not cached.
        globIgnores: ["**/apple-touch-icon-1024.png", "**/icons/icon-*.png"],
        // The API is never served from the cache.
        navigateFallbackDenylist: [/^\/api\//],
        // Push notifications (public/push-sw.js).
        importScripts: ["push-sw.js"],
      },
    }),
  ],
  server: {
    // The live line first (WebSocket), then the API.
    proxy: {
      "/api/live": { target: "ws://localhost:3000", ws: true },
      "/api": "http://localhost:3000",
    },
  },
});
