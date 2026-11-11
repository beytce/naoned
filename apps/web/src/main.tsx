import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
// Porcellana's type (docs/plan-porcellana.md D4), embedded.
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/nunito/900.css";
import "./index.css";
import { isBoardHome } from "./home.js";
import { LANG } from "./lang.js";
import { keepInvite, keepOrigin } from "./origin.js";
import { applyPalette, applyTextSize } from "./theme.js";

document.documentElement.lang = LANG;
applyPalette();
applyTextSize();

// Where the visit comes from (a shared link, a campaign), kept until the sign-in.
try {
  keepOrigin(window.location.search, sessionStorage);
  // A company's invitation outlives the visit: the sign-in mail may open another tab.
  keepInvite(window.location.search, localStorage);
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
// Porcellana's laboratory (?lab=porcellana, docs/plan-porcellana.md lot 1): the kit on a small board.
const PorcellanaLab = lazy(() => import("./porcellana/Lab.js"));
// The duel of the Passe (?lab=passe, docs/plan-passe.md P5).
const PasseLab = lazy(() => import("./porcellana/passe/LabPasse.js"));
// The shared board and its threads (?lab=planche, docs/plan-planche.md).
const PlancheLab = lazy(() => import("./porcellana/planche/LabPlanche.js"));
const labName = new URLSearchParams(window.location.search).get("lab");
// The shared board is the home (docs/plan-classement.md, decision of 11 November 2026).
const board =
  labName === "planche" || isBoardHome(window.location.pathname, labName, window.location.search);

createRoot(root).render(
  <StrictMode>
    {labName === "porcellana" ? (
      <Suspense fallback={null}>
        <PorcellanaLab />
      </Suspense>
    ) : labName === "passe" ? (
      <Suspense fallback={null}>
        <PasseLab />
      </Suspense>
    ) : board ? (
      <Suspense fallback={null}>
        <PlancheLab />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
