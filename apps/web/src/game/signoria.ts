import { useEffect, useState } from "react";
import { gameApi } from "./api.js";
import type { PlayerView, SignoriaView } from "./types.js";

/**
 * The Signoria of the cities (R2), shared by the map and the city up close: fetched once and again
 * whenever the view says a Podestà changed, or when a place asks for it fresh (a city opened).
 */

let cached: SignoriaView | null = null;
let cachedKey = "";
const listeners = new Set<(v: SignoriaView | null) => void>();

function load(key: string): void {
  cachedKey = key;
  gameApi
    .signoria()
    .then((v) => {
      cached = v;
      for (const l of listeners) l(v);
    })
    .catch(() => {});
}

/** The cities' gauges and Podestà with names and crests; null while loading or when off. */
export function useSignoria(view: PlayerView, fresh = false): SignoriaView | null {
  const [data, setData] = useState<SignoriaView | null>(cached);
  const sg = view.signoria;
  const key = sg ? `${view.day}|${JSON.stringify(sg.podesta)}` : "";
  useEffect(() => {
    listeners.add(setData);
    return () => {
      listeners.delete(setData);
    };
  }, []);
  useEffect(() => {
    if (!key) return;
    if (fresh || key !== cachedKey || !cached) load(key);
  }, [key, fresh]);
  return sg ? data : null;
}

/** One city's line of the Signoria. */
export function signoriaOf(data: SignoriaView | null, city: string) {
  return data?.cities.find((c) => c.city === city) ?? null;
}
