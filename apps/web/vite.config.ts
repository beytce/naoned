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
        id: "/",
        name: "Fondaco",
        short_name: "Fondaco",
        description:
          "Bâtissez la plus grande maison marchande de Venise en un mois : ateliers, routes, Rialto entre joueurs, la Terraferme à conquérir.",
        lang: "fr",
        categories: ["games", "strategy"],
        start_url: "/",
        // Opened from a notification or a shortcut: the window already there, not a second one.
        launch_handler: { client_mode: "focus-existing" },
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
        // The rich install sheet of Chrome (taken from the e2e bench, 25 October 2026).
        screenshots: [
          {
            src: "/screenshots/carte.jpg",
            sizes: "390x844",
            type: "image/jpeg",
            form_factor: "narrow",
            label: "Votre comptoir et les villes de la Vénétie",
          },
          {
            src: "/screenshots/rialto.jpg",
            sizes: "390x844",
            type: "image/jpeg",
            form_factor: "narrow",
            label: "Le Rialto, le marché tenu par les joueurs",
          },
          {
            src: "/screenshots/terraferme.jpg",
            sizes: "390x844",
            type: "image/jpeg",
            form_factor: "narrow",
            label: "La Terraferme, conquise chaque semaine",
          },
          {
            src: "/screenshots/terraferme-pc.jpg",
            sizes: "1440x900",
            type: "image/jpeg",
            form_factor: "wide",
            label: "La Terraferme sur PC",
          },
        ],
        shortcuts: [
          {
            name: "Cargaisons",
            url: "/?ouvrir=cargaisons",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Rialto",
            url: "/?ouvrir=rialto",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Classement",
            url: "/?ouvrir=classement",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        // The large icons are fetched by the system when the app is added: not cached.
        globIgnores: [
          "**/apple-touch-icon-1024.png",
          "**/icons/icon-*.png",
          "**/screenshots/**",
          "**/og.jpg",
        ],
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
