import { useCallback, useEffect, useState } from "react";
import { Coin } from "../../art/icons.js";
import { d } from "../../game/format.js";
import { Badge, Label, Sheet, Slab } from "../../ui.js";
import { affordable } from "../logic.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { portaApi } from "./api.js";
import { errorText, pt } from "./texts.js";
import { type PortaState, RARITIES } from "./types.js";

/**
 * The Porta's sheet (docs/plan-porta.md §§ 3, 7, 9): its level, its quay (the vehicles sent from
 * the Remise and called back), the tiers and the lobby (alone, public, by invitation), the
 * antiquarian and the week's ranking of the band. A battle started opens the battle's screen.
 */
export function PortaSheet({
  p,
  open,
  busy,
  now,
  act,
  onClose,
  onBattle,
}: {
  p: EmpirePayload;
  open: boolean;
  busy: boolean;
  now: number;
  act: (a: EmpireAction) => Promise<void>;
  onClose: () => void;
  onBattle: () => void;
}) {
  const v = p.view?.porta;
  const [state, setState] = useState<PortaState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState(1);
  const [combatId, setCombatId] = useState("");
  const [transportId, setTransportId] = useState("");
  const [code, setCode] = useState("");
  const [waiting, setWaiting] = useState(false);

  const take = useCallback(
    (s: PortaState) => {
      setState(s);
      setError(s.error ? errorText(s.error) : null);
      if (s.battle && !s.battle.over) onBattle();
    },
    [onBattle],
  );
  const refresh = useCallback(async () => take(await portaApi.state()), [take]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    // While in a lobby, its start is watched.
    const timer = window.setInterval(() => void refresh(), 2_000);
    return () => window.clearInterval(timer);
  }, [open, refresh]);

  const docked = (place: string) => place === "porta";
  const combats = v?.vehicles.filter((x) => docked(x.place)) ?? [];
  const transports = v?.transports.filter((x) => docked(x.place)) ?? [];
  useEffect(() => {
    if (!combats.some((x) => x.id === combatId)) setCombatId(combats[0]?.id ?? "");
    if (!transports.some((x) => x.id === transportId)) setTransportId(transports[0]?.id ?? "");
  }, [combats, transports, combatId, transportId]);

  if (!v) return null;
  const go = async (f: () => Promise<PortaState>) => {
    setWaiting(true);
    try {
      take(await f());
    } finally {
      setWaiting(false);
    }
  };
  const entry = { tier, combatId, transportId };
  const ready = combatId !== "" && transportId !== "";
  const line = v.tiers.find((x) => x.tier === tier);
  const lobby = state?.lobby ?? null;
  const ranking = state?.ranking;
  const off = busy || waiting;

  return (
    <Sheet open={open} onClose={onClose} kicker={pt.portaSub} title={pt.porta}>
      <section className="flex items-center justify-between gap-3" data-porta-level>
        <div>
          <p className="text-sm text-cream">{pt.level(v.level)}</p>
          <p className="text-xs text-cream-dim">{pt.travel(v.travelMinutes)}</p>
        </div>
        {v.upgrade ? (
          <Slab
            size="sm"
            tone="ghost"
            disabled={off || !affordable(p.cash, v.upgrade.cost)}
            onClick={() => void act({ type: "empireUpgradePorta" })}
          >
            {pt.raise} · <Coin size={12} /> {d(v.upgrade.cost)}
          </Slab>
        ) : (
          <span className="text-xs text-cream-dim">{pt.top}</span>
        )}
      </section>

      <section className="mt-5 space-y-2" data-porta-quay>
        <Label>{pt.quay}</Label>
        <p className="text-xs text-cream-dim">{pt.quayText}</p>
        {[
          ...v.vehicles.map((x) => ({
            id: x.id,
            name: pt.model[x.model] ?? x.model,
            place: x.place,
            arrivesAt: x.arrivesAt,
            role: pt.combat,
          })),
          ...v.transports.map((x) => ({
            id: x.id,
            name: x.type,
            place: x.place,
            arrivesAt: x.arrivesAt,
            role: pt.transport,
          })),
        ].map((x) => (
          <div
            key={x.id}
            className="flex items-center gap-3 border-b border-line/60 pb-2"
            data-quay={x.id}
          >
            <span className="min-w-0 flex-1 text-sm text-cream">
              {x.name}
              <span className="block text-xs text-cream-dim">
                {x.role} · {pt.place_[x.place]}
                {x.arrivesAt && x.arrivesAt > now && x.place !== "battle"
                  ? ` · ${Math.ceil((x.arrivesAt - now) / 60_000)} min`
                  : ""}
              </span>
            </span>
            {x.place === "remise" && (
              <Slab
                size="sm"
                tone="ghost"
                disabled={off}
                onClick={() => void act({ type: "empireSendToPorta", vehicleIds: [x.id] })}
              >
                {pt.send}
              </Slab>
            )}
            {x.place === "porta" && (
              <Slab
                size="sm"
                tone="ghost"
                disabled={off}
                onClick={() => void act({ type: "empireRecallFromPorta", vehicleIds: [x.id] })}
              >
                {pt.recall}
              </Slab>
            )}
          </div>
        ))}
      </section>

      <section className="mt-5 space-y-3" data-porta-battle>
        <Label>{pt.battle}</Label>
        {state?.battle && !state.battle.over ? (
          <Slab tone="gold" onClick={onBattle}>
            {pt.inBattle}
          </Slab>
        ) : lobby ? (
          <div className="rounded-xl border border-info/50 bg-night-2 p-3" data-porta-lobby>
            <p className="text-sm text-cream">
              {pt.lobby} · {pt.tier(lobby.tier)} · {pt.lobbyPlayers(lobby.players)}
            </p>
            {lobby.code && (
              <p className="mt-1 font-display text-lg font-bold tabular-nums tracking-widest text-gold">
                {pt.lobbyCode(lobby.code)}
              </p>
            )}
            {lobby.waitUntil && (
              <p className="mt-1 text-xs text-cream-dim">
                {pt.lobbyWait(Math.max(0, Math.ceil((lobby.waitUntil - Date.now()) / 1_000)))}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {(lobby.owner || !lobby.code) && (
                <Slab tone="gold" size="sm" disabled={off} onClick={() => void go(portaApi.launch)}>
                  {pt.launch}
                </Slab>
              )}
              <Slab tone="ghost" size="sm" disabled={off} onClick={() => void go(portaApi.leave)}>
                {pt.leave}
              </Slab>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-cream-dim">
                {pt.combat}
                <select
                  className="mt-1 w-full rounded-lg border border-edge bg-night-3 px-2 py-2 text-sm text-cream"
                  value={combatId}
                  onChange={(e) => setCombatId(e.target.value)}
                >
                  {combats.length === 0 && <option value="">{pt.noCombat}</option>}
                  {combats.map((x) => (
                    <option key={x.id} value={x.id}>
                      {pt.model[x.model] ?? x.model} · {pt.hp(x.stats.hp)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-cream-dim">
                {pt.transport}
                <select
                  className="mt-1 w-full rounded-lg border border-edge bg-night-3 px-2 py-2 text-sm text-cream"
                  value={transportId}
                  onChange={(e) => setTransportId(e.target.value)}
                >
                  {transports.length === 0 && <option value="">{pt.noTransport}</option>}
                  {transports.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.type} · {x.hold}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ul className="grid grid-cols-3 gap-2" data-porta-tiers>
              {v.tiers.map((x) => (
                <li key={x.tier}>
                  <button
                    type="button"
                    disabled={!x.open}
                    onClick={() => setTier(x.tier)}
                    aria-pressed={tier === x.tier}
                    className={`w-full rounded-xl border px-2 py-2 text-left text-xs disabled:opacity-40 ${tier === x.tier ? "border-info text-cream" : "border-line text-cream-dim"}`}
                  >
                    <span className="block font-semibold">{pt.tier(x.tier)}</span>
                    {pt.players(x.minPlayers, x.maxPlayers)}
                  </button>
                </li>
              ))}
            </ul>
            {line && (
              <p className="text-xs text-cream-dim">
                {line.open ? pt.entry(line.bread) : pt.tierLocked(line.tier)} ·{" "}
                {RARITIES.filter((r) => line.weights[r] > 0)
                  .map((r) => pt.rarity[r])
                  .join(", ")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {line && line.minPlayers === 1 && (
                <Slab
                  tone="gold"
                  size="sm"
                  disabled={off || !ready || !line.open}
                  onClick={() => void go(() => portaApi.queue("solo", entry))}
                >
                  {pt.solo}
                </Slab>
              )}
              <Slab
                tone="ghost"
                size="sm"
                disabled={off || !ready || !line?.open}
                onClick={() => void go(() => portaApi.queue("public", entry))}
              >
                {pt.public}
              </Slab>
              <Slab
                tone="ghost"
                size="sm"
                disabled={off || !ready || !line?.open}
                onClick={() => void go(() => portaApi.queue("invite", entry))}
              >
                {pt.invite}
              </Slab>
            </div>
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder={pt.codePlaceholder}
                aria-label={pt.codePlaceholder}
                className="min-w-0 flex-1 rounded-lg border border-edge bg-night-3 px-3 py-2 font-display text-sm tabular-nums text-cream"
              />
              <Slab
                tone="ghost"
                size="sm"
                disabled={off || !ready || code.length !== 6}
                onClick={() => void go(() => portaApi.join(code, { combatId, transportId }))}
              >
                {pt.join}
              </Slab>
            </div>
          </>
        )}
        {error && (
          <p className="text-xs font-semibold text-vermilion" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="mt-5 space-y-2" data-porta-antiquarian>
        <Label>{pt.antiquarian}</Label>
        <p className="text-xs text-cream-dim">{pt.antiquarianText}</p>
        {RARITIES.map((r) => {
          const n = v.relics[r];
          const price = v.relicPrices[r];
          return (
            <div
              key={r}
              className="flex items-center gap-3 border-b border-line/60 pb-2"
              data-relic={r}
            >
              <span className="min-w-0 flex-1 text-sm text-cream">
                {pt.rarity[r]} · ×{n}
                <span className="block text-xs text-cream-dim">
                  <Coin size={11} /> {d(price.price)} · {pt.points(price.points)}
                </span>
              </span>
              <Slab
                size="sm"
                tone="ghost"
                disabled={off || n === 0}
                onClick={() => void act({ type: "empireSellRelics", rarity: r, qty: n })}
              >
                {pt.sell}
              </Slab>
            </div>
          );
        })}
        <p className="text-xs text-gold">{pt.week(v.weekPoints)}</p>
      </section>

      <section className="mt-5 space-y-2" data-porta-ranking>
        <Label>{pt.ranking}</Label>
        {ranking && <p className="text-xs text-cream-dim">{pt.rankingBand(ranking.band)}</p>}
        {ranking && ranking.lines.length === 0 && (
          <p className="text-xs text-cream-dim">{pt.rankingEmpty}</p>
        )}
        <ol className="space-y-1">
          {ranking?.lines.map((l) => (
            <li
              key={l.rank}
              className={`flex justify-between text-sm ${l.me ? "text-info" : "text-cream"}`}
            >
              <span>
                {l.rank}. {l.pseudo}
              </span>
              <Badge tone={l.me ? "info" : "ghost"}>{pt.points(l.points)}</Badge>
            </li>
          ))}
        </ol>
        {ranking?.mine && !ranking.lines.some((l) => l.me) && (
          <p className="text-sm text-info">
            {ranking.mine.rank}. · {pt.points(ranking.mine.points)}
          </p>
        )}
      </section>
    </Sheet>
  );
}
