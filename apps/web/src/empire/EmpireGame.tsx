import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type Account, ApiError } from "../api.js";
import { BuildingArt } from "../art/buildings.js";
import { GoodsMark } from "../art/goods.js";
import { d, hourOf, minutesLabel } from "../game/format.js";
import { FxLayer, flyCoins, flyGoods, pressResult } from "../game/fx.js";
import { GOLD } from "../game/gold.js";
import { connectLive } from "../game/live.js";
import { Icon } from "../game/map/icons.js";
import { useOnline } from "../game/online.js";
import type { TerraView } from "../game/types.js";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { flipTotal, terraBack } from "../porcellana/flip.js";
import { FLIP } from "../porcellana/tokens.js";
import { sound } from "../sound.js";
import { applyPalette } from "../theme.js";
import { Badge, GoldLayer, Label, Ribbon, Sheet, Slab, Stat, clock } from "../ui.js";
import { suppliable } from "./Company.js";
import { CompanySheet } from "./CompanyTab.js";
import { HelpSheet, HouseSheet, Intro, NextStepCard } from "./Guide.js";
import { ArteSection, FamilySheet, Knowledge } from "./Identity.js";
import { MarketSheet } from "./Market.js";
import { CasaMoment } from "./Moment.js";
import { NewWorkshopSheet, freeTileOf } from "./NewWorkshop.js";
import { GoodSheet } from "./Resources.js";
import { Safe } from "./Safe.js";
import { StoreSheet } from "./Store.js";
import { type TerraPhase, TerraStage } from "./TerraStage.js";
import { Charroi, RegionPlace, Scuola, regionName } from "./World.js";
import { type EmpireAnswer, empireApi } from "./api.js";
import { foresee } from "./foresee.js";
import { MapControls, RemiseBar, SidePanel, TopBar, useWide } from "./hud/Desk.js";
import {
  affordable,
  buildingName,
  casaReached,
  daysOfIncome,
  queueEnd,
  readyLots,
  recipeOf,
  sitesByEnd,
} from "./logic.js";
import { ActionPanel } from "./map/ActionPanel.js";
import { BottomSlot } from "./map/BottomSlot.js";
import { FondacoGains } from "./map/Domain.js";
import { DomainBar } from "./map/Domain.js";
import { Hud } from "./map/Hud.js";
import { OrdersPanel } from "./map/OrdersPanel.js";
import { type PlaceId, PlaceTabs } from "./map/PlaceTabs.js";
import { PlacingBar } from "./map/PlacingBar.js";
import { ProductionSheet } from "./map/Production.js";
import { RoundDock } from "./map/RoundDock.js";
import type { RoundDraft } from "./map/RoundDraw.js";
import { Trips } from "./map/Trips.js";
import { VehiclePanel } from "./map/VehiclePanel.js";
import { WorkshopDock } from "./map/WorkshopDock.js";
import { measureBand } from "./map/band.js";
import { type Placing, type Target, canCasa } from "./map/logic.js";
import { planRound } from "./map/round.js";
import { MAP_3D } from "./map3d/flag.js";
import { inTutorial, nextStep } from "./next.js";
import { BattleScreen } from "./porta/Battle.js";
import type { EmpireAction, EmpireBuild, EmpirePayload } from "./types.js";

type SheetId =
  | "store"
  | "workshops"
  | "casa"
  | "market"
  | "company"
  | "company:terra"
  | "remise"
  | "new"
  | "away"
  | "family"
  | "house"
  | "help"
  | "production"
  | "production:vehicles"
  | "arms"
  | "porta"
  | `region:${string}`
  | `workshop:${string}`
  | `new:${string}`;

// The Porta's scenes in 3D, loaded only once their place is first opened: three.js and the
// figurines no longer weigh on the start of the game (audit of 4 November, 3D B1).
/** The Carte on square tiles (docs/plan-porcellana.md lot 3): its own chunk, fetched only then. */
const PorcellanaMap = lazy(() => import("../porcellana/board/PorcellanaMap.js"));
import type { EmpireMapHandle, Picked } from "../porcellana/board/PorcellanaMap.js";
const ArmsScene = lazy(() =>
  import("./porta/ArmsScene.js").then((m) => ({ default: m.ArmsScene })),
);
// The workshops' insides (docs/plan-ateliers.md lot A5), loaded at the first entry.
const InteriorScene = lazy(() =>
  import("./interior/InteriorScene.js").then((m) => ({ default: m.InteriorScene })),
);
const PortaScene = lazy(() =>
  import("./porta/PortaScene.js").then((m) => ({ default: m.PortaScene })),
);

/** True from the first time `on` is, and then for good (a scene kept mounted once loaded). */
function useOnce(on: boolean) {
  const [was, setWas] = useState(on);
  useEffect(() => {
    if (on) setWas(true);
  }, [on]);
  return was || on;
}

const t = fr.empire;
const unknownError = fr.errors.unknown ?? "";
/** A refusal's words: the empire's, else the world's of before, never a silent one (P0-11). */
const refusal = (code: string) =>
  t.errors[code] ?? (fr.game.errors as Record<string, string>)[code] ?? unknownError;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * The persistent empire (CADRAGE-v3, the socle): Venetia alone, the Casa and its workshops in
 * orbit, the building sites, the store and the Carnet of the week. Lagune: three depths (the map,
 * the place up close, the sheet below) and one gold action.
 */
/** The house was asked once to put its first fondaco down. */
const HOME_ASKED = "fondaco:home-asked";

/** The keys of a computer that move the map a step (arrows, ZQSD and WASD): which way. */
const PAN_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  q: [-1, 0],
  a: [-1, 0],
  d: [1, 0],
  z: [0, -1],
  w: [0, -1],
  s: [0, 1],
};
/** `+` and `-` zoom by this factor. */
const ZOOM_KEY = 1.4;

export function EmpireGame({ account, first }: { account: Account; first: EmpireAnswer }) {
  const [p, setP] = useState<EmpireAnswer>(first);
  // Porcellana alone in the empire (docs/plan-publication.md D9): one palette, one red accent.
  useEffect(() => applyPalette("porcellana"), []);
  const skew = useRef(first.now - Date.now());
  const [now, setNow] = useState(first.now);
  const [sheet, setSheet] = useState<SheetId | null>(first.view?.away ? "away" : null);
  const sheetNow = useRef(sheet);
  sheetNow.current = sheet;
  // The Porta's battle on screen (docs/plan-porta.md § 6).
  const [fighting, setFighting] = useState(false);
  // A battle closed to look at the map stays closed until the next.
  const [leftBattle, setLeftBattle] = useState<string | null>(null);
  // The place of the map touched, its panel open at the foot of the screen.
  const [target, setTargetRaw] = useState<Target | null>(null);
  // A workshop with its inside opens its inside, not a dock (docs/plan-ateliers.md lot A7).
  const interiorsRef = useRef<Record<string, unknown> | undefined>(undefined);
  interiorsRef.current = p.view?.interiors;
  const setTarget = useCallback((x: Target | null) => {
    if (x?.kind === "workshop" && interiorsRef.current?.[x.id]) {
      setInside(x.id);
      setTargetRaw(null);
      return;
    }
    setTargetRaw(x);
  }, []);
  // Putting a counter or the Arsenal down: the map lights the cells, a touch picks one.
  const [placing, setPlacing] = useState<Placing | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  // The vehicle chosen (after Hades' Star), and picking where to send it.
  const [vehicle, setVehicle] = useState<string | null>(null);
  // The road a delivery would take, drawn on the map while the town's dock is open.
  const [road, setRoad] = useState<{ from: string; to: string } | null>(null);
  // A vehicle just sent: a small note to follow it, for a few seconds.
  const [sent, setSent] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(null), 8_000);
    return () => clearTimeout(t);
  }, [sent]);
  const [aiming, setAiming] = useState(false);
  // The round drawn by finger (the gameplay audit, P1).
  const [round, setRound] = useState<RoundDraft | null>(null);
  const map = useRef<EmpireMapHandle>(null);
  useAwayRecap(p);
  // The screen's useful band (map/band.ts), measured after each change of what covers it.
  useEffect(() => {
    measureBand();
    const id = window.setTimeout(measureBand, 320);
    window.addEventListener("resize", measureBand);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measureBand);
    };
  });
  // A fondaco's domain plunged into (3D): its bar at the foot instead of the round buttons.
  const [domain, setDomain] = useState<string | null>(null);
  // The workshop one has stepped into (its inside over the map), if any.
  const [inside, setInside] = useState<string | null>(null);
  // Échap (and the back of Android, through the same key) leaves the inside of a workshop (P1-05).
  useEffect(() => {
    if (!inside) return;
    const away = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInside(null);
    };
    window.addEventListener("keydown", away);
    return () => window.removeEventListener("keydown", away);
  }, [inside]);
  const domainNow = useRef(domain);
  domainNow.current = domain;
  const [busy, setBusy] = useState(false);
  // On square tiles, the free tile chosen on the map to build a workshop on.
  const [buildTile, setBuildTile] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);
  // The good opened from the resource bar, and the recipe the next step points at.
  const [good, setGood] = useState<string | null>(null);
  const wide = useWide();
  // The Terraferma's own scene, and the way into it (its tiles turning over) or out.
  const [terra, setTerra] = useState<TerraPhase | null>(null);
  const terraTimer = useRef(0);
  const [highlight, setHighlight] = useState<string | null>(null);
  // The Casa reached since the last view: its moment.
  const [moment, setMoment] = useState<number | null>(null);
  const last = useRef<EmpireAnswer | null>(first);

  // The first fondaco not put down yet: the house is asked once to put it down (decision of the
  // owner, 1 November 2026); « Plus tard » keeps the world's point, the Casa's panel asks again.
  const homeUnplaced = p.view?.map?.home?.placed === false;
  useEffect(() => {
    if (!homeUnplaced) return;
    try {
      if (localStorage.getItem(HOME_ASKED)) return;
      localStorage.setItem(HOME_ASKED, "1");
    } catch {
      return;
    }
    setPicked(null);
    setPlacing({ kind: "home" });
  }, [homeUnplaced]);

  const take = useCallback((next: EmpireAnswer) => {
    const reached = casaReached(last.current, next);
    if (reached) setMoment(reached);
    last.current = next;
    skew.current = next.now - Date.now();
    setP(next);
    if (next.error) setToast(refusal(next.error));
  }, []);
  const refresh = useCallback(async () => {
    const next = await empireApi.view().catch(() => null);
    if (next && next.kind === "empire") take(next);
  }, [take]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now() + skew.current), 1000);
    const poll = setInterval(() => void refresh(), 30_000);
    const stop = connectLive(
      (m) => {
        if (m.type === "changed") void refresh();
      },
      () => undefined,
    );
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      stop();
    };
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  // Off the network: said once at the top, and the house read again as soon as it is back.
  const online = useOnline(refresh);
  // The gestures sent one after the other, in the order touched (a gesture foreseen does not wait
  // for the one before to be answered to show).
  const queue = useRef<Promise<void>>(Promise.resolve());
  const act = (a: EmpireAction): Promise<boolean> => {
    // A gesture the screen can foresee shows at once (the gameplay audit, P5): the goods fly, the
    // lots, the crates or the medal change now, and nothing waits; the server's answer replaces it.
    const before = shown.current as EmpireAnswer;
    const guess = foresee(before, a, Date.now() + skew.current);
    if (guess) {
      feel(before, guess, a);
      const next = { ...before, ...guess };
      // Two touches before the screen is drawn again: the second foresees from the first.
      shown.current = next;
      setP(next);
    } else setBusy(true);
    // Whether the server took it (a screen that says « done ✓ » says it only then).
    let ok = false;
    const run = async () => {
      try {
        const answer = await empireApi.act(a);
        ok = !answer.error;
        // The gold slab pressed is struck, or shakes (game/fx.tsx), the moment the answer comes.
        pressResult(!answer.error);
        if (!answer.error && !guess) feel(shown.current, answer, a);
        take(answer);
      } catch (err) {
        pressResult(false);
        // Not done: the screen as the server last told it.
        if (guess && last.current) setP(last.current);
        setToast(
          err instanceof ApiError
            ? refusal(err.code)
            : ((!navigator.onLine ? fr.errors.offline : fr.errors.network) ?? unknownError),
        );
      } finally {
        if (!guess) setBusy(false);
      }
    };
    queue.current = queue.current.then(run, run);
    return queue.current.then(() => ok);
  };
  // A hop arrived by the clock: the house's state settled, quietly (no wait, no error told);
  // but a delivery paid is felt: coins to the purse, their sound (audit of 4 November, motion M1).
  const settling = useRef(false);
  const shown = useRef(p);
  shown.current = p;
  const settle = useCallback(() => {
    if (settling.current) return;
    settling.current = true;
    window.setTimeout(() => {
      empireApi
        .act({ type: "empireSettle" })
        .then((answer) => {
          if (answer.error) return;
          feel(shown.current, answer);
          take(answer);
        })
        .catch(() => undefined)
        .finally(() => {
          settling.current = false;
        });
    }, 400);
  }, [take]);
  // The next hop's arrival: settled at its hour, so that a delivery is paid as the vehicle comes
  // (the welcome's first order among them, docs/plan-premiers-pas.md lot 2).
  const arrival = (p.view?.vehicles?.mine ?? [])
    .flatMap((v) => v.legs.map((l) => l.arrivesAt))
    .filter((t) => t > p.now)
    .reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
  // A hop already due (the page was closed, or offline, when it came): settled at once.
  const due = (p.view?.vehicles?.mine ?? []).some((v) => v.legs.some((l) => l.arrivesAt <= p.now));
  useEffect(() => {
    if (due) settle();
  }, [due, settle]);
  useEffect(() => {
    const back = () => settle();
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, [settle]);
  useEffect(() => {
    if (!Number.isFinite(arrival)) return;
    const wait = Math.max(0, arrival - (Date.now() + skew.current)) + 300;
    if (wait > 2 ** 31 - 1) return;
    const id = window.setTimeout(settle, wait);
    return () => window.clearTimeout(id);
  }, [arrival, settle]);
  /** The vehicle before or after the one chosen. */
  const cycle = (step: 1 | -1) => {
    const mine = p.view?.vehicles.mine ?? [];
    if (mine.length === 0) return;
    const i = mine.findIndex((v) => v.id === vehicle);
    const next = mine[(i + step + mine.length) % mine.length];
    if (!next) return;
    setVehicle(next.id);
    setAiming(false);
    setTarget({ kind: "vehicle", id: next.id });
  };
  // On a computer (after Hades' Star's keys): Échap lets go, the comma and the period go from a
  // vehicle to the one before or after.
  const targetNow = useRef(target);
  targetNow.current = target;
  const keys = useRef({ cycle, aiming });
  keys.current = { cycle, aiming };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") {
        if (keys.current.aiming) setAiming(false);
        // A sheet open closes by itself; the domain is left only from the map.
        else if (domainNow.current && !targetNow.current && !sheetNow.current) map.current?.leave();
        else {
          setTargetRaw(null);
          setVehicle(null);
        }
      } else if (e.key === ",") keys.current.cycle(-1);
      else if (e.key === ".") keys.current.cycle(1);
      else if (e.key === "Alt") {
        // The information layer while Alt is held (after Hades' Star's tilde), never the
        // browser's menu.
        e.preventDefault();
        map.current?.info(true);
      } else if (e.key === "+" || e.key === "=") map.current?.zoom(ZOOM_KEY);
      else if (e.key === "-") map.current?.zoom(1 / ZOOM_KEY);
      else {
        const step = PAN_KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
        if (!step || e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        map.current?.pan(step[0], step[1]);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Alt") map.current?.info(false);
    };
    const off = () => map.current?.info(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", off);
    };
  }, []);
  /** « Livrer » from a city: the orders chosen go; the camera stays on the city. */
  const deliver = (city: string, orderIds: string[], vehicleId: string | null) => {
    const v = p.view?.vehicles.mine.find((x) => x.id === vehicleId);
    void act({ type: "empireDeliverCity", city, orderIds }).then(() => {
      setTarget(null);
      if (v) setSent({ id: v.id, name: t.vehicleNames[v.type] ?? v.type });
    });
  };
  /** A round drawn by finger, sent: its towns' orders loaded, the vehicle off at once. */
  const goRound = (r: RoundDraft) => {
    setRound(null);
    const plan = planRound(p, r.vehicleId, r.cities);
    if (plan.stops.length === 0 || !plan.vehicle) return;
    const v = plan.vehicle;
    void act({
      type: "empireRound",
      vehicleId: r.vehicleId,
      stops: plan.stops.map(({ city, orderIds }) => ({ city, orderIds })),
    }).then(() => setSent({ id: v.id, name: t.vehicleNames[v.type] ?? v.type }));
  };
  const join = async () => {
    setBusy(true);
    try {
      take(await empireApi.join());
    } catch {
      setToast(unknownError);
    } finally {
      setBusy(false);
    }
  };

  if (!p.joined || !p.view)
    return <Founding busy={busy} onJoin={join} name={account.pseudo ?? ""} />;
  const view = p.view;
  const close = () => setSheet(null);
  // A panel's action that opens a sheet: the panel gives way to it.
  const open = (id: string) => {
    setTarget(null);
    // A workshop from the list: its dock on the map (docs/plan-dock.md), not a sheet.
    if (id.startsWith("workshop:")) {
      setSheet(null);
      setTarget({ kind: "workshop", id: id.slice("workshop:".length) });
      return;
    }
    if (id.startsWith("place:")) {
      const [, kind = "post", region] = id.split(":");
      // On square tiles, the Remise, the Campo and the Porta rise from a free tile's list, with
      // every building (the first steps, lot 5): the nearest free tile, no bar of placing.
      if (
        (kind === "depot" || kind === "camp" || kind === "porta") &&
        p.view?.map.grid === "square"
      ) {
        setBuildTile(freeTileOf(p, "veneto") ?? undefined);
        setSheet("new");
        return;
      }
      setSheet(null);
      setPicked(null);
      // Out of a domain first: the map's sectors to pick from.
      if (domainNow.current) map.current?.leave();
      setPlacing({
        kind:
          kind === "camp" || kind === "depot" || kind === "porta" || kind === "home"
            ? kind
            : "post",
        ...(region ? { region } : {}),
      });
      map.current?.far();
      return;
    }
    setSheet(id as SheetId);
  };
  const place = async () => {
    if (!placing || !picked) return;
    await act(
      placing.kind === "camp"
        ? { type: "empireBuildCamp", cell: picked.cell }
        : placing.kind === "depot"
          ? { type: "empireBuildDepot", cell: picked.cell }
          : placing.kind === "porta"
            ? { type: "empireBuildPorta", cell: picked.cell }
            : placing.kind === "home"
              ? { type: "empirePlaceHome", ...picked }
              : { type: "empirePlaceCounter", ...picked },
    );
    setPlacing(null);
    setPicked(null);
  };
  const step = nextStep(p, now);
  const tutorial = inTutorial(p);
  // The four places at the foot (docs/plan-refonte-claire.md): where one is, and going there.
  const porta = view.porta;
  const portaCasa =
    porta && !porta.cell && porta.site && view.house.casa < porta.site.casa
      ? porta.site.casa
      : null;
  const here: PlaceId =
    sheet === "porta" || sheet === "arms"
      ? "porta"
      : sheet?.startsWith("company")
        ? "company"
        : domain
          ? "fondaco"
          : "map";
  const goPlace = (id: PlaceId) => {
    // A tab leaves any full-screen scene, the inside of a workshop first (P1-05).
    if (terra) leaveTerra();
    setInside(null);
    setTarget(null);
    setVehicle(null);
    setAiming(false);
    if (id === "map") {
      setSheet(null);
      if (domainNow.current) map.current?.leave();
      else map.current?.recenter();
    } else if (id === "fondaco") {
      setSheet(null);
      if (!domainNow.current) map.current?.home();
    } else if (id === "porta") {
      if (!porta) return;
      if (portaCasa !== null) {
        setToast(t.places.portaLocked(portaCasa));
        return;
      }
      if (porta.cell) setSheet("porta");
      else open("place:porta");
    } else setSheet("company");
  };
  // The way into the Terraferma (the owner's decision of 8 November 2026): from the Campo, the map's
  // tiles turn over, the Terraferma's land on their backs, the camera draws back, its board takes
  // over. Without WebGL or with less motion asked, a plain fade.
  const motion = () => MAP_3D && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const enterTerra = () => {
    if (terra) return;
    setSheet(null);
    setTarget(null);
    setVehicle(null);
    const seen: { v: TerraView | null } = { v: null };
    void empireApi
      .terra()
      .then((r) => {
        seen.v = r.terra?.view ?? null;
      })
      .catch(() => undefined);
    const turning = motion();
    if (turning) map.current?.flip(false, (dx, dz) => terraBack(seen.v, dx, dz));
    setTerra("in");
    window.clearTimeout(terraTimer.current);
    terraTimer.current = window.setTimeout(
      () => setTerra("open"),
      (turning ? FLIP.total : FLIP.plainFade) * 1_000,
    );
  };
  const leaveTerra = () => {
    // On a phone the map was let go under the scene: it comes back with its own arrival.
    const turning = motion() && wide;
    if (turning) map.current?.flip(true);
    setTerra("out");
    window.clearTimeout(terraTimer.current);
    terraTimer.current = window.setTimeout(
      () => setTerra(null),
      (turning ? flipTotal(true) : FLIP.plainFade) * 1_000,
    );
  };
  useEffect(() => () => window.clearTimeout(terraTimer.current), []);
  const placeDots = {
    fondaco: view.house.workshops.filter((w) => readyLots(w, now) > 0).length,
    company: claimable(p) || suppliable(p, account.id) > 0 || terraCalls(p, now),
  };
  const placeTabs = wide ? null : (
    <PlaceTabs
      active={here}
      onPlace={goPlace}
      portaCasa={portaCasa}
      dots={{
        fondaco: view.house.workshops.filter((w) => readyLots(w, now) > 0).length,
        company: claimable(p) || suppliable(p, account.id) > 0 || terraCalls(p, now),
      }}
    />
  );
  // Lorenzo, the tutorial's card (on the map's foot, and over a domain's bar).
  const guideCard = tutorial && (
    <NextStepCard
      compact
      p={p}
      now={now}
      step={step}
      busy={busy}
      act={act}
      onBuild={(recipe) => {
        setHighlight(recipe);
        // The welcome's first workshop: straight to the list of a free tile (lot 2).
        // Straight to the list of a free tile, the workshop to build lit (P0-06).
        setSheet("new");
      }}
    />
  );
  const lorenzo = tutorial && !wide && (
    <div className="w-full px-3 pb-2 lg:max-w-md">
      <NextStepCard
        compact
        p={p}
        now={now}
        step={step}
        busy={busy}
        act={act}
        onBuild={(recipe) => {
          setHighlight(recipe);
          // Straight to the list of a free tile, the workshop to build lit (P0-06).
          setSheet("new");
        }}
      />
    </div>
  );

  return (
    <Safe
      onReset={() => {
        setSheet(null);
        setTarget(null);
        setVehicle(null);
        setGood(null);
        setFighting(false);
      }}
    >
      <div className="fixed inset-0 overflow-hidden bg-night">
        {/* On a phone, the map's 3D is let go while a scene of its own covers it (the Porta, the arms,
          a battle): two WebGL scenes at once exhaust a phone's memory, its page then killed. */}
        {!(
          !wide &&
          (sheet === "porta" ||
            sheet === "arms" ||
            fighting ||
            !!p.view?.porta?.battle ||
            terra === "open")
        ) && (
          <Suspense fallback={null}>
            <PorcellanaMap
              ref={map}
              p={p}
              now={now}
              target={target}
              placing={placing}
              onPick={setPicked}
              onDomain={setDomain}
              onTarget={(x) => {
                if (placing) return;
                // The Campo: into the Terraferma, its tiles turning over.
                if (x?.kind === "terra") {
                  enterTerra();
                  return;
                }
                // A free tile of the house's: the workshops one may build there, at once.
                if (x?.kind === "free" && x.tile) {
                  setBuildTile(x.tile);
                  setSheet("new");
                  return;
                }
                if (x?.kind === "vehicle") setVehicle(x.id);
                if (!x) {
                  setVehicle(null);
                  setAiming(false);
                }
                setTarget(x);
              }}
            />
          </Suspense>
        )}
        {terra && (
          <TerraStage
            p={p}
            now={now}
            busy={busy}
            act={act}
            phase={terra}
            first={null}
            motion={motion()}
            onBack={leaveTerra}
          />
        )}

        {wide ? (
          <>
            <TopBar
              p={p}
              now={now}
              active={here}
              onPlace={goPlace}
              dots={placeDots}
              portaCasa={portaCasa}
              onHouse={() => setSheet("house")}
              onFind={(x) => setTarget(x)}
            />
            <SidePanel
              p={p}
              now={now}
              busy={busy}
              guide={guideCard || undefined}
              onTarget={(x) => setTarget(x)}
              onPlace={goPlace}
              portaCasa={portaCasa}
              onCasa={() => setSheet("casa")}
              onDeliver={deliver}
              onAll={() => setSheet("production")}
            />
            {!target && !placing && !domain && (
              <RemiseBar p={p} onGood={setGood} onStore={() => setSheet("store")} />
            )}
            <MapControls
              onRecenter={() => map.current?.recenter()}
              onZoom={(k) => map.current?.zoom(k)}
            />
          </>
        ) : (
          <>
            <Hud p={p} name={account.pseudo ?? t.title} onHouse={() => setSheet("house")} />
          </>
        )}
        <Trips
          p={p}
          now={now}
          busy={busy}
          act={act}
          onFocus={(id) => {
            setVehicle(id);
            setTarget({ kind: "vehicle", id });
          }}
        />

        {/* A vehicle just sent from a town: a note to follow it, never a sheet (docs/plan-dock.md). */}
        {sent && !target && sheet === null && (
          <output
            className="dock-in pointer-events-auto absolute inset-x-3 bottom-28 z-30 glass mx-auto flex min-h-14 max-w-md items-center gap-3 rounded-[1.5rem] py-1.5 pl-4 pr-1.5"
            data-sent={sent.id}
          >
            <span className="text-gold [&_svg]:h-6 [&_svg]:w-6">{Icon.cart()}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{t.orders.sent(sent.name)}</span>
              {(p.view?.orders ?? []).some((o) => o.orders.length > 0) && (
                <span className="truncate text-xs text-cream-dim">{t.orders.sentMore}</span>
              )}
            </span>
            <Slab
              tone="ghost"
              size="sm"
              onClick={() => {
                setVehicle(sent.id);
                setTarget({ kind: "vehicle", id: sent.id });
                setSent(null);
              }}
            >
              {t.orders.follow}
            </Slab>
          </output>
        )}

        {/* The foot of the map: the round buttons, a place's panel, or the bar of placing. */}
        <BottomSlot
          id={
            placing
              ? "placing"
              : round && !round.drawing && round.cities.length > 0
                ? "round"
                : target
                  ? `panel:${target.kind}`
                  : domain
                    ? `domain:${domain}`
                    : "idle"
          }
          hidden={sheet !== null || good !== null}
        >
          {round && !round.drawing && round.cities.length > 0 && !placing ? (
            <div className="flex w-full flex-col items-center">
              <RoundDock
                p={p}
                round={round}
                busy={busy}
                onGo={() => goRound(round)}
                onCancel={() => setRound(null)}
              />
              {placeTabs}
            </div>
          ) : placing ? (
            <PlacingBar
              p={p}
              placing={placing}
              picked={picked}
              busy={busy}
              onPlace={() => void place()}
              onCancel={() => {
                setPlacing(null);
                setPicked(null);
              }}
            />
          ) : target?.kind === "vehicle" ? (
            <VehiclePanel
              p={p}
              now={now}
              busy={busy}
              act={act}
              vehicleId={target.id}
              aiming={aiming}
              onAim={setAiming}
              onCycle={cycle}
              onClose={() => {
                setTarget(null);
                setVehicle(null);
                setAiming(false);
              }}
            />
          ) : target?.kind === "city" && p.view?.orders.some((o) => o.city === target.code) ? (
            <OrdersPanel
              p={p}
              now={now}
              busy={busy}
              city={target.code}
              onDeliver={(ids, vehicleId) => deliver(target.code, ids, vehicleId)}
              onClose={() => setTarget(null)}
              onCity={(code) => setTarget({ kind: "city", code })}
              onWorkshop={(id) => setTarget({ kind: "workshop", id })}
              onOpen={open}
              onPlan={setRoad}
            />
          ) : target?.kind === "workshop" ? (
            <WorkshopDock
              p={p}
              now={now}
              busy={busy}
              act={act}
              workshopId={target.id}
              onWorkshop={(id) => setTarget({ kind: "workshop", id })}
              onOpen={open}
              onClose={() => setTarget(null)}
            />
          ) : target ? (
            <ActionPanel
              p={p}
              target={target}
              now={now}
              busy={busy}
              act={act}
              onOpen={open}
              onClose={() => setTarget(null)}
            />
          ) : domain ? (
            <div className="flex w-full flex-col items-center">
              {lorenzo}
              <DomainBar
                p={p}
                now={now}
                busy={busy}
                region={domain}
                act={act}
                onBack={() => map.current?.leave()}
                onProduction={() => setSheet("production")}
                onStore={() => setSheet("store")}
                onCasa={() => setSheet("casa")}
                guided={tutorial}
                // The quay (the refonte claire, lot 3): the Remise once it stands, else the
                // Production's vehicles, which say where to put it.
                onQuay={() => setSheet(view.map.depot ? "remise" : "production:vehicles")}
                onArms={
                  porta && portaCasa === null && (porta.site || porta.cell)
                    ? () => setSheet("arms")
                    : undefined
                }
              />
              {placeTabs}
            </div>
          ) : (
            <>
              {/* Lorenzo, the tutorial's: until the Casa 2 he says the next gesture, and its gold
                button does it; then he withdraws behind the « ? », and the three milestones keep
                the way in sight (audit of 4 November, UX B2), each opening its place. */}
              {lorenzo}
              {placeTabs}
            </>
          )}
        </BottomSlot>

        <HelpSheet p={p} now={now} step={step} open={sheet === "help"} onClose={close} />
        <WorkshopsSheet
          p={p}
          now={now}
          sheet={sheet}
          busy={busy}
          onClose={close}
          onOpen={setSheet}
          act={act}
        />
        <NewWorkshopSheet
          p={p}
          highlight={highlight}
          open={sheet === "new" || sheet?.startsWith("new:") === true}
          region={sheet?.startsWith("new:") ? sheet.slice(4) : "veneto"}
          busy={busy}
          onClose={() => {
            setBuildTile(undefined);
            close();
          }}
          act={act}
          tile={buildTile}
        />
        <ProductionSheet
          p={p}
          now={now}
          open={sheet?.startsWith("production") === true}
          pane={sheet === "production:vehicles" ? "vehicles" : "buildings"}
          highlight={highlight}
          onPlace={(kind) => open(`place:${kind}`)}
          onRemise={() => setSheet("remise")}
          busy={busy}
          onClose={close}
          act={act}
        />
        {sheet?.startsWith("region:") && (
          <Sheet open onClose={close} kicker={t.world.map} title={regionName(sheet.slice(7))}>
            <RegionPlace
              p={p}
              code={sheet.slice(7)}
              now={now}
              busy={busy}
              act={act}
              onBuild={() => setSheet(`new:${sheet.slice(7)}`)}
              onPlace={() => open(`place:post:${sheet.slice(7)}`)}
            />
          </Sheet>
        )}
        {/* The Remise: the only place where the vehicles are bought, raised and sent (1 November). */}
        <Sheet
          open={sheet === "remise"}
          onClose={close}
          kicker={t.scene.owner}
          title={t.scene.depot}
        >
          <div data-remise>
            <Charroi p={p} now={now} busy={busy} act={act} />
          </div>
        </Sheet>
        <CasaSheet
          p={p}
          now={now}
          open={sheet === "casa"}
          busy={busy}
          canCasa={canCasa(p)}
          onClose={close}
          act={act}
        />
        <MarketSheet
          p={p}
          now={now}
          open={sheet === "market"}
          busy={busy}
          onClose={close}
          onGood={setGood}
          act={act}
        />
        <CompanySheet
          p={p}
          now={now}
          open={sheet?.startsWith("company") === true}
          pane={sheet === "company:terra" ? "terra" : undefined}
          busy={busy}
          calls={{
            carnet: claimable(p),
            company: suppliable(p, account.id) > 0,
            terra: terraCalls(p, now),
          }}
          onClose={close}
          act={act}
          onPlaceCamp={() => open("place:camp")}
          onEnterTerra={enterTerra}
        />
        <FamilySheet p={p} open={sheet === "family"} busy={busy} onClose={close} act={act}>
          <ArteSection p={p} busy={busy} act={act} />
          <Scuola p={p} busy={busy} act={act} />
          <Knowledge p={p} busy={busy} act={act} />
        </FamilySheet>
        <GoodSheet p={p} good={good} busy={busy} onClose={() => setGood(null)} act={act} />
        <HouseSheet
          p={p}
          open={sheet === "house"}
          onClose={close}
          onFamily={() => setSheet("family")}
          onMarket={() => setSheet("market")}
          onHelp={tutorial ? undefined : () => setSheet("help")}
          familyCalls={familyCalls(p)}
          busy={busy}
          act={act}
        />
        {/* Over everything, the sheets included (on the body, as they are): the welcome, the toast,
          the moment of a Casa, the goods and coins in flight. */}
        {createPortal(
          <>
            <Intro p={p} />
            {!online && (
              <output
                className="fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[65] mx-auto flex w-fit items-center gap-2 rounded-full bg-night-4/95 px-4 py-2 text-sm font-semibold text-cream shadow-lg ring-1 ring-edge"
                data-offline
              >
                <span className="h-2 w-2 rounded-full bg-vermilion" aria-hidden="true" />
                {fr.errors.offline ?? ""}
              </output>
            )}
            {toast && (
              <output className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[70] lg:top-28 mx-auto block max-w-sm animate-fade bg-night-4 px-4 py-3 text-center text-sm text-cream shadow-lg slab">
                {toast}
              </output>
            )}
            <FxLayer />
          </>,
          document.body,
        )}
        {moment !== null && (
          <CasaMoment
            level={moment}
            opens={p.casa.find((c) => c.level === moment)?.opens ?? []}
            onClose={() => setMoment(null)}
          />
        )}
        <AwaySheet p={p} open={sheet === "away"} busy={busy} onClose={close} act={act} />
        <StoreSheet
          p={p}
          open={sheet === "store"}
          onClose={close}
          onGood={(g) => {
            setSheet(null);
            setGood(g);
          }}
        />
        {/* The Remise's arms and the Porta: their scene and their dock; without WebGL, the same dock
          over a plain ground (docs/plan-dock.md, lot 6). */}
        <LazyArms p={p} open={sheet === "arms"} busy={busy} onClose={close} act={act} />
        {inside ? (
          <GoldLayer depth={GOLD.scene}>
            <Suspense fallback={null}>
              <InteriorScene
                p={p}
                workshopId={inside}
                now={now}
                busy={busy}
                act={act}
                onClose={() => setInside(null)}
              />
            </Suspense>
          </GoldLayer>
        ) : null}
        <PortaPlace
          p={p}
          now={now}
          open={sheet === "porta"}
          busy={busy}
          onClose={close}
          act={act}
          onBattle={() => {
            setSheet(null);
            setFighting(true);
          }}
        />
        {/* The four places stay at the foot over the Porta and the Company (the gameplay audit, P5):
          those are places, left by the bar, no more by a cross only. */}
        {!wide &&
          (sheet === "porta" || sheet?.startsWith("company") === true) &&
          createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[45]" data-places-over>
              {placeTabs}
            </div>,
            document.body,
          )}
        {(fighting || (p.view?.porta?.battle && p.view.porta.battle.id !== leftBattle)) && (
          <BattleScreen
            onClose={() => {
              setFighting(false);
              setLeftBattle(p.view?.porta?.battle?.id ?? null);
              void refresh();
            }}
          />
        )}
      </div>
    </Safe>
  );
}

/** The week's Terraferma calls: entries open and the house in no theatre yet. */
const terraCalls = (p: EmpirePayload, now: number) => {
  const tv = p.view?.terra;
  return (
    !!tv && !tv.contesa && !tv.theatre && tv.placementUntil !== null && now < tv.placementUntil
  );
};

/**
 * The gesture answers (lot A of the UX audit): the goods gained fly to the resource bar, the
 * ducats to the purse, with the sound and the touch of the monthly game.
 */
/**
 * What an answer is felt as (audit of 4 November, motion M3): goods gathered fly to the store with
 * their sound, coins earned to the purse with theirs; a purchase (goods in, ducats out) is a stamp,
 * not a harvest; a vehicle that leaves, its cart. Each once, at the answer.
 */
function feel(before: EmpirePayload, after: EmpirePayload, action?: EmpireAction) {
  const gains: Record<string, number> = {};
  for (const [g, n] of Object.entries(after.stock)) {
    const more = n - (before.stock[g] ?? 0);
    if (more > 0 && !g.includes(":")) gains[g] = more;
  }
  const coins = BigInt(after.cash) - BigInt(before.cash);
  const goods = Object.keys(gains).length > 0;
  if (action?.type === "empireDeliverCity" || action?.type === "empireMove") {
    sound("cart");
    haptic("tap");
  } else if (goods && coins < 0n) {
    flyGoods(gains);
    sound("stamp");
    haptic("tap");
  } else if (goods) {
    flyGoods(gains);
    sound("harvest");
  }
  if (coins > 0n) {
    flyCoins(coins);
    sound("coin");
  }
  if (coins > 0n || (goods && coins >= 0n)) haptic("success");
}

/** A trait to take or a path to choose waits in the family. */
const familyCalls = (p: EmpirePayload) => {
  const id = p.view?.identity;
  return (
    !!id &&
    (id.family.heritage > id.family.lineage.length || id.staff.members.some((m) => m.tiersOpen > 0))
  );
};

const claimable = (p: EmpirePayload) =>
  [...(p.view?.carnet.objectives ?? []), ...(p.view?.carnet.carried ?? [])].some(
    (o) => !o.claimed && o.progress >= o.target,
  );

function Founding({ busy, onJoin, name }: { busy: boolean; onJoin: () => void; name: string }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-night px-6 text-center">
      <Label>{t.join.kicker}</Label>
      <h1 className="font-display text-3xl font-extrabold text-cream">{t.join.title}</h1>
      {name && <p className="font-display text-lg text-gold">{name}</p>}
      <p className="max-w-sm text-cream-dim">{t.join.text}</p>
      <Slab tone="gold" size="lg" busy={busy} onClick={onJoin}>
        {t.join.action}
      </Slab>
    </main>
  );
}

function siteLabel(p: EmpirePayload, b: EmpireBuild): string {
  if (b.kind === "casa") return t.sites.casa(b.level);
  if (b.kind === "newWorkshop") return t.sites.newWorkshop(buildingName(p, b.workshopType ?? ""));
  if (b.kind === "depot") return t.sites.depot(b.level);
  if (b.kind === "ship")
    return t.sites.ship(t.vehicleNames[b.vehicleType ?? ""] ?? b.vehicleType ?? "");
  const ws = p.view?.house.workshops.find((w) => w.id === b.workshopId);
  return t.sites.upgrade(buildingName(p, ws?.type ?? ""), b.level);
}

/** The building sites under way, each with its time left, and the free ones. */
function Sites({
  p,
  now,
  busy = false,
  act,
}: {
  p: EmpirePayload;
  now: number;
  busy?: boolean;
  act?: (a: EmpireAction) => Promise<unknown>;
}) {
  const view = p.view;
  if (!view) return null;
  // The Favour's use (D2 of the publication plan): the soonest site's time halved.
  const haste = view.hasteFavour ?? null;
  const sites = sitesByEnd(view.house.builds);
  const free = view.buildSlots - sites.length;
  return (
    <section className="mb-4">
      <div className="flex items-baseline justify-between">
        <Label>{t.sites.title}</Label>
        <span className="text-xs text-cream-dim">{free > 0 ? t.sites.free(free) : ""}</span>
      </div>
      {sites.length === 0 ? (
        <p className="mt-1 text-sm text-cream-dim">{t.sites.none}</p>
      ) : (
        <ul className="mt-1 space-y-2">
          {sites.map((b) => (
            <li
              key={`${b.kind}:${b.workshopId ?? ""}:${b.level}`}
              className="cut bg-night-2 px-3 py-2 ring-1 ring-inset ring-line/70"
            >
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-cream">{siteLabel(p, b)}</span>
                <span className="font-display font-bold tabular-nums text-cream">
                  {clock(b.endsAt - now)}
                </span>
              </div>
              <Ribbon value={(now - b.startedAt) / Math.max(1, b.endsAt - b.startedAt)} />
              {act && b === sites[0] && haste !== null && (
                <button
                  type="button"
                  disabled={busy || view.house.favour < haste}
                  onClick={() => void act({ type: "empireHaste" })}
                  className="mt-2 min-h-11 w-full rounded-full bg-night-4 text-sm font-bold text-cream disabled:opacity-40"
                  data-haste
                >
                  {t.sites.haste(haste)}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface SheetProps {
  p: EmpirePayload;
  busy: boolean;
  onClose: () => void;
  act: (a: EmpireAction) => Promise<unknown>;
}

/** The Ateliers tab: each workshop, then the store and Venetia's market. */
function WorkshopsSheet({
  p,
  now,
  sheet,
  busy,
  onClose,
  onOpen,
  act,
}: SheetProps & { now: number; sheet: SheetId | null; onOpen: (s: SheetId) => void }) {
  const view = p.view;
  if (!view) return null;
  // All the workshops; one of them opens its dock on the map (docs/plan-dock.md).
  const list = view.house.workshops;
  return (
    <Sheet
      open={sheet === "workshops"}
      onClose={onClose}
      kicker={t.region}
      title={t.tabs.workshops}
      summary={t.workshop.queueRule}
    >
      <ul className="space-y-3">
        {list.map((ws) => {
          const r = recipeOf(p, ws);
          const ready = readyLots(ws, now);
          const end = queueEnd(ws);
          const up = view.upgrades[ws.id] ?? null;
          const building = view.house.builds.some((b) => b.workshopId === ws.id);
          return (
            <li key={ws.id} className="cut bg-night-2 p-3 ring-1 ring-inset ring-line/70">
              <div className="flex items-center gap-3">
                <BuildingArt
                  type={ws.type}
                  active={!!end && end > now}
                  className="h-14 w-20 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold text-cream">
                    {buildingName(p, ws.type)}
                  </p>
                  <p className="text-xs text-cream-dim">
                    {t.workshop.level(ws.level)} ·{" "}
                    {ready > 0
                      ? t.workshop.ready(ready)
                      : end && end > now
                        ? t.workshop.queue(hourOf(end))
                        : t.workshop.idle}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-11 px-2 text-xs font-semibold text-info"
                  onClick={() => onOpen(`workshop:${ws.id}`)}
                  data-open-workshop={ws.id}
                >
                  {t.workshop.open}
                </button>
              </div>
              {/* The queue as a ribbon: its share of the hours still to run. */}
              {end && end > now && (
                <Ribbon
                  value={Math.min(1, (end - now) / ((p.view?.queueHours ?? 12) * 3_600_000))}
                />
              )}
              {r && (
                <p className="mt-2 text-xs text-cream-dim">
                  {t.workshop.makes}{" "}
                  {Object.entries(r.outputs)
                    .map(([g, n]) => `${n} ${goodName(p, g)}`)
                    .join(", ")}
                  {Object.keys(r.inputs).length > 0 &&
                    ` · ${t.workshop.from} ${Object.entries(r.inputs)
                      .map(([g, n]) => `${n} ${goodName(p, g)}`)
                      .join(", ")}`}
                  {` · ${minutesLabel(r.minutes)}`}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Slab
                  size="sm"
                  tone="ghost"
                  busy={busy}
                  onClick={() => void act({ type: "empireRelaunch", workshopId: ws.id })}
                >
                  {t.workshop.relaunch}
                </Slab>
                {building ? (
                  <Badge>{t.workshop.building}</Badge>
                ) : up ? (
                  <Slab
                    size="sm"
                    tone="ghost"
                    busy={busy}
                    disabled={!affordable(p.cash, up.cost)}
                    onClick={() => void act({ type: "empireUpgrade", workshopId: ws.id })}
                  >
                    {t.workshop.upgrade(up.level)} ·{" "}
                    {t.workshop.upgradeCost(d(up.cost), minutesLabel(up.minutes))}
                  </Slab>
                ) : (
                  <Badge>{t.workshop.atCasaShort}</Badge>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/** The Casa tab: the next step, its cost in days of income, its materials, what it asks and opens. */
function CasaSheet({
  p,
  open,
  busy,
  now,
  canCasa,
  onClose,
  act,
}: SheetProps & { now: number; open: boolean; canCasa: boolean }) {
  const view = p.view;
  if (!view) return null;
  const next = view.nextCasa;
  const days = next ? daysOfIncome(next.cost, view.incomePerDay) : null;
  const opensName = (code: string) => t.casa.opensNames[code] ?? code;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      kicker={t.casa.kicker}
      title={t.casa.title(view.house.casa)}
      summary={next ? undefined : t.casa.top}
    >
      <Sites p={p} now={now} busy={busy} act={act} />
      {next && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t.casa.cost} value={d(next.cost)} tone="gold" />
            <Stat label={t.casa.site} value={minutesLabel(next.minutes)} />
          </div>
          <p className="text-sm text-cream-dim">
            {days === null ? t.casa.noIncome : t.casa.days(days.toLocaleString())}
          </p>
          {next.cutBps > 0 && (
            <Badge tone="lagoon">{t.casa.knowledge(Math.round(next.cutBps / 100))}</Badge>
          )}
          {Object.keys(next.materials).length > 0 && (
            <div>
              <Label>{t.casa.materials}</Label>
              <ul className="mt-1 flex flex-wrap gap-3">
                {Object.entries(next.materials).map(([g, n]) => (
                  <li
                    key={g}
                    className={`flex items-center gap-1.5 text-sm ${(p.stock[g] ?? 0) >= n ? "text-cream" : "text-vermilion"}`}
                  >
                    <GoodsMark code={g} size={20} />
                    {Math.min(p.stock[g] ?? 0, n)}/{n} {goodName(p, g)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {next.requires.workshops > 0 && (
            <p className={`text-sm ${next.requirementMet ? "text-cream-dim" : "text-vermilion"}`}>
              {t.casa.requires(next.requires.workshops, next.requires.level)}
              {!next.requirementMet && ` · ${t.casa.requiresMissing}`}
            </p>
          )}
          {next.opens.length > 0 && (
            <div>
              <Label>{t.casa.opens}</Label>
              <p className="mt-1 text-sm text-cream">{next.opens.map(opensName).join(" · ")}</p>
            </div>
          )}
          {/* What the level brings the Fondaco: its stock, its zone (the first steps, lot 3). */}
          <div>
            <Label>{fr.empire.fondaco.gainsTitle}</Label>
            <p className="mt-1">
              <FondacoGains p={p} />
            </p>
          </div>
          {!canCasa && !view.house.builds.some((b) => b.kind === "casa") && (
            // Why the button is grey, in words (the players' audit, P1-12).
            <p className="text-sm font-semibold text-vermilion" data-casa-missing>
              {t.casa.missing(
                [
                  BigInt(p.cash) < BigInt(next.cost)
                    ? d(String(BigInt(next.cost) - BigInt(p.cash)))
                    : null,
                  ...Object.entries(next.materials)
                    .filter(([g, n]) => (p.stock[g] ?? 0) < n)
                    .map(([g, n]) => `${n - (p.stock[g] ?? 0)} ${goodName(p, g).toLowerCase()}`),
                  next.requirementMet ? null : t.casa.requiresMissing,
                ]
                  .filter(Boolean)
                  .join(", "),
              )}
            </p>
          )}
          {view.house.builds.some((b) => b.kind === "casa") ? (
            <p className="text-sm text-cream-dim">{t.casa.busy}</p>
          ) : (
            <Slab
              tone="gold"
              size="lg"
              className="w-full"
              busy={busy}
              disabled={!canCasa}
              onClick={() => void act({ type: "empireBuildCasa" })}
            >
              {t.casa.action(next.level)}
            </Slab>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** The merchant's return: what the queues made and the sites that ended while away. */
function AwaySheet({ p, open, busy, onClose, act }: SheetProps & { open: boolean }) {
  const away = p.view?.away;
  if (!away) return null;
  const ready = Object.entries(away.ready).filter(([, n]) => n > 0);
  const waiting = (p.view?.orders ?? []).reduce((n, c) => n + c.orders.length, 0);
  return (
    <Sheet open={open} onClose={onClose} kicker={t.away.kicker} title={t.away.title}>
      {ready.length > 0 && (
        <>
          <Label>{t.away.ready}</Label>
          <ul className="mt-1 flex flex-wrap gap-3">
            {ready.map(([g, n]) => (
              <li key={g} className="flex items-center gap-1.5 text-sm text-cream">
                <GoodsMark code={g} size={22} /> {n} {goodName(p, g)}
              </li>
            ))}
          </ul>
        </>
      )}
      {away.sitesDone > 0 && (
        <p className="mt-3 text-sm text-cream">{t.away.sites(away.sitesDone)}</p>
      )}
      {waiting > 0 && (
        <p className="mt-3 text-sm font-semibold text-cream" data-away-orders>
          {t.away.orders(waiting)}
        </p>
      )}
      <Slab
        tone="gold"
        size="lg"
        className="mt-4 w-full"
        busy={busy}
        onClick={() => {
          void act({ type: "empireRelaunchAll" }).then(onClose);
        }}
      >
        {t.away.action}
      </Slab>
    </Sheet>
  );
}

/** When the player last saw the house (server time), for the deliveries made while away. */
const SEEN = "fondaco:seen";

/**
 * Back from away (decision of the owner, 3 November 2026): the deliveries brought meanwhile played
 * again in three seconds, their ducats flying from each town to the purse.
 */
function useAwayRecap(p: EmpirePayload) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !p.view) return;
    done.current = true;
    let last = 0;
    try {
      last = Number(window.localStorage.getItem(SEEN) ?? 0);
    } catch {
      return;
    }
    const missed = (p.view.delivered ?? []).filter((x) => x.at > last && x.at <= p.now).slice(-6);
    // Played once (never cut by the next refresh of the house).
    missed.forEach((x, i) =>
      window.setTimeout(
        () =>
          flyCoins(BigInt(x.pay), {
            note: fr.empire.cityNames[x.city] ?? x.city,
            from: `[data-city=${x.city}]`,
          }),
        900 + (i * 2_400) / Math.max(1, missed.length),
      ),
    );
  }, [p]);
  useEffect(() => {
    if (!done.current) return;
    try {
      window.localStorage.setItem(SEEN, String(p.now));
    } catch {
      // Without storage, no recap next time.
    }
  }, [p.now]);
}

/**
 * The Porta: its scene and its dock (docs/plan-porta-3d.md, docs/plan-dock.md), loaded at its first
 * opening (audit of 4 November, 3D B1: three.js never in the start's bundle).
 */
type PortaProps = {
  p: EmpirePayload;
  now: number;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  act: (a: EmpireAction) => Promise<unknown>;
  onBattle: () => void;
};
function PortaPlace(props: PortaProps) {
  const opened = useOnce(props.open);
  return opened ? (
    <GoldLayer depth={props.open ? GOLD.scene : 0}>
      <Suspense fallback={null}>
        <PortaScene {...props} />
      </Suspense>
    </GoldLayer>
  ) : null;
}

/** The Remise's arms (their scene and their dock), loaded at their first opening. */
function LazyArms(props: Omit<PortaProps, "now" | "onBattle">) {
  const opened = useOnce(props.open);
  return opened ? (
    <GoldLayer depth={props.open ? GOLD.scene : 0}>
      <Suspense fallback={null}>
        <ArmsScene {...props} />
      </Suspense>
    </GoldLayer>
  ) : null;
}
