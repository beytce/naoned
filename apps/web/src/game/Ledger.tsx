import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Label, Panel, Ribbon, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import { missionGo } from "./missionGo.js";
import { vehicleName } from "./roadKit.js";
import type { MissionView } from "./types.js";

function Reward({ m }: { m: MissionView }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      {Object.entries(m.reward.goods).map(([r, q]) => (
        <span key={r} className="inline-flex items-center gap-1">
          <ResourceIcon code={r} size={18} />
          {q}
        </span>
      ))}
      {BigInt(m.reward.ducats) > 0n && <span className="text-gold">{d(m.reward.ducats)}</span>}
      {m.reward.vehicles.length > 0 && (
        <span className="font-semibold text-lagoon">
          {m.reward.vehicles.map((v) => fr.game.carnet.vehicle(vehicleName(v))).join(" ")}
        </span>
      )}
    </span>
  );
}

/**
 * The merchant's ledger: today's goals, with their reward, and when the next one opens.
 * Shown on the counter until every mission is claimed.
 */
export function Ledger(props: GameProps) {
  const t = fr.game.ledger;
  const missions = props.view.missions;
  if (missions.length === 0 || missions.every((m) => m.claimed)) return null;
  const open = missions.filter((m) => m.unlocked && !m.claimed);
  const next = missions.find((m) => !m.unlocked);
  const claimedCount = missions.filter((m) => m.claimed).length;
  return (
    <Panel glow={open.some((m) => m.done) ? "gold" : "lagoon"}>
      <div className="flex items-center justify-between">
        <Label className="text-gold">{t.title}</Label>
        <span className="meta">
          {claimedCount}/{missions.length}
        </span>
      </div>
      <ul className="mt-3 space-y-3">
        {open.map((m) => {
          const [title, why] = t.items[m.id] ?? [m.id, ""];
          const go = m.done ? null : missionGo(props, m.id);
          return (
            <li key={m.id} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-cream-dim">{why}</p>
                </div>
                {m.done ? (
                  <Slab
                    size="sm"
                    coach={`claim-${m.id}`}
                    disabled={props.busy}
                    onClick={() => props.act({ type: "claimMission", missionId: m.id })}
                  >
                    {t.claim}
                  </Slab>
                ) : go ? (
                  <Slab size="sm" tone="ghost" onClick={go}>
                    {t.go}
                  </Slab>
                ) : null}
              </div>
              {!m.done && m.count > 1 && <Ribbon value={m.progress / m.count} tone="lagoon" />}
              {!m.done && (
                <p className="meta">
                  {m.progress}/{m.count}
                </p>
              )}
              <div className="flex items-center gap-2">
                <span className="label">{t.reward}</span>
                <Reward m={m} />
              </div>
            </li>
          );
        })}
      </ul>
      {open.length === 0 && <p className="mt-2 text-sm text-cream-dim">{t.allDone}</p>}
      {next && (
        <p className="meta mt-3 text-lagoon">
          {t.next(t.items[next.id]?.[0] ?? next.id, clock(next.opensAt - props.now))}
        </p>
      )}
    </Panel>
  );
}
