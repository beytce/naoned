import { useEffect, useState } from "react";
import { Coin } from "../../art/icons.js";
import { ChoiceCard, CostChips, Dock, PlaceHeader, StepRail, costChips } from "../../dock.js";
import { d } from "../../game/format.js";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import { Slab } from "../../ui.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { portaApi } from "./api.js";
import { RARITY_HEX } from "./colours.js";
import { pt } from "./texts.js";
import {
  COMPONENT_KINDS,
  type ComponentKind,
  type PortaState,
  type PortaView,
  RARITIES,
  type Rarity,
} from "./types.js";

export type PortaPane = null | "stall" | "raise" | "ranking";
type Mode = "solo" | "public" | "invite";

const minutesTo = (at: number | null, now: number) =>
  at === null ? 0 : Math.max(1, Math.ceil((at - now) / 60_000));
const repairing = (x: { repairUntil: number | null }, now: number) =>
  x.repairUntil !== null && x.repairUntil > now;

/** A vehicle of the crew: where it is, and whether it can be chosen now. */
export function crewOf(
  v: PortaView,
  now: number,
): {
  id: string;
  name: string;
  role: "combat" | "transport";
  line: string;
  /** Away at the Remise and sound: chosen, it is sent for. */
  fetch: boolean;
  /** At the quay or on its way: it can be chosen. */
  usable: boolean;
  /** Its life or its hold. */
  stat: string;
  arrivesIn: number;
  hurt: boolean;
}[] {
  const all = [
    ...v.vehicles.map((x) => ({
      x,
      role: "combat" as const,
      name: pt.model[x.model] ?? x.model,
      stat: pt.hp(x.stats.hp),
    })),
    ...v.transports.map((x) => ({
      x,
      role: "transport" as const,
      name: fr.empire.vehicleNames[x.type] ?? x.type,
      stat: pt.holdOf(x.hold),
    })),
  ];
  return all
    .filter(({ x }) => x.place !== "battle")
    .map(({ x, role, name, stat }) => {
      const hurt = repairing(x, now);
      const fetch = x.place === "remise" && !hurt;
      const usable = !hurt && (x.place === "porta" || x.place === "going");
      const line = hurt
        ? pt.repairShort(minutesTo(x.repairUntil, now))
        : x.place === "porta"
          ? pt.atQuay
          : x.place === "going"
            ? pt.coming(minutesTo(x.arrivesAt, now))
            : x.place === "remise"
              ? pt.fromRemise(v.travelMinutes)
              : pt.place_[x.place];
      return {
        id: x.id,
        name,
        role,
        line,
        fetch,
        usable,
        stat,
        arrivesIn: x.place === "going" ? minutesTo(x.arrivesAt, now) : 0,
        hurt,
      };
    });
}

/**
 * The Porta's dock (docs/plan-dock.md, lot 3; design of 4 November 2026): three steps instead of a
 * form — the crew (two rows of cards, a vehicle away sent for at a touch), the tier (its cards in
 * step with the 3D steps, what it brings, the Porta noire a door of its own), how to go (alone,
 * with merchants of one's level, with one's company; the code only on demand). The lobby, the
 * antiquarian, the raise and the ranking take the dock in turn. One gold action each time.
 */
export function PortaDock({
  p,
  v,
  state,
  now,
  off,
  act,
  go,
  step,
  onStep,
  tier,
  onTier,
  dark,
  onDark,
  combatId,
  transportId,
  onChoose,
  pane,
  onPane,
  onBattle,
  error,
}: {
  p: EmpirePayload;
  v: PortaView;
  state: PortaState | null;
  now: number;
  off: boolean;
  act: (a: EmpireAction) => Promise<void>;
  go: (f: () => Promise<PortaState>) => Promise<void>;
  step: number;
  onStep: (n: number) => void;
  tier: number;
  onTier: (n: number) => void;
  dark: boolean;
  onDark: () => void;
  combatId: string;
  transportId: string;
  onChoose: (id: string, role: "combat" | "transport") => void;
  pane: PortaPane;
  onPane: (p: PortaPane) => void;
  onBattle: () => void;
  error: string | null;
}) {
  const lobby = state?.lobby ?? null;
  const inBattle = state?.battle && !state.battle.over;
  const body = inBattle ? (
    <Slab tone="gold" size="lg" className="w-full" onClick={onBattle}>
      {pt.inBattle}
    </Slab>
  ) : lobby ? (
    <Lobby v={v} lobby={lobby} off={off} go={go} now={now} />
  ) : pane === "stall" ? (
    <Stall
      v={v}
      off={off}
      act={act}
      rank={state?.ranking?.mine?.rank ?? null}
      onBack={() => onPane(null)}
    />
  ) : pane === "raise" ? (
    <Raise p={p} v={v} off={off} act={act} onBack={() => onPane(null)} />
  ) : pane === "ranking" ? (
    <Ranking ranking={state?.ranking} onBack={() => onPane(null)} />
  ) : (
    <Steps
      v={v}
      goods={p.goods}
      now={now}
      off={off}
      act={act}
      go={go}
      step={step}
      onStep={onStep}
      tier={tier}
      onTier={onTier}
      dark={dark}
      onDark={onDark}
      combatId={combatId}
      transportId={transportId}
      onChoose={onChoose}
    />
  );
  return (
    <Dock attrs={{ "data-porta-dock": pane ?? (lobby ? "lobby" : String(step)) }}>
      <div key={`${pane}:${step}:${lobby ? 1 : 0}`} className="dock-view flex flex-col gap-3">
        {body}
      </div>
      {error && (
        <p className="text-xs font-semibold text-vermilion" role="alert">
          {error}
        </p>
      )}
    </Dock>
  );
}

function Steps({
  v,
  goods,
  now,
  off,
  act,
  go,
  step,
  onStep,
  tier,
  onTier,
  dark,
  onDark,
  combatId,
  transportId,
  onChoose,
}: {
  v: PortaView;
  goods: Record<string, string>;
  now: number;
  off: boolean;
  act: (a: EmpireAction) => Promise<void>;
  go: (f: () => Promise<PortaState>) => Promise<void>;
  step: number;
  onStep: (n: number) => void;
  tier: number;
  onTier: (n: number) => void;
  dark: boolean;
  onDark: () => void;
  combatId: string;
  transportId: string;
  onChoose: (id: string, role: "combat" | "transport") => void;
}) {
  const crew = crewOf(v, now);
  const line = v.tiers.find((x) => x.tier === tier);
  const entryName = fr.themeNames.resource[v.entryGood] ?? goods[v.entryGood] ?? v.entryGood;
  const [mode, setMode] = useState<Mode>(line?.minPlayers === 1 ? "solo" : "public");
  const [code, setCode] = useState<string | null>(null);
  // A tier for several: never alone.
  useEffect(() => {
    if (line && line.minPlayers > 1 && mode === "solo") setMode("public");
  }, [line, mode]);
  const chosen = (role: "combat" | "transport") =>
    crew.find((c) => c.id === (role === "combat" ? combatId : transportId));
  const pick = (c: (typeof crew)[number]) => {
    if (c.fetch) void act({ type: "empireSendToPorta", vehicleIds: [c.id] });
    onChoose(c.id, c.role);
  };
  const combat = chosen("combat");
  const transport = chosen("transport");
  const crewReady = !!combat && !!transport;
  const late = [combat, transport].find((c) => c && c.arrivesIn > 0);
  const entry = { tier, combatId, transportId, ...(dark ? { dark: true } : {}) };
  return (
    <div data-porta-battle className="flex flex-col gap-3">
      <StepRail steps={pt.steps} current={step} onStep={onStep} />
      {step === 0 ? (
        <>
          {(["combat", "transport"] as const).map((role) => {
            const list = crew.filter((c) => c.role === role);
            return (
              <div key={role} className="flex flex-col gap-2" data-porta-quay={role}>
                <p className="label text-cream-dim">
                  {role === "combat" ? pt.crewCombat : pt.crewTransport}
                </p>
                {list.length === 0 ? (
                  <p className="text-xs text-cream-dim">
                    {role === "combat" ? pt.noneCombat : pt.noneTransport}
                  </p>
                ) : (
                  <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1">
                    {list.map((c) => (
                      <li key={c.id} className="snap-start">
                        <ChoiceCard
                          selected={(role === "combat" ? combatId : transportId) === c.id}
                          disabled={off || c.hurt}
                          onClick={() => pick(c)}
                          className="h-24 w-36 flex-col justify-center gap-1 px-3"
                          attrs={{ "data-quay": c.id }}
                        >
                          <span className="text-sm font-bold">{c.name}</span>
                          <span className="font-display text-xs tabular-nums text-cream-dim">
                            {c.stat}
                          </span>
                          <span
                            className={`text-xs ${c.hurt ? "text-vermilion" : c.fetch ? "text-info" : "text-cream-dim"}`}
                          >
                            {c.line}
                          </span>
                        </ChoiceCard>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <p className="text-xs leading-snug text-cream-dim">{pt.fetchHint}</p>
          <Slab size="lg" className="w-full" disabled={!crewReady} onClick={() => onStep(1)}>
            <span data-porta-next>{pt.toTier}</span>
          </Slab>
        </>
      ) : step === 1 ? (
        <>
          {/* The tiers as a stair (the refonte claire, lot 4): each step higher, as the stone
              steps of the scene above. */}
          <ul className="flex items-end gap-1.5" data-porta-tiers>
            {v.tiers.map((x, i) => (
              <li
                key={x.tier}
                className="min-w-0 flex-1"
                style={{ height: `${4.25 + i * 0.6}rem` }}
              >
                <ChoiceCard
                  selected={x.tier === tier}
                  locked={x.open ? undefined : pt.tierLocked(x.tier)}
                  onClick={() => onTier(x.tier)}
                  className="h-full w-full flex-col items-center justify-end gap-0.5 pb-2"
                  attrs={{ "data-tier": String(x.tier) }}
                >
                  <span
                    className={`font-display text-xl font-extrabold ${x.tier === tier ? "text-info" : ""}`}
                  >
                    {x.tier}
                  </span>
                  <span className="text-[0.6875rem] text-cream-dim">
                    {x.tier <= v.best ? pt.won : pt.players(x.minPlayers, x.maxPlayers)}
                  </span>
                </ChoiceCard>
              </li>
            ))}
          </ul>
          {line && (
            <div className="flex flex-col gap-2.5 glass-chip rounded-[1.25rem] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="label text-cream-dim">{pt.brings}</span>
                <span className="text-xs text-cream">
                  {line.bread > 0 ? pt.entryOf(line.bread, entryName) : pt.freeEntry}
                </span>
              </div>
              <ul className="flex gap-4">
                {RARITIES.map((r) => (
                  <li
                    key={r}
                    className={`flex flex-col items-center gap-1 ${line.weights[r] > 0 ? "" : "opacity-30"}`}
                  >
                    <Gem colour={RARITY_HEX[r]} hollow={line.weights[r] === 0} />
                    <span className="text-[0.6875rem] text-cream-dim">{pt.rarity[r]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ChoiceCard
            danger
            selected={dark}
            onClick={onDark}
            className="min-h-[4.5rem] items-center gap-3 px-3.5 py-2.5"
            attrs={{ "data-porta-dark": dark ? "on" : "off" }}
          >
            <span className="text-vermilion [&_svg]:h-8 [&_svg]:w-8">{Icon.lock()}</span>
            <span className="flex flex-1 flex-col gap-0.5 pr-6">
              <span className="text-sm font-bold text-vermilion">{pt.darkCard}</span>
              <span className="text-xs leading-snug text-cream-dim">{pt.darkText}</span>
            </span>
          </ChoiceCard>
          <Slab size="lg" className="w-full" disabled={!line?.open} onClick={() => onStep(2)}>
            <span data-porta-next>{pt.toGo(tier)}</span>
          </Slab>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {(
              [
                ["solo", pt.alone, line?.minPlayers === 1 ? pt.aloneText : pt.aloneClosed],
                ["public", pt.mates, pt.matesText],
                ["invite", pt.company, pt.companyText],
              ] as const
            ).map(([m, title, text]) => (
              <ChoiceCard
                key={m}
                selected={mode === m}
                disabled={m === "solo" && line?.minPlayers !== 1}
                onClick={() => setMode(m)}
                className="min-h-[4.25rem] items-center gap-3 px-3.5 py-2"
                attrs={{ "data-porta-mode": m }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-night-4 [&_svg]:h-6 [&_svg]:w-6">
                  {m === "solo" ? Icon.family() : m === "public" ? Icon.troops() : Icon.banner()}
                </span>
                <span className="flex flex-1 flex-col pr-6">
                  <span className="text-sm font-bold">{title}</span>
                  <span className="text-xs text-cream-dim">{text}</span>
                </span>
              </ChoiceCard>
            ))}
          </div>
          {code === null ? (
            <Slab tone="text" onClick={() => setCode("")} className="self-center">
              {pt.haveCode}
            </Slab>
          ) : (
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder={pt.codePlaceholder}
                aria-label={pt.codePlaceholder}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-edge bg-night-3 px-3 font-display text-base tabular-nums tracking-widest text-cream"
              />
              <Slab
                tone="ghost"
                disabled={off || !crewReady || code.length !== 6}
                onClick={() =>
                  void go(() =>
                    portaApi.join(code, {
                      combatId,
                      transportId,
                      ...(dark ? { dark: true } : {}),
                    }),
                  )
                }
              >
                {pt.join}
              </Slab>
            </div>
          )}
          {late && (
            <p className="text-center text-xs text-cream-dim">
              {pt.waitFor(late.name, late.arrivesIn)}
            </p>
          )}
          <Slab
            size="lg"
            className="w-full"
            busy={off}
            disabled={!crewReady || !!late || !line?.open}
            onClick={() => void go(() => portaApi.queue(mode, entry))}
          >
            <span data-porta-go>
              {mode === "solo"
                ? pt.go(line?.bread ?? 0, entryName)
                : mode === "invite"
                  ? pt.goGroup
                  : pt.goQueue}
            </span>
          </Slab>
        </>
      )}
    </div>
  );
}

/** A relic's gem, as the antiquarian lays it out. */
function Gem({
  colour,
  hollow = false,
  size = 28,
}: { colour: string; hollow?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 2l8 7-8 13-8-13z"
        fill={hollow ? "none" : colour}
        stroke={colour}
        strokeWidth={hollow ? 1.5 : 0}
      />
      {!hollow && <path d="M12 2l8 7H4z" fill="#fff" opacity="0.28" />}
    </svg>
  );
}

/** The lobby: the seats round the gate, the countdown, the code to share, one gold « Partir ». */
function Lobby({
  v,
  lobby,
  off,
  go,
  now,
}: {
  v: PortaView;
  lobby: NonNullable<PortaState["lobby"]>;
  off: boolean;
  go: (f: () => Promise<PortaState>) => Promise<void>;
  now: number;
}) {
  const [copied, setCopied] = useState(false);
  const max = v.tiers.find((x) => x.tier === lobby.tier)?.maxPlayers ?? Math.max(2, lobby.players);
  const left = lobby.waitUntil ? Math.max(0, Math.ceil((lobby.waitUntil - now) / 1_000)) : null;
  const share = async () => {
    if (!lobby.code) return;
    const text = `${pt.porta} · ${pt.tier(lobby.tier)} · ${lobby.code}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(lobby.code);
        setCopied(true);
      }
    } catch {
      // Cancelled: nothing to say.
    }
  };
  return (
    <div className="flex flex-col gap-3" data-porta-lobby>
      <PlaceHeader
        title={pt.lobby}
        sub={`${pt.tier(lobby.tier)} · ${pt.lobbyPlayers(lobby.players)}`}
      />
      <ul className="flex justify-center gap-3" data-porta-seats>
        {Array.from({ length: Math.min(6, max) }, (_, i) => {
          const taken = i < lobby.players;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a seat is its index
            <li key={i} className="flex w-14 flex-col items-center gap-1">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full font-place text-base font-bold ${
                  i === 0
                    ? "bg-night-3 text-info ring-[2.5px] ring-info"
                    : taken
                      ? "bg-night-3 text-lagoon ring-2 ring-lagoon"
                      : "border-2 border-dashed border-edge text-cream-dim"
                }`}
              >
                {taken ? (i === 0 ? "V" : i + 1) : "?"}
              </span>
              <span className="text-[0.6875rem] text-cream-dim">
                {i === 0 ? pt.you : taken ? "" : pt.seat}
              </span>
            </li>
          );
        })}
      </ul>
      {left !== null && (
        <p className="text-center font-display text-2xl font-extrabold tabular-nums text-info">
          0:{String(left).padStart(2, "0")}
        </p>
      )}
      {lobby.code && (
        <div className="flex items-center gap-3 glass-chip rounded-[1.25rem] px-4 py-3">
          <span className="flex flex-1 flex-col">
            <span className="label text-cream-dim">{pt.lobbyCodeTitle}</span>
            <span className="font-display text-3xl font-extrabold tabular-nums tracking-[0.12em]">
              {lobby.code.replace(/(\d{3})(\d{3})/, "$1 $2")}
            </span>
          </span>
          <Slab tone="ghost" onClick={() => void share()}>
            {copied ? pt.copied : pt.share}
          </Slab>
        </div>
      )}
      <p className="text-center text-xs text-cream-dim">{pt.countdown}</p>
      {(lobby.owner || !lobby.code) && (
        <Slab size="lg" className="w-full" busy={off} onClick={() => void go(portaApi.launch)}>
          {pt.launchWith(lobby.players)}
        </Slab>
      )}
      <Slab
        tone="text"
        className="self-center"
        disabled={off}
        onClick={() => void go(portaApi.leave)}
      >
        {pt.leave}
      </Slab>
    </div>
  );
}

/**
 * The antiquarian: the relics by rarity as gems; one touched, its two fates side by side (sold:
 * ducats and points; deciphered: plans of a kind), one gold action that says the choice.
 */
function Stall({
  v,
  off,
  act,
  rank,
  onBack,
}: {
  v: PortaView;
  off: boolean;
  act: (a: EmpireAction) => Promise<void>;
  rank: number | null;
  onBack: () => void;
}) {
  const have = RARITIES.filter((r) => v.relics[r] > 0);
  const [rarity, setRarity] = useState<Rarity | null>(have[0] ?? null);
  const [fate, setFate] = useState<"sell" | "decipher">("sell");
  const [kind, setKind] = useState<ComponentKind>("weapon");
  useEffect(() => {
    if (rarity && v.relics[rarity] === 0) setRarity(have[0] ?? null);
  }, [rarity, v.relics, have]);
  const price = rarity ? v.relicPrices[rarity] : null;
  return (
    <div className="flex flex-col gap-3" data-porta-antiquarian>
      <PlaceHeader title={pt.antiquarian} sub={pt.weekRank(v.weekPoints, rank)} onBack={onBack} />
      <ul className="grid grid-cols-4 gap-2" data-porta-relics>
        {RARITIES.map((r) => (
          <li key={r}>
            <ChoiceCard
              selected={rarity === r}
              disabled={v.relics[r] === 0}
              onClick={() => setRarity(r)}
              className="h-20 w-full flex-col items-center justify-center gap-0.5"
              attrs={{ "data-relic": r }}
              label={`${pt.rarity[r]} · ${v.relics[r]}`}
            >
              <Gem colour={RARITY_HEX[r]} hollow={v.relics[r] === 0} />
              <span className="font-display text-xs font-bold tabular-nums">×{v.relics[r]}</span>
            </ChoiceCard>
          </li>
        ))}
      </ul>
      {!rarity || !price ? (
        <p className="text-sm text-cream-dim">{pt.backNone}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <ChoiceCard
              selected={fate === "sell"}
              onClick={() => setFate("sell")}
              className="h-32 flex-col items-center justify-center gap-1"
              attrs={{ "data-fate": "sell" }}
            >
              <Coin size={34} />
              <span className="text-sm font-bold">{pt.sell}</span>
              <span className="font-display text-sm font-bold tabular-nums text-gold">
                {d(price.price)}
              </span>
              <span className="text-xs text-cream-dim">+{pt.points(price.points)}</span>
            </ChoiceCard>
            <ChoiceCard
              selected={fate === "decipher"}
              onClick={() => setFate("decipher")}
              className="h-32 flex-col items-center justify-center gap-1"
              attrs={{ "data-fate": "decipher" }}
            >
              <span className="text-info [&_svg]:h-8 [&_svg]:w-8">{Icon.decree()}</span>
              <span className="text-sm font-bold">{pt.decipher}</span>
              <span className="font-display text-sm font-bold tabular-nums text-lagoon">
                {pt.plansOf(v.plansPerRarity[rarity])}
              </span>
              <span className="text-xs text-cream-dim">{pt.plansFor}</span>
            </ChoiceCard>
          </div>
          {fate === "decipher" && (
            <div className="flex flex-col gap-2">
              <p className="label text-cream-dim">{pt.plansWhich}</p>
              <div className="grid grid-cols-3 gap-2" data-porta-plans>
                {COMPONENT_KINDS.map((k) => (
                  <ChoiceCard
                    key={k}
                    selected={kind === k}
                    onClick={() => setKind(k)}
                    className="h-12 items-center justify-center gap-1.5 text-sm font-semibold"
                    attrs={{ "data-plan-kind": k }}
                  >
                    {pt.kind[k]}
                    <span className="font-display text-xs tabular-nums text-cream-dim">
                      {v.plans[k]}
                    </span>
                  </ChoiceCard>
                ))}
              </div>
            </div>
          )}
          <Slab
            size="lg"
            className="w-full"
            busy={off}
            onClick={() =>
              void act(
                fate === "sell"
                  ? { type: "empireSellRelics", rarity, qty: 1 }
                  : { type: "empireDecipherRelic", rarity, kind },
              )
            }
          >
            {fate === "sell"
              ? pt.sellFor(d(price.price))
              : pt.decipherInto(v.plansPerRarity[rarity], pt.plansKind[kind] ?? "")}
          </Slab>
          {fate === "sell" && v.relics[rarity] > 1 && (
            <Slab
              tone="text"
              className="self-center"
              disabled={off}
              onClick={() => void act({ type: "empireSellRelics", rarity, qty: v.relics[rarity] })}
            >
              {pt.sellAll(
                v.relics[rarity],
                d((BigInt(price.price) * BigInt(v.relics[rarity])).toString()),
              )}
            </Slab>
          )}
        </>
      )}
    </div>
  );
}

/** Raising the Porta: what it opens, what it costs, one gold « Lancer ». */
function Raise({
  p,
  v,
  off,
  act,
  onBack,
}: {
  p: EmpirePayload;
  v: PortaView;
  off: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onBack: () => void;
}) {
  const up = v.upgrade;
  return (
    <div className="flex flex-col gap-3" data-porta-raise>
      <PlaceHeader title={pt.raiseTitle} sub={pt.level(v.level)} onBack={onBack} />
      {!up ? (
        <p className="text-sm text-cream-dim">{pt.top}</p>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3" aria-hidden="true">
            <span className="flex h-12 w-12 items-center justify-center rounded-full font-display text-xl font-extrabold ring-2 ring-inset ring-edge">
              {v.level}
            </span>
            <span className="text-lagoon">›</span>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lagoon font-display text-2xl font-extrabold text-on-lagoon">
              {v.level + 1}
            </span>
          </div>
          <p className="text-center text-sm text-lagoon">{pt.opensTier(v.level + 1)}</p>
          <CostChips
            chips={costChips({ cash: p.cash, cost: up.cost, minutes: up.minutes })}
            goodName={(c) => c}
          />
          <Slab
            size="lg"
            className="w-full"
            busy={off}
            disabled={BigInt(p.cash) < BigInt(up.cost)}
            onClick={() => void act({ type: "empireUpgradePorta" }).then(onBack)}
          >
            {pt.raiseGo}
          </Slab>
        </>
      )}
    </div>
  );
}

/** The week's ranking, by band of Power. */
function Ranking({
  ranking,
  onBack,
}: {
  ranking: PortaState["ranking"];
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-3" data-porta-ranking>
      <PlaceHeader
        title={pt.ranking}
        sub={ranking ? pt.rankingBand(ranking.band) : undefined}
        onBack={onBack}
      />
      {!ranking || ranking.lines.length === 0 ? (
        <p className="text-sm text-cream-dim">{pt.rankingEmpty}</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {ranking.lines.map((l) => (
            <li
              key={l.rank}
              className={`flex min-h-9 items-center gap-3 rounded-xl px-3 text-sm ${l.me ? "bg-info/10 text-info" : ""}`}
            >
              <span className="w-6 font-display font-bold tabular-nums">{l.rank}</span>
              <span className="flex-1 truncate">{l.pseudo}</span>
              <span className="font-display tabular-nums">{pt.points(l.points)}</span>
            </li>
          ))}
          {ranking.mine && !ranking.lines.some((l) => l.me) && (
            <li className="flex min-h-9 items-center gap-3 rounded-xl bg-info/10 px-3 text-sm text-info">
              <span className="w-6 font-display font-bold tabular-nums">{ranking.mine.rank}</span>
              <span className="flex-1">{pt.you}</span>
              <span className="font-display tabular-nums">{pt.points(ranking.mine.points)}</span>
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
