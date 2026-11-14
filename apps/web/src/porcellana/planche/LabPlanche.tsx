/**
 * The laboratory of the shared board (?lab=planche, docs/plan-planche.md): one's house among seven
 * held by the computer, the towns all dispute, the threads one stretches and takes back, the
 * passages one pays or forces by the Passe. Time runs fast here: a second is ten minutes of the game.
 */
import "../porcellana.css";
import "../passe/passe.css";
import "./planche.css";
import "./muda.css";
import "./maree.css";
import {
  type AssautFleetShip,
  type AssautPort,
  type AssautState,
  type IleState,
  PASSE_CHAIN,
  type PlancheGazette,
  type PlancheOrder,
  type PlancheState,
  assautFleetOf,
  maisonLevel,
  maisonThreshold,
  maisonUnlocks,
  plancheAdvance,
  plancheAssemble,
  plancheBuild,
  plancheBuyTile,
  plancheCaptainStyle,
  plancheDaily,
  plancheDailyResults,
  plancheDailyTry,
  plancheDecretChoose,
  plancheDefense,
  plancheDefenseMove,
  plancheDefenseRemove,
  plancheEncreThreat,
  plancheForced,
  plancheFreeBobbins,
  plancheGuard,
  plancheInit,
  plancheIsCorsair,
  plancheLagoonLand,
  plancheMonday,
  plancheMove,
  plancheMudaForce,
  plancheMudaPhase,
  plancheNoirBoard,
  plancheNoirMind,
  plancheNoirTry,
  plancheOrderRefusal,
  plancheOrderTry,
  plancheOrders,
  planchePatina,
  planchePlace,
  planchePower,
  planchePrice,
  plancheRobot,
  plancheRouteOpen,
  plancheRuses,
  plancheSealsLeft,
  plancheShares,
  plancheShip,
  plancheShipRefit,
  plancheShipRepair,
  plancheSortieEnd,
  plancheSortieTold,
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
import { AssautScreen } from "../guerre/AssautScreen.js";
import { GuerreSheet, type GuerreViewData } from "../guerre/GuerreSheet.js";
import { type IleGesture, IleScreen } from "../ile/IleScreen.js";
import { ArsenalSheet, PortSheet, ShipGlyph } from "./Arsenal.js";
import { CompagnieSheet, type Sign } from "./Compagnie.js";
import { Entree, Fonder, HouseFlag, Profil } from "./Entree.js";
import { GardeEditor } from "./Garde.js";
import { FacadeSheet, LevelUp, MaisonRing, MaisonSheet, type MaisonView } from "./Maison.js";
import {
  MareeSheet,
  type MareeView,
  SerenissimeSheet,
  type SerenissimeView,
  TideEndSheet,
} from "./Maree.js";
import { GazetteSheet, MudaSheet, NoirSheet, POWER_OF, Reliques } from "./Muda.js";
import { Marks, Palais, Trend, rankMarks } from "./Palais.js";
import { PlancheBoard, type PlancheLand, type PlanchePick } from "./PlancheBoard.js";
import { Bobbin, Flag, Knot, NewsMark, Seals, ShareBar, pct } from "./PlancheUi.js";

import type { PasseRemote, PasseRemoteView } from "../passe/LabPasse.js";

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
  planche_detour_level: "Le détour s'ouvre à la Casa : monte ta Maison pour le prendre.",
  // The duels against the computer (docs/plan-duels.md B1, B2).
  planche_force_tried: "Tu as déjà tenté cette tour aujourd'hui : demain, un autre essai.",
  planche_own_passage: "Cette tour est déjà la tienne.",
  planche_daily_tried: "Tu as déjà joué le problème du jour.",
  duel_running: "Un autre duel est en cours : finis-le d'abord.",
  planche_no_bobbin: "Plus de bobine libre : reprends un fil, ou attends qu'une bobine revienne.",
  planche_route_shut: "La route est fermée par un corsaire : force le passage.",
  planche_twice: "Ce fil est déjà tendu.",
  planche_defi_absent:
    "Cette Maison n'est pas sur la planche en ce moment : défie-la quand elle y sera.",
  planche_defi_week: "Vous vous êtes déjà affrontés à la Passe cette semaine.",
  planche_defi_busy: "Un défi est déjà en cours, pour toi ou pour elle.",
  planche_not_person: "On ne défie que les Maisons des joueurs.",
  planche_short: "Ton entrepôt n'a pas assez de marchandises.",
  planche_no_cale: "Toutes les cales sont prises.",
  planche_port_full: "Cette passe n'a plus de place.",
  planche_level: "Ton niveau ne l'ouvre pas encore.",
  planche_ruses_today: "Tu as déjà posé tes ruses aujourd'hui : demain de nouveau.",
  guerre_today: "Tu as déjà lancé ton assaut aujourd'hui : demain de nouveau.",
  guerre_closed: "Les assauts se lancent du mardi au samedi.",
  guerre_no_fleet: "Il te faut au moins un navire en état : l'Arsenal les arme.",
  guerre_none: "Tu n'es dans aucune flottille cette semaine.",
  planche_guard_today: "Tu as déjà posé ta garde aujourd'hui : demain de nouveau.",
  duel_lost: "Ce n'était pas la clef : la commande reste aux autres, tu ne perds rien d'autre.",
  planche_order_taken: "Une autre Maison du sestiere a livré cette commande avant toi.",
  planche_order_tried: "Tu as déjà joué cette commande : un seul essai par Maison.",
  planche_order_closed: "Cette commande n'est plus ouverte.",
  planche_order_short: "Ton entrepôt n'a pas assez de marchandise pour la livrer.",
  // The black straits and the Muda (docs/plan-muda.md).
  planche_noir_tried: "Tu as joué tes deux détroits noirs aujourd'hui : demain de nouveau.",
  planche_noir_cargo: "Cette cargaison n'est pas possible : vois ton entrepôt et ton niveau.",
  planche_few_relics: "Il faut trois reliques d'une même puissance pour un plan.",
  planche_no_plan: "Ce haut ouvrage demande un plan : il vient des reliques des détroits noirs.",
  planche_muda_closed: "Les détroits de la Muda se forcent le samedi, de 8 h à 20 h.",
  planche_muda_empty: "Le convoi n'a rien dans sa cale : il ne sort pas.",
  planche_muda_passed: "Ce détroit est déjà passé.",
  planche_muda_ahead: "Le convoi n'en est pas là : force d'abord le détroit qu'il attend.",
  planche_muda_tried: "Tu as déjà tenté ce détroit : à un autre de le forcer.",
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
  // The Muda's worths and what it paid (docs/plan-muda.md), in deniers.
  const bigs = (o: Record<string, unknown> | undefined) =>
    Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, big(v)]));
  const m = raw.muda;
  return {
    ...raw,
    houses,
    minted: big(raw.minted),
    burnt: big(raw.burnt),
    spent: big(raw.spent),
    ...(raw.moved !== undefined ? { moved: big(raw.moved) } : {}),
    ...(m
      ? {
          muda: {
            ...m,
            worth: bigs(m.worth),
            ...(m.paid ? { paid: bigs(m.paid) } : {}),
            ...(m.last ? { last: { ...m.last, paid: bigs(m.last.paid) } } : {}),
          },
        }
      : {}),
  };
}

interface Online {
  /** The companies of the board's houses, the company's signs, the greetings received (docs/plan-compagnie.md). */
  compagnies?: Record<
    string,
    { id: string; name: string; flag: { color: string; symbol: string } }
  >;
  signs?: Sign[];
  greeted?: { kind: string; by: string; at: number }[];
  /** The challenges by the thread (docs/plan-hex-commerce.md H5). */
  defi?: { incoming?: { house: string; name: string }; outgoing?: string; room?: string };
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
  const [growth, setGrowth] = useState<"maison" | "facade" | "jour" | null>(null);
  /** The Arsenal or the port, open (docs/plan-arsenal.md A4). */
  const [armory, setArmory] = useState<"arsenal" | "port" | null>(null);
  /** The Arsenal opened once already (its first visit tells what it is for). */
  const [arsenalSeen, setArsenalSeen] = useState(() => {
    try {
      return localStorage.getItem("fondaco.arsenal.seen") === "1";
    } catch {
      return false;
    }
  });
  /** The company's sheet (docs/plan-compagnie.md K5). */
  const [compOpen, setCompOpen] = useState(false);
  /** The Muda's sheet, a black strait's duel and its cargo, a strait of the Muda's (docs/plan-muda.md). */
  const [mudaOpen, setMudaOpen] = useState(false);
  const [noirDuel, setNoirDuel] = useState<{ strait: string; good: string; n: number } | null>(
    null,
  );
  const [mudaDuel, setMudaDuel] = useState<string | null>(null);
  /** The tide (docs/plan-maree.md T6, T7): its sheet, its end, a sortie met, the Sérénissime. */
  const [mareeOpen, setMareeOpen] = useState(false);
  const [mareeView, setMareeView] = useState<MareeView | null>(null);
  const [tideEnd, setTideEnd] = useState(false);
  const [sortieDuel, setSortieDuel] = useState<string | null>(null);
  const [serenissime, setSerenissime] = useState<SerenissimeView | null | "open">(null);
  const loadMaree = useCallback(async () => {
    try {
      const res = await fetch("/api/maree", { credentials: "same-origin" });
      const j = (await res.json()) as { maree?: MareeView };
      if (j.maree) setMareeView(j.maree);
    } catch {
      // The tide's sheet shows what the board knows.
    }
  }, []);
  /** The Gazette of Sunday (docs/plan-muda.md N7): the issue read, the weeks kept. */
  const [gazette, setGazette] = useState<{
    issue: PlancheGazette | null;
    weeks: number[];
    lagoon: string;
  } | null>(null);
  const loadGazette = useCallback(async (week?: number) => {
    try {
      const res = await fetch(week ? `/api/gazette/${week}` : "/api/gazette", {
        credentials: "same-origin",
      });
      const j = (await res.json()) as {
        gazette?: { issue: PlancheGazette | null; weeks?: number[]; lagoon: string };
      };
      if (j.gazette) {
        const g = j.gazette;
        setGazette((was) => ({
          issue: g.issue,
          weeks: g.weeks ?? was?.weeks ?? [],
          lagoon: g.lagoon,
        }));
      }
    } catch {
      setSaid("La Gazette ne répond pas.");
    }
  }, []);
  /** A sign of one's company, or a greeting to a neighbour (docs/plan-compagnie.md K2). */
  const signal = async (path: "/sign" | "/greet", body: unknown, done: string) => {
    const res = await fetch(`/api/planche${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setSaid(
      json.error === "greeted_today"
        ? "Tu l'as déjà salué aujourd'hui."
        : json.error === "not_member"
          ? "Il faut une compagnie pour poser un signe."
          : json.error
            ? "Ce signe n'est pas possible."
            : done,
    );
    void call();
  };
  /** The War of the week (docs/plan-guerre.md W4): its sheet, and the assault under way. */
  const [war, setWar] = useState<GuerreViewData | null>(null);
  const [warOpen, setWarOpen] = useState(false);
  const [warAssault, setWarAssault] = useState<{
    target: string;
    start: AssautState;
    ile?: IleState | null;
  } | null>(null);
  /** An assault seen again (docs/plan-guerre.md): its port, its fleet, its rounds. */
  const [replayed, setReplayed] = useState<{
    port: AssautPort;
    fleet: AssautFleetShip[];
    moves: Record<number, string>[];
    by: string;
    target: string;
    ile: IleState | null;
  } | null>(null);
  const loadWar = useCallback(async () => {
    try {
      const res = await fetch("/api/guerre", { credentials: "same-origin" });
      const json = (await res.json()) as { guerre?: GuerreViewData };
      if (json.guerre) setWar(json.guerre);
      return json.guerre ?? null;
    } catch {
      return null;
    }
  }, []);
  const postWar = async (path: string, body: unknown) => {
    const res = await fetch(`/api/guerre${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json().catch(() => ({ error: "offline" }))) as {
      assaut?: AssautState;
      ile?: IleState | null;
      error?: string;
    };
  };
  /** The training port open (docs/plan-guerre.md W3). */
  const [training, setTraining] = useState(false);
  /** The problem of the day, being played. */
  const [dailyPlay, setDailyPlay] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  /**
   * A company's invitation (`/?co=CODE`, docs/plan-compagnie.md K1), kept through the mail's link:
   * joined before the board is first read, so that a newcomer is seated in the company's lagoon.
   */
  const joinInvited = useCallback(async () => {
    let code: string | null = null;
    try {
      code = localStorage.getItem("fondaco.co");
      localStorage.removeItem("fondaco.co");
    } catch {
      return;
    }
    if (!code) return;
    await fetch("/api/planche/compagnie/join", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    const co = new URLSearchParams(window.location.search).get("co");
    if (!co || !/^[\w-]{4,20}$/.test(co)) return;
    try {
      localStorage.setItem("fondaco.co", co);
    } catch {
      // A private window: the invitation is lost with the page.
    }
  }, []);
  const enter = useCallback(
    (a: Account) => {
      setAccount(a);
      if (a.pseudoDefault || !a.crest) setGate("found");
      else void joinInvited().finally(() => setGate("in"));
    },
    [joinInvited],
  );
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
  /** The rooms of challenges one has left (the server forgets them a little later). */
  const leftRooms = useRef(new Set<string>());
  /** My cote and challenges before a challenge, to tell how it moved once written. */
  const coteWas = useRef<{ cote: number; defis: number } | null>(null);
  /** The room of the challenge one is in. */
  const [inRoom, setInRoom] = useState<string | null>(null);
  const offered = view?.defi?.room;
  useEffect(() => {
    if (offered && !leftRooms.current.has(offered)) setInRoom(offered);
  }, [offered]);
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
      const v = (json.planche as { version?: number }).version;
      if (typeof v === "number") known.current = Math.max(known.current, v);
      setState(revive(json.planche.state));
      setView({
        since: json.planche.since,
        lagoon: (json.planche as Online).lagoon,
        me: json.planche.me,
        names: json.planche.names,
        players: json.planche.players,
        ...((json.planche as Online).defi ? { defi: (json.planche as Online).defi } : {}),
        compagnies: (json.planche as Online).compagnies ?? {},
        signs: (json.planche as Online).signs ?? [],
        greeted: (json.planche as Online).greeted ?? [],
      });
      return "ok";
    } catch {
      return "offline";
    }
  }, []);
  /**
   * A push from the server says the board's version (docs/plan-socle.md A2): read again only if it
   * is newer than ours, and at most every three seconds; one's own Maison is read after one's own
   * gestures and on its timer, never on another's.
   */
  const known = useRef(0);
  const lastRead = useRef(0);
  const readSoon = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
      if (m.type !== "planche" || m.version <= known.current || readSoon.current) return;
      // Spread over a second and a half: the lagoon's players do not all read at the same instant.
      const wait = Math.max(0, lastRead.current + 3_000 - Date.now()) + Math.random() * 1_500;
      readSoon.current = setTimeout(() => {
        readSoon.current = undefined;
        lastRead.current = Date.now();
        void call();
      }, wait);
    }, setHeard);
  }, [online, gate, call]);

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

  // The greetings received, told once each on the thread of news (docs/plan-compagnie.md K2).
  const toldGreet = useRef(new Set<string>());
  useEffect(() => {
    for (const g of view?.greeted ?? []) {
      const key = `${g.by}${g.kind}${g.at}`;
      if (toldGreet.current.has(key)) continue;
      toldGreet.current.add(key);
      tell(g.kind === "bravo" ? `Ca’ ${g.by} te félicite.` : `Ca’ ${g.by} te salue.`, {
        kind: "house",
        id: ME,
      });
    }
  }, [view?.greeted, tell, ME]);
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
  // The problem of the day (docs/plan-hex-commerce.md H3): one for the lagoon, one try.
  const dailyId = plancheDaily(S, today);
  const daily = dailyId
    ? [...venice1450Passe.problems, ...venice1450Passe.jour].find((p) => p.id === dailyId)
    : undefined;
  const dailyMine = state.daily?.[today]?.[ME];
  const yesterday = plancheDailyResults(state, today - 1);
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
  // A tide closed since this device last saw one: its moment (docs/plan-maree.md T7). The server
  // tells which (the house may have moved to another lagoon with its league).
  const tide = state.rank.tide;
  useEffect(() => {
    if (online && ME && tide >= 0) void loadMaree();
  }, [online, ME, tide, loadMaree]);
  const closedKey = mareeView?.last?.key;
  useEffect(() => {
    if (!closedKey) return;
    let seen = "";
    try {
      seen = localStorage.getItem("fondaco.maree.vue") ?? "";
    } catch {
      seen = "";
    }
    if (closedKey !== seen) setTideEnd(true);
  }, [closedKey]);
  /** A gesture: on line it is the server's to play, here it is the engine's. */
  const act = (
    f: () => PlancheState,
    done?: string,
    remote?: [string, unknown],
    /** The server's answers that are this gesture's own end (a position lost: the try is spent). */
    also: string[] = [],
  ) => {
    if (online && remote) {
      void call(...remote).then((res) => {
        // One's own Maison may have moved (Prestige, relics): read again after one's own gesture.
        if (res === "ok" || also.includes(res)) void readMaison();
        setSaid(
          res === "ok" || also.includes(res)
            ? (done ?? "")
            : (SAID[res] ?? "Ce geste n'est pas possible."),
        );
      });
      return;
    }
    try {
      setState(f());
      setSaid(done ?? "");
    } catch (e) {
      setSaid(SAID[(e as Error).message] ?? "Ce geste n'est pas possible.");
    }
  };

  /**
   * A duel against the computer (docs/plan-duels.md B1): on line, the server plays it piece by
   * piece and writes its end; the board is read again after. Without the server, it is played here.
   */
  const duelLine = (ask: Record<string, unknown>): PasseRemote | undefined => {
    if (!online) return undefined;
    const post = async (path: string, body: unknown) => {
      try {
        const res = await fetch(`/api/planche/duel${path}`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        return (await res.json().catch(() => ({ error: "offline" }))) as {
          duel?: PasseRemoteView;
          error?: string;
        };
      } catch {
        return { error: "offline" };
      }
    };
    return {
      start: () => post("/start", ask),
      play: (m) => post("/play", m),
      quit: () => post("/quit", {}),
    };
  };
  /** A duel's end: told, and the board read again on line; played here without the server. */
  const duelDone = (f: () => PlancheState, done: string, refused?: string) => {
    if (refused) {
      // Not opened: nothing was played, nothing spent.
      setSaid(SAID[refused] ?? "Ce duel ne peut pas s'ouvrir maintenant.");
      return;
    }
    if (online) {
      setSaid(done);
      void call().then(() => readMaison());
      return;
    }
    act(f, done);
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

  // The cote after a challenge, once the board has it (docs/plan-duels.md B4).
  const myRank = state.houses[ME]?.rank;
  useEffect(() => {
    const was = coteWas.current;
    if (!was || !myRank || (myRank.defis ?? 0) <= was.defis) return;
    coteWas.current = null;
    const d = myRank.cote - was.cote;
    setSaid(
      `Le défi est joué. Ta cote : ${myRank.cote.toLocaleString("fr-FR")} (${d >= 0 ? "+" : "−"}${Math.abs(d)}).`,
    );
  }, [myRank]);

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
        onArsenal={() => {
          setInIsle(false);
          setChosen(null);
          setArmory("arsenal");
        }}
      />
    );
  }

  // The room of a challenge under way, kept until one leaves it (the server forgets it once both
  // Passes are played, before the players have read the end).
  const defiRoom = inRoom;
  if (defiRoom) {
    return (
      <Suspense fallback={null}>
        <LabPasse
          defi={{
            code: defiRoom,
            onBack: () => {
              leftRooms.current.add(defiRoom);
              setInRoom(null);
              setSaid("Le défi est joué : ta cote bouge une fois, après les deux Passes.");
              const me0 = state.houses[ME]?.rank;
              coteWas.current = { cote: me0?.cote ?? 0, defis: me0?.defis ?? 0 };
              void call();
            },
          }}
        />
      </Suspense>
    );
  }

  if (replayed && S.guerre) {
    return (
      <AssautScreen
        rules={S.guerre.assaut}
        port={replayed.port}
        fleet={replayed.fleet}
        replay={replayed.moves}
        title={`Revoir · ${replayed.by} sur ${replayed.target}`}
        {...(replayed.ile ? { ile: replayed.ile } : {})}
        onBack={() => {
          setReplayed(null);
          setWarOpen(true);
        }}
      />
    );
  }

  if (warAssault && S.guerre) {
    const foe = war?.theirs.find((p) => p.key === warAssault.target);
    return (
      <AssautScreen
        rules={S.guerre.assaut}
        port={{ passes: {} }}
        fleet={[]}
        title={`Assaut · ${foe?.name ?? "le port adverse"}`}
        {...(warAssault.ile ? { ile: warAssault.ile } : {})}
        remote={{
          start: warAssault.start,
          play: async (moves) => {
            const res = await postWar("/round", { moves });
            return res.assaut ? { state: res.assaut } : { error: res.error ?? "offline" };
          },
        }}
        onBack={() => {
          setWarAssault(null);
          setWarOpen(true);
          void loadWar();
          void call();
        }}
      />
    );
  }

  if (training && S.guerre?.training) {
    const T = S.guerre.training;
    const own = assautFleetOf(S, state, ME);
    // Who has no fleet yet trains with one lent by the Arsenal of the Republic.
    const fleet = own.length
      ? own
      : T.fleet.map((kind, k) => {
          const r = S.arsenal?.ships[kind];
          return {
            id: k + 1,
            kind,
            force: r?.force ?? 0,
            hull: r?.hull ?? 0,
            keyword: r?.keyword ?? "",
          };
        });
    let tutorial = false;
    try {
      tutorial = localStorage.getItem("fondaco.assaut.tuto") !== "1";
    } catch {
      tutorial = true;
    }
    return (
      <AssautScreen
        rules={S.guerre.assaut}
        port={T.port}
        fleet={fleet}
        title={T.name}
        tutorial={tutorial}
        onEnd={() => {
          try {
            localStorage.setItem("fondaco.assaut.tuto", "1");
          } catch {
            // A private window: the guide comes again.
          }
        }}
        onBack={() => setTraining(false)}
      />
    );
  }

  if (dailyPlay && daily) {
    return (
      <Suspense fallback={null}>
        <LabPasse
          duel={{
            board: "segna",
            problem: daily.id,
            foe: "le problème du jour",
            remote: duelLine({ kind: "daily" }),
            onEnd: (won, moves, refused) => {
              setDailyPlay(false);
              const laid = Math.min(moves.length, daily.moves);
              duelDone(
                () => plancheDailyTry(S, state, ME, state.now, won, laid),
                won
                  ? "Problème du jour réussi : un nœud sur ta façade, et du Prestige."
                  : "Ce n'était pas la clef. Un autre problème demain.",
                refused,
              );
            },
          }}
        />
      </Suspense>
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
            remote: duelLine({ kind: "order", order: o.id }),
            onEnd: (won, _moves, refused) => {
              setSealed(null);
              const said = won
                ? `Livré : ${o.units} ${S.goods[o.good]?.toLowerCase()} à ${town}, au double du prix.`
                : (SAID.duel_lost ?? "");
              duelDone(() => plancheOrderTry(S, state, ME, o.id, state.now, won), said, refused);
            },
          }}
        />
      </Suspense>
    );
  }

  // A sortie met before its hour (docs/plan-maree.md T6): the player holds the chain of its tower.
  if (sortieDuel && S.sorties) {
    const x = state.sorties?.list.find((y) => y.id === sortieDuel);
    const p = S.passages.find((q) => q.id === x?.target);
    const id = sortieDuel;
    if (x && p)
      return (
        <Suspense fallback={null}>
          <LabPasse
            duel={{
              board: p.board,
              guard: state.passages[p.id]?.guard,
              seals: state.passages[p.id]?.seals,
              mind: { depth: S.sorties.depth, style: x.style },
              foe: x.captain,
              side: 2,
              stake: `${p.name} : un sceau en jeu`,
              remote: duelLine({ kind: "sortie", sortie: id }),
              onEnd: (held, _moves, refused) => {
                setSortieDuel(null);
                duelDone(
                  () => plancheSortieEnd(S, state, id, !held, "tenant", state.now),
                  held
                    ? `${x.captain} est repoussé : ${p.name} tient, et ta Garde compte un assaut repoussé.`
                    : `${x.captain} est passé : ${p.name} perd un sceau.`,
                  refused,
                );
                setMareeOpen(true);
              },
            }}
          />
        </Suspense>
      );
  }

  // A black strait (docs/plan-muda.md N5): the day's board, its captain's mind, the cargo at stake.
  if (noirDuel && S.noir) {
    const x = S.noir.straits.find((y) => y.id === noirDuel.strait);
    const base = x ? venice1450Passe.boards[x.board as keyof typeof venice1450Passe.boards] : null;
    const cells = base ? plancheNoirBoard(S, state, noirDuel.strait, state.now, base.cells) : [];
    const guard = cells.flatMap((c, i) => (c === PASSE_CHAIN && base?.cells[i] !== c ? [i] : []));
    const { good, n, strait } = noirDuel;
    const what = `${n} ${(S.goods[good] ?? good).toLowerCase()}`;
    return (
      <Suspense fallback={null}>
        <LabPasse
          duel={{
            board: x?.board ?? "otrante",
            guard,
            mind: plancheNoirMind(S, strait),
            foe: x?.captain ?? "le capitaine",
            flag: "puissance",
            stake: `En jeu : ${what}`,
            remote: duelLine({ kind: "noir", strait, good, n }),
            onEnd: (won, _moves, refused) => {
              setNoirDuel(null);
              duelDone(
                () => plancheNoirTry(S, state, ME, strait, { good, n }, won, state.now),
                won
                  ? `Forcé ! ${what} vendus à ${x?.port}, et une relique ${POWER_OF[x?.power ?? ""] ?? x?.power}.`
                  : `La chaîne a tenu : ${what} ont coulé.`,
                refused,
              );
            },
          }}
        />
      </Suspense>
    );
  }

  // A strait of the Muda (docs/plan-muda.md N6): the corsairs' fleet before the convoy.
  if (mudaDuel && S.muda) {
    const x = S.muda.straits.find((y) => y.id === mudaDuel);
    const strait = mudaDuel;
    return (
      <Suspense fallback={null}>
        <LabPasse
          duel={{
            board: x?.board ?? "zara",
            mind: { depth: S.muda.depth },
            foe: `les corsaires de ${x?.name.replace(/^L[ea]s? /, "") ?? "la route"}`,
            stake: "La Muda attend derrière toi",
            remote: duelLine({ kind: "muda", strait }),
            onEnd: (won, _moves, refused) => {
              setMudaDuel(null);
              duelDone(
                () => plancheMudaForce(S, state, ME, strait, won, state.now),
                won
                  ? `${x?.name} est passé : la Muda continue, et toute la lagune y gagne la moitié en plus.`
                  : "Les corsaires ont tenu : à un autre de forcer ce détroit.",
                refused,
              );
              setMudaOpen(true);
            },
          }}
        />
      </Suspense>
    );
  }

  if (duel) {
    const p = S.passages.find((q) => q.id === duel);
    const holder = state.passages[duel]?.holder ?? "";
    const mySeals = plancheSealsLeft(S, state, duel, ME);
    return (
      <Suspense fallback={null}>
        <LabPasse
          duel={{
            board: p?.board ?? "segna",
            // The seals left to the player's own house (docs/plan-duels.md B2).
            seals: mySeals,
            guard: state.passages[duel]?.guard,
            foe: plancheIsCorsair(holder)
              ? holder.slice(8)
              : `le lieutenant de ${nameOf(holder, view?.names)}`,
            ...(plancheIsCorsair(holder)
              ? { mind: { depth: 3, style: plancheCaptainStyle(holder) } }
              : {}),
            stake: "Un essai par jour sur cette tour",
            remote: duelLine({ kind: "force", passage: duel }),
            onEnd: (won, _moves, refused) => {
              setDuel(null);
              if (!won) {
                duelDone(
                  () => state,
                  "La chaîne a tenu : ton essai du jour est passé. Demain, un autre.",
                  refused,
                );
                return;
              }
              const left = mySeals - 1;
              duelDone(
                () => plancheForced(S, state, ME, duel, state.now),
                left > 0
                  ? `Passé. Un de tes sceaux brisé : il t'en reste ${left}. Tes fils traversent librement pendant un jour.`
                  : `${p?.name} porte ton pavillon : la route est ouverte, et les autres te paient le péage.`,
                refused,
              );
            },
          }}
        />
      </Suspense>
    );
  }

  // The towers the ink takes on Monday, told from Saturday; the sorties told against one's towers.
  const threatened = new Set(
    state.now - plancheMonday(state.now) >= 5 * 24 * HOUR ? plancheEncreThreat(S, state) : [],
  );
  const toldSorties = (state.sorties?.list ?? []).filter(
    (x) =>
      !state.sorties?.done[x.id] &&
      state.passages[x.target]?.holder === ME &&
      plancheSortieTold(S, x, state.now),
  );
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
  // The detour opens at its level of the house (docs/plan-economie.md C1).
  const detourOpen = !S.maison || maisonUnlocks(S.maison, me?.level ?? 1).detour;
  const detourLevel = S.maison?.unlocks.find((u) => u.detour)?.level ?? 1;
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
    setArmory(null);
    setWarOpen(false);
    setCompOpen(false);
    setMudaOpen(false);
    setGazette(null);
    setMareeOpen(false);
    setSerenissime(null);
    // The Muda's pier and its straits open the convoy's sheet (docs/plan-muda.md N6).
    if (p?.kind === "muda" || (p?.kind === "city" && p.id === S.muda?.pier)) {
      setChosen(null);
      setMudaOpen(true);
    }
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
                  disabled={!detourOpen}
                  onClick={() => {
                    const g = (at ?? another)?.good;
                    if (g) tie(city.id, city.name, g, true);
                  }}
                >
                  Par le détour · {Math.round(city.detourBps / 100)} %
                  {detourOpen ? null : <small>à la Casa, niveau {detourLevel}</small>}
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
        {playing && holder === ME && passage.guard
          ? (() => {
              const b =
                venice1450Passe.boards[passage.board as keyof typeof venice1450Passe.boards];
              if (!b) return null;
              return (
                <GardeEditor
                  board={b}
                  links={passage.guard}
                  guard={p?.guard ?? []}
                  locked={p?.guardDay === Math.floor(state.now / (24 * HOUR))}
                  onLay={(cells) =>
                    act(
                      () => plancheGuard(S, state, ME, passage.id, cells, state.now, b.cells),
                      "Garde posée : ton lieutenant défendra à partir de ces maillons.",
                      ["/guard", { passage: passage.id, cells }],
                    )
                  }
                />
              );
            })()
          : null}
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
        {online && playing && view?.compagnies?.[ME] ? (
          <div className="pc-pl-acts">
            <button
              type="button"
              className="pc-passe-quiet"
              data-sign-tour={passage.id}
              onClick={() =>
                void signal(
                  "/sign",
                  { kind: "tour", target: `passage:${passage.id}` },
                  "Signe posé : ta compagnie voit qu'il faut tenir cette tour.",
                )
              }
            >
              Tenez cette tour
              <small>un signe pour ta compagnie, cette semaine</small>
            </button>
          </div>
        ) : null}
        {(view?.signs ?? [])
          .filter((x) => x.target === `passage:${passage.id}`)
          .map((x) => (
            <p key={`${x.by}${x.kind}`} className="pc-co-said">
              {x.mine ? "Tu as" : `${x.by} a`} posé un signe : tenez cette tour.
            </p>
          ))}
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
        {S.arsenal ? (
          <div className="pc-ar-power" data-house-power>
            <b>Puissance {planchePower(S, state, house.id)}</b>
            <span>
              {(state.houses[house.id]?.fleet?.ships ?? []).slice(0, 8).map((x) => (
                <ShipGlyph key={x.id} kind={x.kind} size={26} damaged={!!x.damaged} />
              ))}
              {(state.houses[house.id]?.fleet?.ships.length ?? 0) === 0
                ? "pas encore de flotte"
                : null}
            </span>
          </div>
        ) : null}
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
        {mine && S.arsenal ? (
          <div className="pc-pl-acts">
            <button
              type="button"
              className="pc-passe-quiet"
              data-open-arsenal-house
              onClick={() => {
                pick(null);
                setArmory("arsenal");
              }}
            >
              L'Arsenal
              <small>tes cales, ta flotte, ton port</small>
            </button>
            {S.guerre?.training ? (
              <button
                type="button"
                className="pc-passe-quiet"
                data-open-training-house
                onClick={() => {
                  pick(null);
                  setTraining(true);
                }}
              >
                Le Lido des corsaires
                <small>un assaut d'entraînement, sans enjeu</small>
              </button>
            ) : null}
          </div>
        ) : null}
        {!mine && online && playing && view?.players.includes(house.id) ? (
          <div className="pc-pl-acts" data-greet>
            <button
              type="button"
              className="pc-passe-quiet"
              data-greet-salut
              onClick={() =>
                void signal(
                  "/greet",
                  { house: house.id, kind: "salut" },
                  `Tu as salué ${short(house.id)}.`,
                )
              }
            >
              Saluer
            </button>
            <button
              type="button"
              className="pc-passe-quiet"
              data-greet-bravo
              onClick={() =>
                void signal(
                  "/greet",
                  { house: house.id, kind: "bravo" },
                  `Tu as félicité ${short(house.id)}.`,
                )
              }
            >
              Féliciter
            </button>
          </div>
        ) : null}
        {!mine && online && playing && view?.players.includes(house.id) ? (
          <div className="pc-pl-acts">
            <button
              type="button"
              className="pc-passe-quiet"
              data-defi={house.id}
              disabled={view?.defi?.outgoing === house.id}
              onClick={() =>
                void call("/defi", { house: house.id }).then((res) =>
                  setSaid(
                    res === "ok"
                      ? `Défi envoyé à ${short(house.id)} : deux Passes en direct, s'il accepte dans les deux minutes.`
                      : (SAID[res] ?? "Ce défi n'est pas possible."),
                  ),
                )
              }
            >
              {view?.defi?.outgoing === house.id ? "Défi envoyé…" : "Défier par le fil"}
              <small data-defi-cote>
                sa cote {state.houses[house.id]?.rank.cote ?? 0}, la tienne{" "}
                {state.houses[ME]?.rank.cote ?? 0} · un match de deux Passes
              </small>
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
              data-menace={String(!corsair && threatened.has(p.id))}
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
        {toldSorties.map((x) => (
          <button
            key={x.id}
            type="button"
            ref={pin(`sortie:${x.id}`)}
            className="pc-planche-pin pc-pl-tower"
            data-sortie-pin={x.id}
            data-dark="true"
            onClick={() => {
              pick(null);
              setMareeOpen(true);
              if (online) void loadMaree();
            }}
          >
            <b>
              {x.captain} sort · {new Date(x.at).getUTCHours()} h
            </b>
          </button>
        ))}
        {(S.noir?.straits ?? []).map((x) => (
          <button
            key={x.id}
            type="button"
            ref={pin(`noir:${x.id}`)}
            className="pc-planche-pin pc-pl-tower"
            data-noir-pin={x.id}
            data-dark="true"
            data-black="true"
            onClick={() => pick({ kind: "noir", id: x.id })}
          >
            <b>
              {x.name.replace(/^Le détroit d[eu] ?/, "")} · {x.captain}
            </b>
          </button>
        ))}
        {(S.muda?.straits ?? []).map((x) => (
          <button
            key={x.id}
            type="button"
            ref={pin(`muda:${x.id}`)}
            className="pc-planche-pin pc-pl-tower"
            data-muda-pin={x.id}
            data-dark={String(!state.muda?.straits[x.id]?.by)}
            onClick={() => {
              pick(null);
              setMudaOpen(true);
            }}
          >
            <b>{x.name}</b>
          </button>
        ))}
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
              {view?.compagnies?.[h.id] ? (
                <span
                  className="pc-co-pin"
                  title={view.compagnies[h.id]?.name}
                  data-house-compagnie
                >
                  <HouseFlag
                    color={view.compagnies[h.id]?.flag.color}
                    symbol={view.compagnies[h.id]?.flag.symbol}
                    size={16}
                  />
                </span>
              ) : h.id === ME ? null : (
                <Flag tone={robot ? "robot" : "player"} />
              )}
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
          ) : null}
          {online && playing && ME ? (
            <button
              type="button"
              className="pc-pl-jour pc-pl-war"
              data-compagnie-open
              onClick={() => {
                pick(null);
                setCompOpen(true);
              }}
            >
              {view?.compagnies?.[ME] ? (
                <HouseFlag
                  color={view.compagnies[ME].flag.color}
                  symbol={view.compagnies[ME].flag.symbol}
                  size={18}
                />
              ) : (
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="7" cy="7" r="3.2" fill="#17150f" />
                  <circle cx="13.5" cy="7.5" r="2.6" fill="#6b645c" />
                  <path d="M2 17 C2 12 12 12 12 17 Z M10 17 C10 13 18 13 18 17 Z" fill="#17150f" />
                </svg>
              )}
              <span>{view?.compagnies?.[ME]?.name ?? "Compagnie"}</span>
            </button>
          ) : null}
          {online && S.guerre && playing && ME ? (
            <button
              type="button"
              className="pc-pl-jour pc-pl-war"
              data-guerre-open
              onClick={() => {
                pick(null);
                void loadWar().then(() => setWarOpen(true));
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M4 18 V3 M4 3 H15 L12 7 L15 11 H4"
                  fill="#C8102E"
                  stroke="#17150f"
                  strokeWidth="1.6"
                />
              </svg>
              <span>La Guerre</span>
            </button>
          ) : null}
          {S.encre && playing && ME ? (
            <button
              type="button"
              className="pc-pl-jour pc-pl-war"
              data-maree-open
              onClick={() => {
                pick(null);
                setMareeOpen(true);
                if (online) void loadMaree();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2 8 Q6 4 10 8 T18 8" stroke="#17150f" strokeWidth="1.8" fill="none" />
                <path d="M2 14 Q6 10 10 14 T18 14 V18 H2 Z" fill="#17150f" />
              </svg>
              <span>Marée · sem. {state.rank.week + 1}</span>
            </button>
          ) : null}
          {S.muda && playing && ME ? (
            <button
              type="button"
              className="pc-pl-jour pc-pl-war"
              data-muda-open
              data-phase={plancheMudaPhase(S, state.now)}
              onClick={() => {
                pick(null);
                setMudaOpen(true);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2 12 H18 L15.5 17 H4.5 Z" fill="#17150f" />
                <path
                  d="M10 2 V12 M10 3 Q15 6 10 10"
                  stroke="#17150f"
                  strokeWidth="1.6"
                  fill="#C8102E"
                />
              </svg>
              <span>La Muda</span>
            </button>
          ) : null}
          {online && S.muda && playing && ME ? (
            <button
              type="button"
              className="pc-pl-jour pc-pl-war"
              data-gazette-open
              onClick={() => {
                pick(null);
                void loadGazette();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                <rect
                  x="3"
                  y="3"
                  width="14"
                  height="14"
                  rx="1.5"
                  fill="#F6F4F0"
                  stroke="#17150f"
                  strokeWidth="1.6"
                />
                <path d="M6 7 H14 M6 10 H14 M6 13 H11" stroke="#17150f" strokeWidth="1.4" />
              </svg>
              <span>La Gazette</span>
            </button>
          ) : null}
          {daily && playing && ME ? (
            <button
              type="button"
              className="pc-pl-jour"
              data-daily
              data-done={dailyMine ? (dailyMine.won ? "won" : "lost") : "no"}
              aria-label={
                dailyMine
                  ? dailyMine.won
                    ? "Problème du jour réussi"
                    : "Problème du jour joué"
                  : "Le problème du jour, pas encore joué"
              }
              onClick={() => {
                pick(null);
                setGrowth("jour");
              }}
            >
              <Knot size={phone ? 18 : 20} />
              <span>{dailyMine ? (dailyMine.won ? "Réussi" : "Joué") : "Problème du jour"}</span>
            </button>
          ) : null}
          {online ? null : (
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
        {compOpen && ME ? (
          <CompagnieSheet
            close={closeX}
            goods={S.goods}
            stock={state.houses[ME]?.stock ?? {}}
            signs={view?.signs ?? []}
            onSaid={setSaid}
            onChange={() => void call()}
          />
        ) : null}
        {warOpen && war ? (
          <>
            {war.running ? (
              <div className="pc-pl-acts">
                <button
                  type="button"
                  className="pc-passe-go"
                  data-guerre-resume
                  onClick={() =>
                    war.running &&
                    setWarAssault({
                      target: war.running.target,
                      start: war.running.state,
                      ile: war.running.ile,
                    })
                  }
                >
                  Reprendre l'assaut
                </button>
              </div>
            ) : null}
            <GuerreSheet
              view={war}
              close={closeX}
              armed={assautFleetOf(S, state, ME).length > 0}
              inCompany={!!view?.compagnies?.[ME]}
              onReplay={(id) =>
                void fetch(`/api/guerre/assault/${id}`, { credentials: "same-origin" })
                  .then((res) => res.json())
                  .then((j: { replay?: NonNullable<typeof replayed> }) => {
                    if (j.replay) {
                      setWarOpen(false);
                      setReplayed(j.replay);
                    } else setSaid("Cet assaut ne se revoit plus.");
                  })
              }
              onReserve={(key) =>
                void signal(
                  "/sign",
                  { kind: "attaque", target: `port:${key}` },
                  "Ta compagnie voit que tu prends ce port.",
                ).then(() => void loadWar())
              }
              onAssault={(target) =>
                void postWar("/start", { target }).then((res) => {
                  if (res.assaut) {
                    setWarOpen(false);
                    setWarAssault({ target, start: res.assaut, ile: res.ile ?? null });
                  } else setSaid(SAID[res.error ?? ""] ?? "Cet assaut n'est pas possible.");
                })
              }
            />
          </>
        ) : null}
        {armory === "arsenal" && ME ? (
          <ArsenalSheet
            setup={S}
            state={state}
            house={ME}
            close={closeX}
            first={!arsenalSeen}
            onShip={(kind) => {
              if (!arsenalSeen) {
                setArsenalSeen(true);
                try {
                  localStorage.setItem("fondaco.arsenal.seen", "1");
                } catch {
                  // A private window: the first visit is told again.
                }
              }
              act(
                () => plancheShip(S, state, ME, kind, state.now),
                `${S.arsenal?.ships[kind]?.name} en chantier.`,
                ["/arsenal/ship", { kind }],
              );
            }}
            onRepair={(id) =>
              act(
                () => plancheShipRepair(S, state, ME, id, state.now),
                "Le navire est en réparation.",
                ["/arsenal/repair", { id }],
              )
            }
            onRefit={(id) =>
              act(
                () => plancheShipRefit(S, state, ME, id, state.now),
                "Navire refondu : une part de ses marchandises revient à l'entrepôt.",
                ["/arsenal/refit", { id }],
              )
            }
            onPort={() => setArmory("port")}
            onTrain={
              S.guerre?.training
                ? () => {
                    pick(null);
                    setTraining(true);
                  }
                : undefined
            }
          />
        ) : null}
        {armory === "port" && ME ? (
          <PortSheet
            setup={S}
            state={state}
            house={ME}
            close={closeX}
            onBuild={(pass, kind) =>
              act(
                () => plancheDefense(S, state, ME, pass, kind),
                `${S.arsenal?.port.defenses[kind]?.name} posée.`,
                ["/port/build", { pass, kind }],
              )
            }
            onMove={(from, index, to) =>
              act(() => plancheDefenseMove(S, state, ME, from, index, to), "Défense déplacée.", [
                "/port/move",
                { from, index, to },
              ])
            }
            onRuses={(ruses) =>
              act(
                () => plancheRuses(S, state, ME, ruses, state.now),
                "Ruses gardées : l'assaillant ne les verra qu'en jouant.",
                ["/port/ruses", { ruses }],
              )
            }
            onRemove={(pass, index) =>
              act(
                () => plancheDefenseRemove(S, state, ME, pass, index),
                "Défense retirée : une part de ses marchandises revient à l'entrepôt.",
                ["/port/remove", { pass, index }],
              )
            }
          />
        ) : null}
        {view?.defi?.incoming ? (
          <section className="pc-planche-card pc-pl-card pc-pl-defi" data-defi-incoming>
            <div className="pc-pl-head">
              <div>
                <h2>{view.defi.incoming.name} te défie par le fil</h2>
                <span>Deux Passes en direct : chacun une fois le fil, une fois la chaîne</span>
              </div>
            </div>
            <p data-defi-cote>
              Sa cote : <b>{state.houses[view.defi.incoming.house]?.rank.cote ?? 0}</b> · la tienne
              : <b>{state.houses[ME]?.rank.cote ?? 0}</b>. Le défi est un seul match : ta cote bouge
              une fois, après les deux Passes. Rien d'autre ne se risque.
            </p>
            <div className="pc-pl-acts">
              <button
                type="button"
                className="pc-passe-go"
                data-defi-accept
                onClick={() =>
                  void call("/defi/answer", { accept: true }).then((res) =>
                    setSaid(res === "ok" ? "" : (SAID[res] ?? "Ce défi n'est plus ouvert.")),
                  )
                }
              >
                Accepter
              </button>
              <button
                type="button"
                className="pc-passe-quiet"
                data-defi-refuse
                onClick={() => void call("/defi/answer", { accept: false })}
              >
                Pas maintenant
              </button>
            </div>
          </section>
        ) : null}
        {city?.ring === "muda" ? null : cityCard}
        {passageCard}
        {chosen?.kind === "noir" && ME ? (
          <NoirSheet
            key={chosen.id}
            setup={S}
            state={state}
            me={ME}
            strait={chosen.id}
            close={closeX}
            goods={S.goods}
            onForce={(good, n) => {
              setChosen(null);
              setNoirDuel({ strait: chosen.id, good, n });
            }}
          />
        ) : null}
        {mudaOpen && ME ? (
          <MudaSheet
            setup={S}
            state={state}
            me={ME}
            close={closeX}
            goods={S.goods}
            sells={[...sells]}
            onThread={(good) => S.muda && tie(S.muda.pier, "le môle de San Marco", good)}
            onStrait={(strait) => {
              setMudaOpen(false);
              setMudaDuel(strait);
            }}
          />
        ) : null}
        {mareeOpen && ME ? (
          <MareeSheet
            setup={S}
            state={state}
            me={ME}
            view={mareeView}
            close={closeX}
            name={short}
            onSortie={(id) => {
              setMareeOpen(false);
              setSortieDuel(id);
            }}
            onSerenissime={() => {
              setMareeOpen(false);
              setSerenissime("open");
              void fetch("/api/serenissime", { credentials: "same-origin" })
                .then((res) => res.json())
                .then((j: { serenissime?: SerenissimeView }) =>
                  setSerenissime(j.serenissime ?? "open"),
                )
                .catch(() => setSaid("La Sérénissime ne répond pas."));
            }}
          />
        ) : null}
        {serenissime ? (
          <SerenissimeSheet view={serenissime === "open" ? null : serenissime} close={closeX} />
        ) : null}
        {tideEnd && ME ? (
          <TideEndSheet
            setup={S}
            state={state}
            me={ME}
            view={mareeView}
            name={short}
            close={
              <button
                type="button"
                className="pc-pl-x"
                aria-label="Fermer"
                data-maree-fin-close
                onClick={() => {
                  setTideEnd(false);
                  try {
                    localStorage.setItem("fondaco.maree.vue", mareeView?.last?.key ?? "");
                  } catch {
                    // A private window: the moment comes again.
                  }
                }}
              >
                ×
              </button>
            }
            onDecret={(choice) =>
              act(
                () => plancheDecretChoose(state, ME, choice, state.now),
                "Ton décret est proclamé : il vaut pour toute la marée.",
                ["/decret", { choice }],
              )
            }
          />
        ) : null}
        {gazette ? (
          <GazetteSheet
            gazette={gazette.issue}
            lagoon={gazette.lagoon}
            weeks={gazette.weeks}
            close={closeX}
            onWeek={(w) => void loadGazette(w)}
            onReplay={(id) =>
              void fetch(`/api/guerre/assault/${id}`, { credentials: "same-origin" })
                .then((res) => res.json())
                .then((j: { replay?: NonNullable<typeof replayed> }) => {
                  if (j.replay) {
                    setGazette(null);
                    setReplayed(j.replay);
                  } else setSaid("Seuls l'assaillant et le port assailli revoient cet assaut.");
                })
            }
          />
        ) : null}
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
            extra={
              <Reliques
                setup={S}
                relics={me?.relics ?? maison.relics ?? {}}
                plans={me?.plans ?? maison.plans ?? 0}
                onAssemble={(power) =>
                  act(
                    () => plancheAssemble(S, state, ME, power, state.now),
                    "Un plan est assemblé : il ouvre un haut ouvrage.",
                    ["/assemble", { power }],
                  )
                }
              />
            }
          />
        ) : null}
        {growth === "jour" && daily ? (
          <section className="pc-planche-card pc-pl-card pc-pl-daily" data-daily-card>
            <div className="pc-pl-head">
              <div>
                <h2>Le problème du jour</h2>
                <span>La même position pour toute la lagune · un seul essai</span>
              </div>
              {closeX}
            </div>
            <div className="pc-pl-order">
              <Knot size={30} />
              <div>
                <b>Le fil passe en {daily.moves} coups</b>
                <span>
                  Trouve la clef : réussi, {S.daily?.prestige ?? 20} de Prestige et un nœud sur ta
                  façade pour aujourd'hui. Perdu, rien n'est pris.
                </span>
                {dailyMine ? (
                  <span data-daily-mine>
                    {dailyMine.won
                      ? `Tu l'as réussi en ${dailyMine.moves} coups. Les résultats de la lagune à minuit.`
                      : "Tu l'as joué aujourd'hui. Un autre problème demain."}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="pc-passe-go"
                    data-play-daily
                    onClick={() => {
                      setGrowth(null);
                      setDailyPlay(true);
                    }}
                  >
                    Jouer la position
                  </button>
                )}
              </div>
            </div>
            <p data-daily-yesterday>
              {yesterday.tried
                ? `Hier : ${yesterday.solved} Maison${yesterday.solved > 1 ? "s" : ""} sur ${yesterday.tried} l'${yesterday.solved > 1 ? "ont" : "a"} réussi${yesterday.best ? `, en ${yesterday.best} coups au mieux` : ""}.`
                : "Hier, personne ne l'a joué dans ta lagune."}
            </p>
          </section>
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
        {!chosen && !palace && !profil && !growth && !armory && !warOpen && !compOpen ? (
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
            void joinInvited().finally(() => setGate("in"));
          }}
        />
      ) : null}
    </div>
  );
}
