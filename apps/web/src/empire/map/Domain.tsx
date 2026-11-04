import { GoodsMark } from "../../art/goods.js";
import { TILT } from "../../art/plateau/geom.js";
import { fr } from "../../i18n.js";
import { Slab, clock } from "../../ui.js";
import { regionName } from "../World.js";
import { buildingName, readyLots, recipeOf, workshopStatus } from "../logic.js";
import type { DomainTile } from "../map3d/domain.js";
import type { EmpireAction, EmpirePayload } from "../types.js";

const t = fr.empire.orbit;

/**
 * The labels of a fondaco's domain (decision of the owner, 3 November 2026), each over its 3D tile:
 * a workshop's name and state (a touch takes a ready lot, else opens it), a site's timer, « Bâtir
 * ici » on the place to build, the Casa on the fondaco. Small and few: the tiles tell the rest.
 */
export function DomainLabels({
  p,
  now,
  base,
  tiles,
  busy,
  act,
  onWorkshop,
  onCasa,
  onFree,
}: {
  p: EmpirePayload;
  now: number;
  base: number;
  tiles: DomainTile[];
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onWorkshop: (id: string) => void;
  onCasa: () => void;
  onFree: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const at = (x: number, y: number) => ({ left: x * base, top: y * TILT * base });
  return (
    <div data-domain-layer>
      {tiles.map((tile) => {
        const key = `${tile.x},${tile.y}`;
        if (tile.kind === "fondaco")
          return (
            <div key={key} className="map-pin" style={at(tile.x, tile.y)}>
              <button
                type="button"
                onClick={onCasa}
                className="pointer-events-auto flex min-h-11 min-w-11 translate-y-9 flex-col items-center justify-center rounded-full bg-night/85 px-3 py-1 text-xs font-bold text-gold shadow-lg shadow-black/50 active:scale-95"
                data-domain-casa
              >
                Casa {view.house.casa}
              </button>
            </div>
          );
        if (tile.kind === "workshop") {
          const ws = view.house.workshops.find((w) => w.id === tile.id);
          if (!ws) return null;
          const s = workshopStatus(p, ws, now);
          const good = Object.keys(recipeOf(p, ws)?.outputs ?? {})[0] ?? "";
          const line =
            s.state === "ready"
              ? `+${s.quantity}`
              : s.state === "running"
                ? clock(s.left)
                : s.state === "idle"
                  ? t.idle
                  : t.waits(
                      fr.themeNames.resource[s.resource] ?? p.goods[s.resource] ?? s.resource,
                    );
          return (
            <div key={key} className="map-pin" style={at(tile.x, tile.y)}>
              <button
                type="button"
                data-workshop={ws.id}
                data-ready={s.state === "ready" ? "" : undefined}
                disabled={busy && s.state === "ready"}
                aria-label={`${buildingName(p, ws.type)} · ${line}`}
                onClick={() =>
                  s.state === "ready"
                    ? void act({ type: "empireRelaunch", workshopId: ws.id })
                    : onWorkshop(ws.id)
                }
                className="pointer-events-auto flex min-h-11 min-w-11 translate-y-10 flex-col items-center justify-end active:scale-95"
              >
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums shadow-md shadow-black/50 ${
                    s.state === "ready"
                      ? "bg-lagoon text-on-lagoon"
                      : s.state === "running"
                        ? "bg-night/85 text-cream"
                        : "bg-night/85 text-cream-dim"
                  }`}
                >
                  <GoodsMark code={good} size={14} />
                  {line}
                </span>
              </button>
            </div>
          );
        }
        if (tile.kind === "site")
          return (
            <div key={key} className="map-pin" style={at(tile.x, tile.y)}>
              <span className="flex translate-y-4 flex-col items-center gap-0.5">
                <span className="rounded-full bg-night/85 px-2 py-0.5 text-xs font-bold tabular-nums text-gold shadow-md">
                  {clock(tile.endsAt - now)}
                </span>
                <span className="text-xs font-semibold text-cream [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
                  {buildingName(p, tile.type)}
                </span>
              </span>
            </div>
          );
        if (tile.kind === "free")
          return (
            <div key={key} className="map-pin" style={at(tile.x, tile.y)}>
              <button
                type="button"
                onClick={onFree}
                data-domain-free
                className="pointer-events-auto min-h-11 rounded-full border border-lagoon/80 bg-night/85 px-3 text-xs font-semibold text-lagoon shadow-lg shadow-black/50 active:scale-95"
              >
                + {t.buildHere}
              </button>
            </div>
          );
        return null;
      })}
    </div>
  );
}

/**
 * The domain's foot: back to the map (the chevron), its name, and its one gold action: every ready
 * lot taken (and the workshops started again); else when the next lot comes.
 */
export function DomainBar({
  p,
  now,
  busy,
  region,
  act,
  onBack,
  onProduction,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  region: string;
  act: (a: EmpireAction) => Promise<void>;
  onBack: () => void;
  /** The Production (the buildings, the vehicles, a fondaco to put down). */
  onProduction: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const mine = view.house.workshops.filter((w) => (w.region ?? "veneto") === region);
  const ready = mine.filter((w) => readyLots(w, now) > 0).length;
  const lefts = mine
    .map((w) => workshopStatus(p, w, now))
    .flatMap((s) => (s.state === "running" ? [s.left] : []));
  const title = region === "veneto" ? t.title(view.house.casa) : t.postTitle(regionName(region));
  return (
    <section
      className="pointer-events-auto w-full border-t border-line bg-night-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-xl shadow-black/50 lg:mb-4 lg:w-[30rem] lg:rounded-2xl lg:border"
      data-domain-bar={region}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 items-center gap-1 rounded-full px-2 text-sm text-cream-dim active:scale-95"
          data-domain-back
        >
          <span aria-hidden="true">‹</span> {t.back}
        </button>
        <h3 className="min-w-0 flex-1 truncate text-center font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
          {title}
        </h3>
        <button
          type="button"
          onClick={onProduction}
          className="flex h-11 items-center rounded-full px-2 text-sm text-lagoon active:scale-95"
          data-production
        >
          {fr.empire.scene.production}
        </button>
      </div>
      {ready > 0 ? (
        <div className="mt-2">
          <Slab
            size="md"
            tone="gold"
            className="w-full"
            busy={busy}
            onClick={() => void act({ type: "empireRelaunchAll" })}
          >
            {t.harvest(ready)}
          </Slab>
        </div>
      ) : (
        <p className="mt-2 text-center text-sm text-cream-dim" data-domain-next>
          {lefts.length > 0 ? t.next(clock(Math.min(...lefts))) : t.nothing}
        </p>
      )}
    </section>
  );
}
