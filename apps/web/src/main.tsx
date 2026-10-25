import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/cinzel/latin-700.css";
import "./index.css";
import { keepOrigin } from "./origin.js";
import { applyPalette, applyTextSize } from "./theme.js";

applyPalette();
applyTextSize();

// Where the visit comes from (a shared link, a campaign), kept until the sign-in.
try {
  keepOrigin(window.location.search, sessionStorage);
} catch {
  // No storage at all: the origin is lost, nothing else.
}

// A new version of the game: the new service worker takes over at once (autoUpdate) and the page
// reloads onto it. An app left open, or kept in the background on a phone, looks for one every
// half hour and on coming back.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const updating = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // The first install takes control of a page that is already the latest one.
    if (!updating || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      const check = () => registration.update().catch(() => {});
      setInterval(check, 30 * 60_000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    })
    .catch(() => {});
}

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
