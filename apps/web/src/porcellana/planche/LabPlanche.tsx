/**
 * The laboratory of the shared board (?lab=planche, docs/plan-planche.md): one's house among seven
 * held by the computer, the towns all dispute, the threads one stretches and takes back, the
 * passages one pays or forces by the Passe. Time runs fast here: a second is ten minutes of the game.
 */
import "../porcellana.css";
import "../passe/passe.css";
import "./planche.css";
import {
  type PlancheOrder,
  type PlancheState,
  maisonLevel,
  maisonThreshold,
  plancheAdvance,
  plancheBuild,
  plancheBuyTile,
  plancheForced,
  plancheFreeBobbins,
  plancheInit,
  plancheIsCorsair,
  plancheLagoonLand,
  plancheMove,
  plancheOrderRefusal,
  plancheOrderTry,
  plancheOrders,
  planchePatina,
  planchePlace,
  planchePrice,
  plancheRobot,
  plancheRouteOpen,
  plancheShares,
  plancheStanding,
  plancheSupply,
  plancheThread,
  plancheToll,
  plancheTrend,
  plancheUnthread,
  plancheUpgrade,
  venice1450Lagune,
  venice1450LaguneParams,
  venice1450Passe,
  venice1450Planche,
} from "@comptoirs/engine";
import { Canvas } from "@react-three/fiber";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrthographicCamera } from "three";
import { type Account, api, tokenFromLocation } from "../../api.js";
import { Emblem } from "../../art/logo.js";
import { DucatCoin } from "../../art/plateau/coins.js";
import { connectLive } from "../../game/live.js";
import { type IleGesture, IleScreen } from "../ile/IleScreen.js";
import { Entree, Fonder, Profil } from "./Entree.js";
import { FacadeSheet, LevelUp, MaisonRing, MaisonSheet, type MaisonView } from "./Maison.js";
import { Marks, Palais, Trend, rankMarks } from "./Palais.js";
import { PlancheBoard, type PlancheLand, type PlanchePick } from "./PlancheBoard.js";
import { Bobbin, Flag, NewsMark, Seals, ShareBar, pct } from "./PlancheUi.js";

const LabPasse = lazy(() => import("../passe/LabPasse.js"));

/**
 * On line, the lagoon of 48 the server plays (docs/plan-lagunes.md); `&seul`, Venice's board of 8,
 * played here.
 */
const ALONE = new URLSearchParams(window.location.search).has("seul");
const S = ALONE ? venice1450Planche : venice1450Lagune;
/** The board is a lagoon of sestieri. */
const LAGOON = S.houses.some((h) => h.sestiere);
const RIALTO = S.cities.find((c) => c.id === "rialto") ?? { x: 0, y: 0 };
const HOUR = 3_600_000;
const T0 = Date.parse("2026-11-16T06:00:00Z");
/** Hours between two visits of a house held by the computer, and each one's own hour. */
const VISIT = 8;
const OFFSET: Record<string, number> = Object.fromEntries(S.houses.map((h, k) => [h.id, k]));

/** Venice's land on the board of 8: the mainland to the west and the north, the far coast to the south-east. */
const LAND: PlancheLand = LAGOON
  ? { ...plancheLagoonLand(S), rialto: RIALTO }
  : {
      land: (x, y) =>
        x <= 6 + Math.round(1.5 * Math.sin(y * 0.7)) ||
        y <= 2 + Math.round(Math.sin(x * 0.5)) ||
        (x >= 22 && y >= 10 + Math.round(Math.sin(x)) && !(x === 24 && y === 14)),
      peril: (x, y) => {
        const r = Math.hypot(
          (x - venice1450Planche.lagoon.x) / 15,
          (y - venice1450Planche.lagoon.y) / 10,
        );
        const t = Math.min(1, Math.max(0, (r - 0.62) / 0.5));
        return t * t * (3 - 2 * t);
      },
      rialto: venice1450Planche.rialto,
    };

/** The sestieri's names, laid on the water above their houses. */
const SESTIERI = LAGOON
  ? [...new Set(S.houses.map((h) => h.sestiere ?? ""))].map((id) => {
      const hs = S.houses.filter((h) => h.sestiere === id);
      const x = hs.reduce((n, h) => n + h.x, 0) / hs.length;
      const y = Math.min(...hs.map((h) => h.y)) - 2;
      const name = venice1450LaguneParams.sestieri.find((t) => t.id === id)?.name ?? id;
      return { key: `sest:${id}`, id, name, x: Math.round(x), y };
    })
  : [];

const ducats = (deniers: bigint | number) =>
  Math.round(Number(deniers) / 100).toLocaleString("fr-FR");
const houseName = (id: string, names?: Record<string, string>) =>
  names?.[id] ?? S.houses.find((h) => h.id === id)?.name ?? id;
const nameOf = (id: string, names?: Record<string, string>) =>
  plancheIsCorsair(id) ? `le corsaire ${id.slice(8)}` : houseName(id, names);
const SAID: Record<string, string> = {
  planche_no_bobbin: "Plus de bobine libre : reprends un fil, ou attends qu'une bobine revienne.",
  planche_route_shut: "La route est fermée par un corsaire : force le passage.",
  planche_twice: "Ce fil est déjà tendu.",
  duel_lost: "Ce n'était pas la clef : la commande reste aux autres, tu ne perds rien d'autre.",
  planche_order_taken: "Une autre Maison du sestiere a livré cette commande avant toi.",
  planche_order_tried: "Tu as déjà joué cette commande : un seul essai par Maison.",
  planche_order_closed: "Cette commande n'est plus ouverte.",
  planche_order_short: "Ton entrepôt n'a pas assez de marchandise pour la livrer.",
};

/** Why an order may not be played, on its button. */
const ORDER_SHUT: Record<string, string> = {
  planche_order_taken: "Déjà livrée",
  planche_order_tried: "Déjà jouée",
  planche_order_closed: "Fermée",
  planche_order_short: "Pas assez en entrepôt",
};

/** The red seal of a sealed order, on a town's label and its card. */
function Sceau({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="pc-pl-sceau">
      <path
        d="M10 1 L12 3 L15 2.5 L15.5 5.5 L18.5 7 L17 10 L18.5 13 L15.5 14.5 L15 17.5 L12 17 L10 19 L8 17 L5 17.5 L4.5 14.5 L1.5 13 L3 10 L1.5 7 L4.5 5.5 L5 2.5 L8 3 Z"
        fill="#C8102E"
      />
      <circle cx="10" cy="10" r="4.6" fill="none" stroke="#F6F4F0" strokeWidth="1.4" />
      <path d="M10 7.2 V12.8 M7.6 10 H12.4" stroke="#F6F4F0" strokeWidth="1.4" />
    </svg>
  );
}
const hourOf = (t: number) => `${new Date(t).getUTCHours()}\u00a0h`;

interface News {
  id: number;
  text: string;
  pick: PlanchePick;
}

/** The board as the server sends it: its amounts are strings of deniers, made bigints again. */
function revive(raw: PlancheState): PlancheState {
  const big = (v: unknown) => BigInt(String(v ?? 0));
  const houses: PlancheState["houses"] = {};
  for (const [id, h] of Object.entries(raw.houses))
    houses[id] = {
      ...h,
      ducats: big(h.ducats),
      earned: big(h.earned),
      book: {
        sold: big(h.book?.sold),
        tollPaid: big(h.book?.tollPaid),
        tollIn: big(h.book?.tollIn),
        isle: big(h.book?.isle),
      },
      rank: {
        ...h.rank,
        earned: big(h.rank?.earned),
        week: Object.fromEntries(Object.entries(h.rank?.week ?? {}).map(([c, v]) => [c, big(v)])),
      },
    };
  return {
    ...raw,
    houses,
    minted: big(raw.minted),
    burnt: big(raw.burnt),
    spent: big(raw.spent),
  };
}

interface Online {
  since: number;
  lagoon?: string;
  me: string | null;
  names: Record<string, string>;
  players: string[];
}

export default function LabPlanche() {
  /** On line by default (the server holds the board); `&seul` plays a board of one's own, here. */
  const online = useMemo(() => !new URLSearchParams(window.location.search).has("seul"), []);
  const [view, setView] = useState<Online | null>(null);
  /**
   * The way in (docs/plan-compte.md C4): on line, an account is needed; the first time, the
   * house is founded (its name and flag). `in` once inside.
   */
  const [gate, setGate] = useState<"loading" | "signin" | "found" | "in">(
    online ? "loading" : "in",
  );
  const [account, setAccount] = useState<Account | null>(null);
  const [profil, setProfil] = useState(false);
  /** The house's growth (docs/plan-progression-maison.md M4): read from the server, on line. */
  const [maison, setMaison] = useState<MaisonView | null>(null);
  const [growth, setGrowth] = useState<"maison" | "facade" | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const enter = useCallback((a: Account) => {
    setAccount(a);
    setGate(a.pseudoDefault || !a.crest ? "found" : "in");
  }, []);
  useEffect(() => {
    if (!online) return;
    let alive = true;
    void (async () => {
      // Opened from the link of a mail: the account is signed in, the address made clean.
      const token = tokenFromLocation(window.location);
      if (token) {
        try {
          await api.verify(token);
        } catch {
          // A used or old link: the sheet asks for the address again.
        }
        window.history.replaceState(null, "", "/");
      }
      try {
        const a = await api.me();
        if (alive) enter(a);
      } catch {
        if (alive) setGate("signin");
      }
    })();
    return () => {
      alive = false;
    };
  }, [online, enter]);
  const ME = online ? (view?.me ?? "") : "toi";
  const [state, setState] = useState<PlancheState>(() => plancheInit(S, T0));
  const [chosen, setChosen] = useState<PlanchePick | null>(null);
  const [speed, setSpeed] = useState(1);
  const [said, setSaid] = useState("");
  const [news, setNews] = useState<News[]>([]);
  const [duel, setDuel] = useState<string | null>(null);
  /** The sealed order whose position is being played. */
  const [sealed, setSealed] = useState<PlancheOrder | null>(null);
  const [inIsle, setInIsle] = useState(false);
  /** The Doge's palace, opened from one's place in the purse. */
  const [palace, setPalace] = useState(false);
  /** The good the card of a town is about, and the scale of the view. */
  const [focus, setFocus] = useState<string | null>(null);
  const [scale, setScale] = useState<"monde" | "lagune">("lagune");
  const pins = useRef(new Map<string, HTMLElement>()).current;
  const seq = useRef(0);
  const tell = useCallback(
    (text: string, pick: PlanchePick) =>
      // A news already on the thread is not told again.
      setNews((n) =>
        n.some((x) => x.text === text) ? n : [...n.slice(-2), { id: ++seq.current, text, pick }],
      ),
    [],
  );
  const pin = (key: string) => (el: HTMLElement | null) => {
    if (el) pins.set(key, el);
    else pins.delete(key);
  };

  // On line: the board is read from the server every two seconds; it moves there, not here.
  // One call after the other: two at once, before the guest's cookie is given, would be two guests.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const send = useCallback(async (path = "", body?: unknown) => {
    try {
      const res = await fetch(`/api/planche${path}`, {
        method: body === undefined ? "GET" : "POST",
        credentials: "same-origin",
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        planche?: Online & { state: PlancheState };
        error?: string;
      } | null;
      if (!json?.planche) return json?.error ?? "offline";
      setState(revive(json.planche.state));
      setView({
        since: json.planche.since,
        lagoon: (json.planche as Online).lagoon,
        me: json.planche.me,
        names: json.planche.names,
        players: json.planche.players,
      });
      return "ok";
    } catch {
      return "offline";
    }
  }, []);
  const call = useCallback(
    (path = "", body?: unknown): Promise<string> => {
      const next = queue.current.then(() => send(path, body));
      queue.current = next.catch(() => "offline");
      return next;
    },
    [send],
  );
  // A gesture of anyone on the board is heard at once (docs/plan-compte.md C5); reading now and
  // then only shows time going by (every 20 s), more often while the line is down.
  const [heard, setHeard] = useState(false);
  useEffect(() => {
    if (!online || duel || gate !== "in") return;
    let alive = true;
    const read = async () => {
      const res = await call();
      if (alive && res === "not_signed_in") setGate("signin");
      if (alive && res === "offline")
        setSaid("Le serveur ne répond pas. Lance « pnpm dev », ou ajoute « &seul » à l'adresse.");
    };
    void read();
    const timer = window.setInterval(read, heard ? 20_000 : 2000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [online, duel, call, gate, heard]);
  const readMaison = useCallback(async () => {
    try {
      const res = await fetch("/api/maison", { credentials: "same-origin" });
      if (!res.ok) return;
      const m = ((await res.json()) as { maison: MaisonView }).maison;
      setMaison(m);
      // A level reached since last seen, on this device: its moment.
      const key = `fondaco.maison.level.${m.house}`;
      try {
        const seen = Number(localStorage.getItem(key) ?? "0");
        if (seen && m.level > seen) setLevelUp(true);
        if (!seen) localStorage.setItem(key, String(m.level));
      } catch {
        // No storage: no moment.
      }
    } catch {
      // The sheet waits for the next read.
    }
  }, []);
  useEffect(() => {
    if (!online || gate !== "in") return;
    void readMaison();
    const timer = window.setInterval(() => void readMaison(), 60_000);
    return () => window.clearInterval(timer);
  }, [online, gate, readMaison]);
  useEffect(() => {
    if (!online || gate !== "in") return;
    return connectLive((m) => {
      if (m.type === "planche") {
        void call();
        void readMaison();
      }
    }, setHeard);
  }, [online, gate, call, readMaison]);

  // Time, played here: a slice of the game a tick; the houses of the computer visit in their turn.
  useEffect(() => {
    if (online || !speed || duel) return;
    const timer = window.setInterval(() => {
      setState((s0) => {
        const now = s0.now + S.sliceMs;
        let s = plancheAdvance(S, s0, now);
        const hour = Math.floor((now - T0) / HOUR);
        if ((now - T0) % HOUR === 0)
          for (const h of S.houses) {
            if (!h.robot || (hour + (OFFSET[h.id] ?? 0)) % VISIT !== 0) continue;
            s = plancheRobot(S, s, h.id, now);
          }
        return s;
      });
    }, 1000 / speed);
    return () => window.clearInterval(timer);
  }, [online, speed, duel]);

  // A rival stretches a thread toward a town where one sells: said once, in both modes.
  const seen = useRef<Record<string, string[]>>({});
  useEffect(() => {
    const mineTo = new Set(state.houses[ME]?.threads.map((t) => t.to));
    for (const h of S.houses) {
      if (h.id === ME) continue;
      const now = state.houses[h.id]?.threads.map((t) => t.to) ?? [];
      const before = seen.current[h.id];
      if (before)
        for (const to of now)
          if (!before.includes(to) && mineTo.has(to)) {
            const c = S.cities.find((x) => x.id === to);
            if (c)
              tell(`${houseName(h.id, view?.names)} tend un fil vers ${c.name}, où tu vends.`, {
                kind: "city",
                id: to,
              });
          }
      seen.current[h.id] = now;
    }
  });

  // The week turns: a new rival is named, and a flag taken or lost is said.
  const lastRival = useRef<string | undefined>(undefined);
  const lastFlags = useRef<string>("");
  useEffect(() => {
    if (!ME) return;
    const r = state.rank.rivals[ME];
    if (r && lastRival.current && r !== lastRival.current)
      tell(
        `Ton rival de la semaine : ${houseName(r, view?.names)}. Ses fils sont marqués d'encre.`,
        {
          kind: "house",
          id: r,
        },
      );
    lastRival.current = r;
    const flags = JSON.stringify(state.rank.flags);
    if (lastFlags.current && flags !== lastFlags.current) {
      for (const f of state.rank.flags[ME] ?? [])
        tell(`Tu as pris le pavillon de ${houseName(f, view?.names)} : il est sur ta façade.`, {
          kind: "house",
          id: ME,
        });
      for (const [h, fs] of Object.entries(state.rank.flags))
        if (fs.includes(ME))
          tell(`${houseName(h, view?.names)} a pris ton pavillon cette semaine.`, {
            kind: "house",
            id: h,
          });
    }
    lastFlags.current = flags;
  });

  // A town where one sells has tired: said once, until it has rested.
  const tired = useRef(new Set<string>());
  useEffect(() => {
    for (const t of state.houses[ME]?.threads ?? []) {
      const w = S.cities.find((c) => c.id === t.to)?.wants[t.good];
      const key = `${t.to}|${t.good}`;
      if (!w) continue;
      const share = planchePrice(S, state, t.to, t.good) / w.price;
      if (share < 0.45 && !tired.current.has(key)) {
        tired.current.add(key);
        const city = S.cities.find((c) => c.id === t.to);
        tell(
          `${city?.name} se lasse : ton ${S.goods[t.good]?.toLowerCase()} n'y vaut plus que ${Math.round(share * 100)} % du plein prix.`,
          { kind: "city", id: t.to },
        );
      } else if (share > 0.7) tired.current.delete(key);
    }
  });

  const me = state.houses[ME];
  const free = plancheFreeBobbins(S, state, ME);
  // The rank (docs/plan-classement.md): one's place at the Doge's, its trend, the marks, the rival.
  // The place among one's neighbours: one's sestiere in a lagoon (docs/plan-lagunes.md G2).
  const mySestiere = S.houses.find((h) => h.id === ME)?.sestiere;
  const neighbours = S.houses.filter((h) => h.sestiere === mySestiere).length;
  const rank = useMemo(() => {
    return {
      place: (ME && planchePlace(S, state, ME)) || 0,
      trend: ME ? plancheTrend(S, state, ME) : 0,
      marks: rankMarks(S, state),
    };
  }, [state, ME]);
  const rival = state.rank.rivals[ME];
  // The sealed orders of one's sestiere open now, not yet delivered (docs/plan-hex-commerce.md H2).
  const today = Math.floor(state.now / (24 * HOUR));
  const orders = useMemo(
    () =>
      mySestiere
        ? plancheOrders(S, today).filter(
            (o) => o.sestiere === mySestiere && o.from <= state.now && state.now <= o.to,
          )
        : [],
    [today, mySestiere, state.now],
  );
  const orderOf = (cityId: string) =>
    orders.find((o) => o.city === cityId && !state.orders?.[o.id]?.by);
  // An order that opens is told once, on the thread of news: a touch leads to its town.
  const toldOrders = useRef(new Set<string>());
  useEffect(() => {
    for (const o of orders) {
      if (toldOrders.current.has(o.id) || state.orders?.[o.id]?.by) continue;
      if (state.orders?.[o.id]?.tried.includes(ME)) continue;
      toldOrders.current.add(o.id);
      const town = S.cities.find((c) => c.id === o.city)?.name;
      tell(
        `Commande scellée à ${town} : ${o.units} ${S.goods[o.good]?.toLowerCase()} au double du prix, jusqu'à ${hourOf(o.to)}.`,
        { kind: "city", id: o.city },
      );
    }
  }, [orders, state.orders, ME, tell]);
  /** A gesture: on line it is the server's to play, here it is the engine's. */
  const act = (f: () => PlancheState, done?: string, remote?: [string, unknown]) => {
    if (online && remote) {
      void call(...remote).then((res) =>
        setSaid(res === "ok" ? (done ?? "") : (SAID[res] ?? "Ce geste n'est pas possible.")),
      );
      return;
    }
    try {
      setState(f());
      setSaid(done ?? "");
    } catch (e) {
      setSaid(SAID[(e as Error).message] ?? "Ce geste n'est pas possible.");
    }
  };

  const day =
    Math.floor((state.now - (online ? (view?.since ?? state.now) : T0)) / (24 * HOUR)) + 1;
  const hour = new Date(state.now).getUTCHours();
  const phone = typeof window !== "undefined" && window.innerWidth < 640;
  const plain = phone || new URLSearchParams(window.location.search).has("simple");

  // What one's island makes, or what lies in store: what a thread may carry.
  const sells = new Set([
    ...Object.keys(plancheSupply(S, state, ME, state.now)),
    ...Object.entries(me?.stock ?? {})
      .filter(([, n]) => n > 0)
      .map(([g]) => g),
  ]);

  if (inIsle && ME && me?.ile) {
    const gesture = (g: IleGesture): Promise<string> | string => {
      if (online) {
        if (g.kind === "buy") return call("/ile/buy", { at: g.at });
        if (g.kind === "build") return call("/ile/build", { type: g.type, at: g.at });
        if (g.kind === "upgrade") return call("/ile/upgrade", { at: g.at });
        return call("/ile/move", { from: g.from, to: g.to });
      }
      try {
        const now = state.now;
        setState(
          g.kind === "buy"
            ? plancheBuyTile(S, state, ME, g.at, now)
            : g.kind === "build"
              ? plancheBuild(S, state, ME, g.type, g.at, now)
              : g.kind === "upgrade"
                ? plancheUpgrade(S, state, ME, g.at, now)
                : plancheMove(S, state, ME, g.from, g.to, now),
        );
        return "ok";
      } catch (e) {
        return (e as Error).message;
      }
    };
    return (
      <IleScreen
        setup={S}
        state={state}
        house={ME}
        onGesture={gesture}
        onBack={() => setInIsle(false)}
      />
    );
  }

  if (sealed) {
    const o = sealed;
    const town = S.cities.find((c) => c.id === o.city)?.name ?? "";
    return (
      <Suspense fallback={null}>
        <LabPasse
          duel={{
            board: "segna",
            problem: o.problem,
            foe: `la commande de ${town}`,
            onEnd: (won, moves) => {
              setSealed(null);
              const said = won
                ? `Livré : ${o.units} ${S.goods[o.good]?.toLowerCase()} à ${town}, au double du prix.`
                : SAID.duel_lost;
              act(() => plancheOrderTry(S, state, ME, o.id, state.now, won), said, [
                "/order",
                { order: o.id, moves: moves.map((m) => ({ at: m.at })) },
              ]);
            },
          }}
        />
      </Suspense>
    );
  }

  if (duel) {
    const p = S.passages.find((q) => q.id === duel);
    const holder = state.passages[duel]?.holder ?? "";
    return (
      <Suspense fallback={null}>
        <LabPasse
          duel={{
            board: p?.board ?? "segna",
            seals: state.passages[duel]?.seals,
            foe: plancheIsCorsair(holder)
              ? holder.slice(8)
              : `le lieutenant de ${nameOf(holder, view?.names)}`,
            onEnd: (won, moves) => {
              setDuel(null);
              if (!won) {
                setSaid("La chaîne a tenu : tu perds la cargaison engagée, rien d'autre.");
                return;
              }
              act(() => plancheForced(S, state, ME, duel, state.now), undefined, [
                "/force",
                { passage: duel, moves },
              ]);
              const left = (state.passages[duel]?.seals ?? 1) - 1;
              setSaid(
                left > 0
                  ? `Passé. Un sceau brisé : il en reste ${left}. Tes fils traversent librement pendant un jour.`
                  : `${p?.name} porte ton pavillon : la route est ouverte, et les autres te paient le péage.`,
              );
            },
          }}
        />
      </Suspense>
    );
  }

  const city = chosen?.kind === "city" ? S.cities.find((c) => c.id === chosen.id) : undefined;
  const passage =
    chosen?.kind === "passage" ? S.passages.find((p) => p.id === chosen.id) : undefined;
  const house = chosen?.kind === "house" ? S.houses.find((h) => h.id === chosen.id) : undefined;
  const short = (id: string) => houseName(id, view?.names);
  const playing = !(online && !ME);
  // The bobbins, drawn: stretched, coming home, free.
  const bobbins: ("out" | "back" | "free")[] = [
    ...(me?.threads ?? []).map(() => "out" as const),
    ...(me?.rewinding ?? []).filter((t) => t > state.now).map(() => "back" as const),
  ];
  while (bobbins.length < S.rules.bobbins) bobbins.push("free");
  // A town's shares, for its label: one's own and the others', over all it asks.
  const sharesOf = (cityId: string) => {
    const c = S.cities.find((x) => x.id === cityId);
    const goods = Object.keys(c?.wants ?? {});
    const by = new Map<string, number>();
    for (const g of goods)
      for (const h of plancheShares(S, state, cityId, g, state.now).houses)
        by.set(h.house, (by.get(h.house) ?? 0) + h.bps / Math.max(1, goods.length));
    const mine = by.get(ME) ?? 0;
    by.delete(ME);
    return { mine, others: [...by.values()].sort((x, y) => y - x) };
  };
  const tie = (cityId: string, cityName: string, good: string, detour = false) =>
    act(
      () => plancheThread(S, state, ME, cityId, good, state.now, detour ? { detour: true } : {}),
      detour ? `Fil tendu vers ${cityName}, par le détour.` : `Fil tendu vers ${cityName}.`,
      ["/thread", { city: cityId, good, ...(detour ? { detour: true } : {}) }],
    );
  const untie = (cityId: string, good: string) =>
    act(
      () => plancheUnthread(S, state, ME, cityId, good, state.now),
      "Fil repris : la bobine revient au quai.",
      ["/unthread", { city: cityId, good }],
    );
  const pick = (p: PlanchePick | null) => {
    setChosen(p);
    setFocus(null);
    setPalace(false);
    setProfil(false);
    setGrowth(null);
  };
  const closeX = (
    <button
      type="button"
      className="pc-pl-x"
      aria-label="Fermer la fiche"
      onClick={() => pick(null)}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M2 2 L12 12 M12 2 L2 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
  const cityCard = (() => {
    if (!city) return null;
    const open = plancheRouteOpen(S, state, ME, city.id, state.now);
    const goods = Object.entries(city.wants).map(([good, w]) => {
      const sh = plancheShares(S, state, city.id, good, state.now);
      const held = me?.threads.find((t) => t.to === city.id && t.good === good);
      return {
        good,
        w,
        sh,
        held,
        makes: sells.has(good),
        mine: sh.houses.find((h) => h.house === ME)?.bps ?? 0,
        others: sh.houses.filter((h) => h.house !== ME),
        price: planchePrice(S, state, city.id, good),
      };
    });
    // What one serves first, then what one could; what others serve shows its shares too.
    const shown = goods
      .filter((g) => g.held || g.makes || g.others.length)
      .sort((x, y) => Number(!!y.held) - Number(!!x.held) || Number(y.makes) - Number(x.makes));
    const folded = goods.filter((g) => !g.held && !g.makes && !g.others.length);
    const at =
      shown.find((g) => g.good === focus && (g.held || g.makes)) ??
      shown.find((g) => g.held || g.makes);
    const passed = goods.find((g) => g.held && g.others[0] && g.others[0].bps > g.mine);
    const another = shown.find((g) => !g.held && g.makes && g.good !== at?.good);
    return (
      <section className="pc-planche-card pc-pl-card" data-planche-card>
        <div className="pc-pl-head">
          <div>
            <h2>{city.name}</h2>
            <span>
              {city.via.length
                ? `Par ${city.via.map((id) => S.passages.find((p) => p.id === id)?.name).join(", ")}`
                : city.id === "rialto"
                  ? "Le marché de Venise · il achète tout"
                  : "Terraferme"}
              {` · ${goods.length} marchandise${goods.length > 1 ? "s" : ""} demandée${goods.length > 1 ? "s" : ""}`}
            </span>
          </div>
          {closeX}
        </div>
        {!playing ? (
          <p>Toutes les Maisons sont prises : tu regardes la planche sans y jouer.</p>
        ) : !open ? (
          <p>
            Route fermée :{" "}
            {city.via
              .filter((id) => plancheIsCorsair(state.passages[id]?.holder ?? ""))
              .map((id) => S.passages.find((p) => p.id === id)?.name)
              .join(", ")}{" "}
            est aux corsaires.{" "}
            {city.detourBps
              ? `Force la tour pour tout porter, ou prends le détour : ${Math.round(city.detourBps / 100)} % de la charge, sans duel ni péage.`
              : "Force le passage."}
          </p>
        ) : null}
        {(() => {
          const o = playing ? orderOf(city.id) : undefined;
          if (!o) return null;
          const pb = venice1450Passe.problems.find((p) => p.id === o.problem);
          const why = plancheOrderRefusal(S, state, ME, o.id, state.now);
          return (
            <div className="pc-pl-order" data-order={o.id}>
              <Sceau size={30} />
              <div>
                <b>
                  Commande scellée · {o.units} {S.goods[o.good]?.toLowerCase()} au double du prix
                </b>
                <span>
                  {ducats(o.price)} ducats l'unité, livrés par{" "}
                  {S.passages.find((p) => p.id === city.via[0])?.name} jusqu'à {hourOf(o.to)} · la
                  première Maison du sestiere l'emporte.
                </span>
                <span>
                  Une position : le fil passe en {pb?.moves ?? 2} coups. Un seul essai ; perdu, rien
                  n'est pris.
                </span>
                <button
                  type="button"
                  className="pc-passe-go"
                  data-play-order={o.id}
                  disabled={!!why}
                  onClick={() => setSealed(o)}
                >
                  {why ? (ORDER_SHUT[why] ?? "Pas pour toi") : "Jouer la position"}
                </button>
              </div>
            </div>
          );
        })()}
        {passed ? (
          <div className="pc-pl-alert">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M3 14 L8 9 L11 12 L17 6 M13 6 H17 V10"
                stroke="#E0614F"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              <b>{short(passed.others[0]?.house ?? "")} vient de te passer devant</b> sur{" "}
              {S.goods[passed.good]?.toLowerCase()} : {pct(passed.others[0]?.bps ?? 0)} contre tes{" "}
              {pct(passed.mine)}.
            </span>
          </div>
        ) : null}
        {shown.map((g) => (
          <button
            key={g.good}
            type="button"
            className="pc-pl-good"
            data-good={g.good}
            data-held={String(!!g.held)}
            aria-pressed={at?.good === g.good}
            disabled={!g.held && !g.makes}
            onClick={() => setFocus(g.good)}
          >
            <span className="pc-pl-good-top">
              <b>{S.goods[g.good]}</b>
              <strong>
                {ducats(g.price)} <small>ducats</small>
              </strong>
            </span>
            <ShareBar mine={g.mine} others={g.others.map((o) => o.bps)} big />
            <span className="pc-pl-good-says">
              {g.held || g.others.length ? (
                <>
                  {[
                    g.held ? <em key="me">toi {pct(g.mine)}</em> : null,
                    ...g.others.slice(0, 2).map((o) => (
                      <span key={o.house}>
                        {short(o.house)} {pct(o.bps)}
                      </span>
                    )),
                    <span key="free">libre {pct(g.sh.freeBps)}</span>,
                  ]
                    .filter(Boolean)
                    .flatMap((x, k) => (k ? [" · ", x] : [x]))}
                  {g.held ? (
                    <span className="pc-pl-patina">
                      patine +{Math.round(planchePatina(S, g.held, state.now) / 100)} %
                    </span>
                  ) : null}
                </>
              ) : (
                <>Personne ne la sert · libre {pct(g.sh.freeBps)}</>
              )}
            </span>
          </button>
        ))}
        {!at && playing ? <p>Ton île ne fait encore rien de ce que {city.name} demande.</p> : null}
        {folded.length ? (
          <div className="pc-pl-also">
            <span>{shown.length ? "Aussi demandé :" : "Demandé :"}</span>
            {folded.map((g) => (
              <i key={g.good}>{S.goods[g.good]}</i>
            ))}
            <span>ton île n'en fait pas</span>
          </div>
        ) : null}
        {playing ? (
          <div className="pc-pl-acts">
            {!at ? (
              <button
                type="button"
                className="pc-passe-go"
                data-enter-isle
                onClick={() => {
                  pick(null);
                  setInIsle(true);
                }}
              >
                Entrer dans ton île
              </button>
            ) : at && !at.held ? (
              <button
                type="button"
                className="pc-passe-go"
                data-tie={at.good}
                disabled={!open}
                onClick={() => tie(city.id, city.name, at.good)}
              >
                Tirer un fil · {S.goods[at.good]?.toLowerCase()}
              </button>
            ) : another ? (
              <button
                type="button"
                className="pc-passe-go"
                data-tie={another.good}
                disabled={!open}
                onClick={() => tie(city.id, city.name, another.good)}
              >
                Tirer un fil · {S.goods[another.good]?.toLowerCase()}
              </button>
            ) : null}
            {!open && city.detourBps && (at || another) && !at?.held ? (
              <>
                <button
                  type="button"
                  className="pc-passe-quiet"
                  data-force-from-city
                  onClick={() => {
                    const shut = city.via.find((id) =>
                      plancheIsCorsair(state.passages[id]?.holder ?? ""),
                    );
                    if (shut) pick({ kind: "passage", id: shut });
                  }}
                >
                  Forcer la tour
                </button>
                <button
                  type="button"
                  className="pc-passe-quiet"
                  data-detour={(at ?? another)?.good}
                  onClick={() => {
                    const g = (at ?? another)?.good;
                    if (g) tie(city.id, city.name, g, true);
                  }}
                >
                  Par le détour · {Math.round(city.detourBps / 100)} %
                </button>
              </>
            ) : null}
            {at?.held ? (
              <button
                type="button"
                className="pc-passe-quiet"
                data-untie={at.good}
                onClick={() => untie(city.id, at.good)}
              >
                Reprendre
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  })();
  const passageCard = (() => {
    if (!passage) return null;
    const p = state.passages[passage.id];
    const holder = p?.holder ?? passage.holder;
    const corsair = plancheIsCorsair(holder);
    const freeUntil = me?.free[passage.id] ?? 0;
    return (
      <section className="pc-planche-card pc-pl-card" data-planche-card>
        <div className="pc-pl-head">
          <div>
            <h2>{passage.name}</h2>
            <span>
              {holder === ME
                ? "Tu tiens cette tour"
                : corsair
                  ? `Tenu par ${holder.slice(8)}, corsaire`
                  : `Tenu par ${nameOf(holder, view?.names)}`}
            </span>
          </div>
          {closeX}
        </div>
        <p>
          {corsair
            ? "Il ne laisse passer personne : force le passage pour ouvrir la route."
            : `Péage de ${Math.round((p?.tollBps ?? 0) / 100)} % sur chaque cargaison qui passe.`}
          {freeUntil > state.now
            ? ` Tu passes librement encore ${Math.ceil((freeUntil - state.now) / HOUR)} h.`
            : ""}
        </p>
        <div className="pc-pl-seal-line">
          <Seals left={p?.seals ?? 0} />
          <span>
            {p?.seals} sceau{(p?.seals ?? 0) > 1 ? "x" : ""} : au dernier brisé, la tour change de
            main
          </span>
        </div>
        {!playing ? null : holder === ME ? (
          <div className="pc-passe-opts">
            {[500, 1000, 1500].map((bps) => (
              <button
                key={bps}
                type="button"
                aria-pressed={p?.tollBps === bps}
                onClick={() =>
                  act(
                    () => plancheToll(S, state, ME, passage.id, bps),
                    `Péage réglé à ${bps / 100} %.`,
                    ["/toll", { passage: passage.id, tollBps: bps }],
                  )
                }
              >
                Péage {bps / 100} %
              </button>
            ))}
          </div>
        ) : (
          <div className="pc-pl-acts">
            <button
              type="button"
              className="pc-passe-go"
              data-force
              onClick={() => setDuel(passage.id)}
            >
              Forcer le passage
              <small>la Passe, un duel de deux minutes</small>
            </button>
          </div>
        )}
      </section>
    );
  })();
  const houseCard = (() => {
    if (!house) return null;
    const mine = house.id === ME;
    const supply = plancheSupply(S, state, house.id, state.now);
    const stockList = Object.entries(state.houses[house.id]?.stock ?? {}).filter(([, n]) => n > 0);
    return (
      <section className="pc-planche-card pc-pl-card" data-planche-card>
        <div className="pc-pl-head">
          <div>
            <h2>{mine ? "Ta Maison" : short(house.id)}</h2>
            {S.maison && state.houses[house.id]?.level ? (
              <span className="pc-mn-title" data-house-title>
                {
                  maisonLevel(
                    S.maison,
                    maisonThreshold(S.maison, state.houses[house.id]?.level ?? 1),
                  ).title
                }{" "}
                · niveau {state.houses[house.id]?.level}
              </span>
            ) : null}
            <span>
              {(online ? !view?.players.includes(house.id) : house.robot)
                ? "Maison tenue par l'ordinateur"
                : mine
                  ? "Ton île et ton quai"
                  : "Maison d'un joueur"}
            </span>
          </div>
          {closeX}
        </div>
        <p>
          {mine ? "Ton île fait" : "Son île fait"} :{" "}
          {Object.entries(supply)
            .map(([g, n]) => `${S.goods[g]?.toLowerCase()} (${Math.round(n)} par heure)`)
            .join(", ") || "rien encore"}
          .
        </p>
        {mine ? (
          <div className="pc-pl-also">
            <span>En entrepôt :</span>
            {stockList.length ? (
              stockList.map(([g, n]) => (
                <i key={g}>
                  {S.goods[g]} {n}
                </i>
              ))
            ) : (
              <span>vide</span>
            )}
            <span>plafond {S.rules.store}</span>
          </div>
        ) : null}
        {(state.houses[house.id]?.threads ?? []).map((t) => (
          <div key={`${t.to}|${t.good}`} className="pc-planche-row">
            <div>
              <b>{S.cities.find((c) => c.id === t.to)?.name}</b>
              <span>
                {S.goods[t.good]} · patine +{Math.round(planchePatina(S, t, state.now) / 100)} %
              </span>
            </div>
          </div>
        ))}
        {mine && !me?.threads.length ? (
          <p className="pc-planche-do">
            {Object.keys(supply).length || stockList.length
              ? "Touche une ville pour y tirer ton premier fil."
              : "Bâtis d'abord un atelier dans ton île : il fera ce que tes fils vendront."}
          </p>
        ) : null}
        {mine && state.houses[ME]?.ile ? (
          <div className="pc-pl-acts">
            <button
              type="button"
              className="pc-passe-go"
              data-enter-isle
              onClick={() => {
                pick(null);
                setInIsle(true);
              }}
            >
              Entrer dans ton île
              <small>bâtir, améliorer, voir l'entrepôt</small>
            </button>
          </div>
        ) : null}
      </section>
    );
  })();
  const latest = news.at(-1);
  return (
    <div
      className="porcellana fixed inset-0 pc-passe pc-planche"
      data-planche-lab
      data-gate={gate}
      data-threads={Object.values(state.houses).reduce((n, h) => n + h.threads.length, 0)}
      data-live={String(heard)}
    >
      <Canvas
        orthographic
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          (camera as OrthographicCamera & { manual?: boolean }).manual = true;
        }}
        onPointerMissed={() => pick(null)}
      >
        <PlancheBoard
          setup={S}
          land={LAND}
          state={state}
          me={ME}
          chosen={chosen}
          pins={pins}
          onPick={pick}
          phone={phone}
          plain={plain}
          zoom={!LAGOON && scale === "monde" ? 0.5 : 1}
          whole={LAGOON && scale === "monde"}
          marks={SESTIERI}
          rival={rival}
        />
      </Canvas>
      <div className="pc-vignette" />
      {/* The labels: every place is a button, for the thumb, the keyboard and the screen reader. */}
      <div className="pc-planche-pins">
        {S.cities.map((c) => {
          const served = me?.threads.some((t) => t.to === c.id);
          const sh = sharesOf(c.id);
          return (
            <button
              key={c.id}
              type="button"
              ref={pin(`city:${c.id}`)}
              className="pc-planche-pin pc-pl-city"
              data-city={c.id}
              data-mine={String(!!served)}
              data-chosen={String(chosen?.kind === "city" && chosen.id === c.id)}
              data-shut={String(!plancheRouteOpen(S, state, ME, c.id, state.now))}
              data-sealed={String(!!orderOf(c.id))}
              onClick={() => pick({ kind: "city", id: c.id })}
            >
              <b>
                {orderOf(c.id) ? <Sceau size={13} /> : null}
                {c.name}
              </b>
              <ShareBar mine={sh.mine} others={sh.others} />
            </button>
          );
        })}
        {S.passages.map((p) => {
          const holder = state.passages[p.id]?.holder ?? p.holder;
          const corsair = plancheIsCorsair(holder);
          return (
            <button
              key={p.id}
              type="button"
              ref={pin(`passage:${p.id}`)}
              className="pc-planche-pin pc-pl-tower"
              data-passage={p.id}
              data-mine={String(holder === ME)}
              data-dark={String(corsair)}
              onClick={() => pick({ kind: "passage", id: p.id })}
            >
              {corsair ? (
                <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                  <rect x="1.5" y="6" width="9" height="7" rx="1.5" fill="currentColor" />
                  <path
                    d="M3.5 6 V4 a2.5 2.5 0 0 1 5 0 V6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                  />
                </svg>
              ) : null}
              <b>
                {p.name}
                {corsair ? ` · ${holder.slice(8)}` : ""}
              </b>
              <Seals left={state.passages[p.id]?.seals ?? 0} light={corsair} />
            </button>
          );
        })}
        {S.houses.map((h) => {
          const robot = online ? !view?.players.includes(h.id) : h.robot;
          // In a lagoon, names where they are read: one's own sestiere up close; from afar, only
          // oneself, one's rival and the Doge. The others, a flag (docs/plan-lagunes.md G5).
          const named =
            !LAGOON ||
            h.id === ME ||
            h.id === rival ||
            !!rank.marks[h.id]?.doge ||
            (scale !== "monde" && h.sestiere === mySestiere);
          return (
            <button
              key={h.id}
              type="button"
              ref={pin(`house:${h.id}`)}
              className="pc-planche-pin pc-planche-house"
              data-compact={String(!named)}
              aria-label={named ? undefined : short(h.id)}
              data-house={h.id}
              data-mine={String(h.id === ME)}
              data-rival={String(h.id === rival)}
              onClick={() => pick({ kind: "house", id: h.id })}
            >
              {h.id === ME ? null : <Flag tone={robot ? "robot" : "player"} />}
              {named ? <b>{h.id === ME ? "Ta Maison" : short(h.id)}</b> : null}
              {h.id === rival ? <small className="pc-rk-tag">rival</small> : null}
              <Marks m={rank.marks[h.id]} name={short} />
            </button>
          );
        })}
        {LAGOON
          ? SESTIERI.map((m) => (
              <span
                key={m.key}
                ref={pin(m.key)}
                className="pc-planche-pin pc-pl-sestiere"
                data-mine={String(m.id === mySestiere)}
                aria-hidden="true"
              >
                {m.name}
              </span>
            ))
          : null}
      </div>
      <header className="pc-passe-top pc-pl-top">
        <div className="pc-pl-left">
          <button
            type="button"
            className="pc-pl-brand"
            aria-label="Ton profil"
            data-planche-medallion
            onClick={() => {
              if (!account) return;
              pick(null);
              if (maison) setGrowth("maison");
              else setProfil(true);
            }}
          >
            <MaisonRing m={maison} size={36} />
            <span>
              <b>{me ? (online ? short(ME) : "Ta Maison") : "Fondaco"}</b>
              <span>
                {maison ? `${maison.title} · niv. ${maison.level} · ` : ""}Jour {day} · {hour} h
              </span>
            </span>
          </button>
          {online ? (
            <span className="pc-planche-online" data-planche-online>
              {view && !view.me
                ? "En ligne · tu regardes : toutes les Maisons sont prises"
                : `En ligne · ${view?.players.length ?? 0} joueur${(view?.players.length ?? 0) > 1 ? "s" : ""}`}
            </span>
          ) : (
            <span className="pc-planche-speed">
              {(
                [
                  [0, "Pause"],
                  [1, "×1"],
                  [6, "×6"],
                ] as const
              ).map(([v, name]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={speed === v}
                  onClick={() => setSpeed(v)}
                >
                  {name}
                </button>
              ))}
            </span>
          )}
        </div>
        <div className="pc-pl-purse">
          <span className="pc-pl-ducats">
            <DucatCoin size={phone ? 22 : 26} />
            <b data-planche-ducats>{ducats(me?.ducats ?? 0n)}</b>
          </span>
          <i className="pc-pl-sep" />
          <span
            className="pc-pl-bobbins"
            aria-label={`Bobines : ${bobbins.filter((b) => b === "out").length} tendues, ${bobbins.filter((b) => b === "back").length} qui reviennent, ${free} libres`}
          >
            {bobbins.map((b, k) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the bobbins are only counted.
              <Bobbin key={k} state={b} size={phone ? 20 : 24} />
            ))}
            <small data-planche-bobbins>
              {free} libre{free > 1 ? "s" : ""}
            </small>
          </span>
          <i className="pc-pl-sep" />
          <button
            type="button"
            className="pc-pl-rank"
            data-planche-rank-open
            aria-label={`${rank.place}e sur ${S.houses.length} : le palais du Doge`}
            onClick={() => {
              pick(null);
              setPalace(true);
            }}
          >
            <b data-planche-rank>
              {rank.place}
              <sup>e</sup>
            </b>
            <Trend n={rank.trend} />
            <small>sur {neighbours}</small>
          </button>
        </div>
      </header>
      <nav className="pc-pl-scale" aria-label="L'échelle">
        <button type="button" aria-pressed={scale === "monde"} onClick={() => setScale("monde")}>
          {LAGOON ? "lagune" : "monde"}
        </button>
        <button type="button" aria-pressed={scale === "lagune"} onClick={() => setScale("lagune")}>
          {LAGOON ? "sestiere" : "lagune"}
        </button>
        <button
          type="button"
          disabled={!me?.ile}
          onClick={() => {
            pick(null);
            setInIsle(true);
          }}
        >
          île
        </button>
      </nav>
      <footer className="pc-passe-foot pc-pl-foot">
        {said ? <p className="pc-passe-said">{said}</p> : null}
        {cityCard}
        {passageCard}
        {houseCard}
        {palace && ME ? (
          <Palais
            setup={S}
            state={state}
            me={ME}
            name={short}
            close={closeX}
            onRival={(id) => pick({ kind: "house", id })}
          />
        ) : null}
        {growth === "maison" && maison ? (
          <MaisonSheet
            m={maison}
            close={closeX}
            onFacade={() => setGrowth("facade")}
            onProfil={() => {
              setGrowth(null);
              setProfil(true);
            }}
          />
        ) : null}
        {growth === "facade" && maison ? (
          <FacadeSheet
            m={maison}
            close={closeX}
            name={short}
            place={(id) => S.passages.find((p) => p.id === id)?.name ?? id}
          />
        ) : null}
        {profil && account ? (
          <Profil
            account={account}
            {...(view?.lagoon ? { lagoon: view.lagoon } : {})}
            close={() => setProfil(false)}
            onFlag={() => {
              setProfil(false);
              setGate("found");
            }}
            onOut={() => {
              setProfil(false);
              void api.logout().finally(() => {
                setAccount(null);
                setView(null);
                setGate("signin");
              });
            }}
          />
        ) : null}
        {!chosen && !palace && !profil && !growth ? (
          <div className="pc-planche-news" aria-label="Le fil des nouvelles">
            {latest ? (
              <button key={latest.id} type="button" onClick={() => pick(latest.pick)}>
                <NewsMark />
                <span>{latest.text}</span>
              </button>
            ) : (
              <button type="button" onClick={() => pick({ kind: "house", id: ME })}>
                <NewsMark />
                <span>
                  {me?.threads.length
                    ? "Tes barges suivent tes fils. Touche une ville pour voir sa demande."
                    : "Touche une ville, puis « Tirer un fil » : tes barges feront le reste."}
                </span>
              </button>
            )}
          </div>
        ) : null}
      </footer>
      <div className="pc-pl-peril" aria-hidden="true">
        <span>lagune</span>
        <i />
        <span>le Large · péril</span>
      </div>
      {gate === "signin" ? <Entree onIn={enter} /> : null}
      {levelUp && maison && gate === "in" ? (
        <LevelUp
          m={maison}
          onClose={() => {
            setLevelUp(false);
            try {
              localStorage.setItem(`fondaco.maison.level.${maison.house}`, String(maison.level));
            } catch {
              // No storage.
            }
            setGrowth("maison");
          }}
        />
      ) : null}
      {gate === "found" && account ? (
        <Fonder
          account={account}
          onDone={(a) => {
            setAccount(a);
            setGate("in");
          }}
        />
      ) : null}
    </div>
  );
}
