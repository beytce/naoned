import { useMemo } from "react";
import { FamilyCrest, MILITIA_HEX, familyHex } from "../../art/familyCrest.js";
import { fr } from "../../i18n.js";
import { Sheet, clock } from "../../ui.js";
import {
  Choose,
  DecreeBanner,
  FamilyTab,
  HowTo,
  Lances,
  LandSheet,
  Marches,
  Programme,
  Thread,
  Works,
  familyName,
  holderColors,
  landName,
  marchOrigin,
} from "../Famille.js";
import type { GameProps } from "../Game.js";
import { store } from "../store.js";
import { territories } from "../territory.js";
import type { FamiliesView, LandView } from "../types.js";
import { LandMarker } from "./Markers.js";
import { ActionButton, ContextPanel } from "./Panel.js";
import type { MapMarker, Selection } from "./WorldMap.js";
import { Icon } from "./icons.js";

/**
 * The campaign as a layer of the world map: the same Veneto, the lands of the Terraferma in their
 * holders' colours (Lombardy to the west), the marches on their way. A land touched opens its
 * panel; the merchant's family seat, the family's.
 */

const t = () => fr.game.families;
const c = () => fr.game.map.campaign;

/** Whether an enemy column is on its way to a land of the merchant's family. */
function threatened(f: FamiliesView, l: LandView): boolean {
  return (
    f.mine !== null &&
    l.holder === f.mine &&
    f.marches.some((m) => m.target === l.code && m.family !== f.mine)
  );
}

/** Whether the family's seat calls: a levy to collect, a land under attack, a message unread. */
export function familyCalls(props: GameProps): boolean {
  const f = props.view.families;
  if (!f) return false;
  if (!f.mine) return f.opensAt <= props.now;
  const unread =
    props.familyLatestAt !== null && props.familyLatestAt > Number(store.get("familySeen") ?? 0);
  return (f.me?.levy ?? 0) > 0 || f.lands.some((l) => threatened(f, l)) || unread;
}

export function campaignMarkers(
  props: GameProps,
  f: FamiliesView,
  select: (s: Selection) => void,
): MapMarker[] {
  return f.lands.map((l) => ({
    key: `land:${l.code}`,
    node: (
      <LandMarker
        code={l.code}
        name={landName(l.code)}
        color={familyHex(l.holder)}
        label={l.seat ? "⚑" : String(l.garrison)}
        seat={!!l.seat}
        city={!!l.city}
        named={!!l.city || l.kind === "fortress" || (!!l.seat && l.seat === f.mine)}
        reach={l.open && !f.closed}
        threatened={threatened(f, l)}
        mine={l.mine > 0}
        work={
          l.work
            ? { kind: l.work.kind, color: familyHex(l.work.family), ready: l.work.ready }
            : null
        }
        dim={false}
        onTap={() => select({ kind: "land", code: l.code })}
      />
    ),
  }));
}

/**
 * How far a land's ground reaches, in map units: enough for the cells of neighbouring lands to
 * meet everywhere (at 46, a gap opened between Milan's fortresses).
 */
const TERRITORY_RADIUS = 50;

/** Under the lands: each one's ground in its holder's colour, the borders, the marches. */
export function CampaignOverlay({ f, now }: { f: FamiliesView; now: number }) {
  const colors = holderColors();
  // The ground only changes when a land changes hands, not with the clock's every second.
  const holders = f.lands.map((l) => `${l.code}|${l.x}|${l.y}|${l.holder ?? ""}`).join(";");
  // biome-ignore lint/correctness/useExhaustiveDependencies: `holders` is the lands' identity.
  const cells = useMemo(
    () =>
      territories(
        f.lands.map((l) => ({ code: l.code, x: l.x, y: l.y, holder: l.holder })),
        TERRITORY_RADIUS,
      ),
    [holders],
  );
  const byCode = new Map(f.lands.map((l) => [l.code, l]));
  return (
    <g>
      {f.lands.map((l) => (
        <polygon
          key={`cell-${l.code}`}
          points={(cells.cells[l.code] ?? []).map(([x, y]) => `${x},${y}`).join(" ")}
          fill={colors[l.holder ?? ""] ?? MILITIA_HEX}
          fillOpacity={l.holder ? 0.3 : 0.1}
        />
      ))}
      {cells.borders
        .filter((e) => e.holder)
        .map((e) => (
          <line
            key={`${e.code}-${e.from[0]}-${e.from[1]}`}
            x1={e.from[0]}
            y1={e.from[1]}
            x2={e.to[0]}
            y2={e.to[1]}
            stroke={colors[e.holder ?? ""] ?? MILITIA_HEX}
            strokeOpacity="0.8"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        ))}
      {f.marches.map((m) => {
        const from = marchOrigin(f, m);
        const a = from ? byCode.get(from) : undefined;
        const b = byCode.get(m.target);
        if (!a || !b) return null;
        const hostile = m.family !== f.mine && b.holder === f.mine && f.mine !== null;
        const share = Math.min(
          1,
          Math.max(0, (now - m.startAt) / Math.max(1, m.arriveAt - m.startAt)),
        );
        return (
          <g key={m.id}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={hostile ? "rgb(var(--vermilion))" : (colors[m.family] ?? "rgb(var(--cream))")}
              strokeWidth="2"
              strokeDasharray="1.5 3.5"
              strokeLinecap="round"
            />
            <circle
              cx={a.x + (b.x - a.x) * share}
              cy={a.y + (b.y - a.y) * share}
              r="3.2"
              fill={hostile ? "rgb(var(--vermilion))" : (colors[m.family] ?? "rgb(var(--cream))")}
              stroke="rgb(var(--night))"
              strokeWidth="1"
            />
          </g>
        );
      })}
    </g>
  );
}

/** The four families' glory in a row under the HUD's head, and the week's clocks. */
export function CampaignHud({ f, now }: { f: FamiliesView; now: number }) {
  const ranked = [...f.families].sort((a, b) => b.glory - a.glory);
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="grid grid-cols-2 gap-1.5">
        {ranked.map((x) => (
          <span
            key={x.code}
            title={familyName(x.code)}
            className={`hud-orb flex h-9 items-center gap-1 rounded-full pl-1 pr-2 ${x.code === f.mine ? "ring-2 ring-gold" : ""}`}
          >
            <FamilyCrest family={x.code} size={20} />
            <span
              className={`font-display text-sm font-extrabold tabular-nums ${x.code === f.mine ? "text-gold" : "text-cream"}`}
            >
              {x.glory}
            </span>
          </span>
        ))}
      </div>
      <span className="flex flex-col items-end font-mono text-xs uppercase tracking-[0.1em] text-cream-dim [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
        <span>{f.closed ? t().closed : t().weekShort(clock(f.weekEndsAt - now))}</span>
        {!f.open && !f.closed && (
          <span className="text-lagoon">
            ☾ {t().truce} {clock(f.nextOpenAt - now)}
          </span>
        )}
        {f.nextMilanAt !== null && f.nextMilanAt > now && !f.closed && (
          <span className="text-vermilion">{t().milanShort(clock(f.nextMilanAt - now))}</span>
        )}
      </span>
    </div>
  );
}

/**
 * The panel of the campaign: the merchant's seat (the family's actions), a land (its holder,
 * garrison, the march to send), or, without a family yet, the four to choose from.
 */
export function CampaignPanel({
  props,
  f,
  sel,
  select,
}: {
  props: GameProps;
  f: FamiliesView;
  sel: Selection | null;
  select: (s: Selection | null) => void;
}) {
  const land = sel?.kind === "land" ? f.lands.find((l) => l.code === sel.code) : undefined;
  const ranked = [...f.families].sort((a, b) => b.glory - a.glory);
  const now = props.now;

  if (!f.mine && !land) {
    // No family yet: an invitation floating over the tabs (they stay, to go back to the trade).
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--tabbar)+1rem)] z-10 flex flex-col items-center gap-1">
        <button
          type="button"
          data-coach="panel-pledge"
          onClick={() => props.setSheet("fam:choose")}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-display text-sm font-extrabold uppercase tracking-wide text-ink shadow-[0_6px_20px_rgb(0_0_0/0.45)] transition active:scale-95"
        >
          {Icon.family()}
          {t().pledge}
        </button>
        <button
          type="button"
          onClick={() => props.setSheet("fam:howto")}
          className="pointer-events-auto font-mono text-xs uppercase tracking-[0.1em] text-cream-dim [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
        >
          {f.opensAt > now ? t().opensIn(clock(f.opensAt - now)) : c().howTo}
        </button>
      </div>
    );
  }

  if (!land) return null;

  // The merchant's own seat: the family's panel.
  if (land.seat && land.seat === f.mine) {
    const mine = f.families.find((x) => x.code === f.mine);
    const rank = ranked.findIndex((x) => x.code === f.mine) + 1;
    const me = f.me;
    const threats = f.lands.filter((l) => threatened(f, l)).length;
    const unread =
      props.familyLatestAt !== null && props.familyLatestAt > Number(store.get("familySeen") ?? 0);
    return (
      <ContextPanel
        title={
          <span className="inline-flex items-center gap-2">
            <FamilyCrest family={f.mine ?? ""} size={20} />
            {familyName(f.mine)}
          </span>
        }
        chip={<span className="meta">{c().rankGlory(rank, mine?.glory ?? 0)}</span>}
        status={
          f.closed
            ? t().closed
            : me
              ? c().reserveLine(me.reserve, me.levy, me.levyMax)
              : t().weekEnds(clock(f.weekEndsAt - now))
        }
        tone={threats > 0 ? "vermilion" : (me?.levy ?? 0) > 0 ? "gold" : "lagoon"}
        progress={me ? me.levy / Math.max(1, me.levyMax) : null}
        onClose={() => select(null)}
        actions={
          <>
            <ActionButton
              icon={Icon.bandits()}
              label={c().lances}
              tone={(me?.levy ?? 0) > 0 ? "gold" : "plain"}
              badge={(me?.levy ?? 0) > 0 ? me?.levy : undefined}
              coach="panel-lances"
              onClick={() => props.setSheet("fam:lances")}
            />
            <ActionButton
              icon={Icon.send()}
              label={c().marches}
              tone={threats > 0 ? "vermilion" : "plain"}
              badge={threats > 0 ? threats : undefined}
              onClick={() => props.setSheet("fam:marches")}
            />
            <ActionButton
              icon={Icon.cargo()}
              label={c().decrees}
              onClick={() => props.setSheet("fam:decrees")}
            />
            <ActionButton
              icon={Icon.family()}
              label={c().family}
              badge={unread ? "•" : undefined}
              onClick={() => props.setSheet("fam:family")}
            />
          </>
        }
      />
    );
  }

  // Any other land.
  const reachable = f.lands.filter((l) => l.open);
  const ring = (reachable.some((l) => l.code === land.code) ? reachable : f.lands)
    .slice()
    .sort((a, b) => a.x - b.x);
  const i = ring.findIndex((l) => l.code === land.code);
  const step = (k: number) => {
    const next = ring[(i + k + ring.length) % ring.length];
    if (next) select({ kind: "land", code: next.code });
  };
  const ours = land.holder !== null && land.holder === f.mine;
  const reserve = f.me?.reserve ?? 0;
  const canMarch = !!f.mine && !land.seat && land.open && reserve > 0 && !f.closed;
  const hostile = f.marches.find((m) => m.target === land.code && m.family !== f.mine);
  const friendly = f.marches.find((m) => m.target === land.code && m.family === f.mine);
  const holder = familyName(land.holder);
  return (
    <ContextPanel
      title={landName(land.code)}
      chip={<span className="label">{t().kinds[land.kind] ?? land.kind}</span>}
      status={
        hostile && ours
          ? c().threat(clock(hostile.arriveAt - now))
          : friendly
            ? c().ours(clock(friendly.arriveAt - now))
            : land.seat
              ? t().land.seat(familyName(land.seat))
              : c().landLine(holder, land.garrison, land.defense)
      }
      tone={hostile && ours ? "vermilion" : land.mine > 0 ? "gold" : "lagoon"}
      onClose={() => select(null)}
      onPrev={ring.length > 1 ? () => step(-1) : undefined}
      onNext={ring.length > 1 ? () => step(1) : undefined}
      actions={
        <>
          {canMarch && (
            <ActionButton
              icon={Icon.bandits()}
              label={ours ? c().reinforce : c().attack}
              tone={ours ? "plain" : "gold"}
              coach="panel-march"
              onClick={() => props.setSheet(`land:${land.code}`)}
            />
          )}
          {friendly && !ours && reserve > 0 && (
            <ActionButton
              icon={Icon.send()}
              label={c().join}
              onClick={() => props.setSheet("fam:marches")}
            />
          )}
          <ActionButton
            icon={Icon.cargo()}
            label={c().details}
            onClick={() => props.setSheet(`land:${land.code}`)}
          />
          {!f.mine && (
            <ActionButton
              icon={Icon.family()}
              label={c().pledge}
              tone="gold"
              onClick={() => props.setSheet("fam:choose")}
            />
          )}
        </>
      }
    />
  );
}

/** The campaign's windows: a land, the lances, the marches, the decrees, the family, the rules. */
export function CampaignSheets({
  props,
  f,
  select,
}: { props: GameProps; f: FamiliesView; select: (s: Selection | null) => void }) {
  const [kind, id] = (props.sheet ?? "").split(":");
  const close = () => props.setSheet(null);
  const land = kind === "land" ? f.lands.find((l) => l.code === id) : undefined;
  return (
    <>
      <Sheet open={!!land} onClose={close}>
        {land && <LandSheet key={land.code} land={land} f={f} props={props} onClose={close} />}
      </Sheet>
      <Sheet open={props.sheet === "fam:lances"} onClose={close}>
        <Lances f={f} props={props} />
      </Sheet>
      <Sheet open={props.sheet === "fam:marches"} onClose={close}>
        <div className="space-y-4">
          <Marches f={f} props={props} />
          <Works
            f={f}
            props={props}
            onLand={(code) => {
              close();
              select({ kind: "land", code });
            }}
          />
        </div>
      </Sheet>
      <Sheet open={props.sheet === "fam:decrees"} onClose={close}>
        <div className="space-y-4">
          <DecreeBanner props={props} />
          <Programme f={f} props={props} />
        </div>
      </Sheet>
      <Sheet open={props.sheet === "fam:family"} onClose={close}>
        <div className="space-y-4">
          <FamilyTab f={f} props={props} />
          <Thread />
        </div>
      </Sheet>
      <Sheet open={props.sheet === "fam:choose" && !f.mine} onClose={close}>
        <Choose f={f} props={props} />
      </Sheet>
      <Sheet open={props.sheet === "fam:howto"} onClose={close}>
        <HowTo props={props} />
      </Sheet>
    </>
  );
}
