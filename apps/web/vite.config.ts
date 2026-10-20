import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** The commit built (Railway passes it to the build), to tell which version a device runs. */
function buildId(): string {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  define: {
    __BUILD__: JSON.stringify(buildId()),
    __BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Registered in main.tsx, which looks for a new version and reloads onto it.
      injectRegister: false,
      includeAssets: ["favicon.png", "icons/apple-touch-icon.png", "icons/logo-256.webp"],
      manifest: {
        name: "Fondaco",
        short_name: "Fondaco",
        description: "Jeu de commerce multijoueur en saisons historiques",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        background_color: "#16263E",
        theme_color: "#16263E",
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
