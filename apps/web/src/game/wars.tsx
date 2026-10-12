import { GuildCrest } from "../art/guildCrest.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Label, Panel, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { ConcessionView, WarView } from "./types.js";

const t = () => fr.game.wars;

/** The two sides' units, face to face; the Seigneurie stands for its threshold. */
export function WarBar({ war }: { war: WarView }) {
  const defence = war.defender ? war.score.defender : Math.max(war.threshold, war.score.defender);
  const total = Math.max(1, war.score.attacker + defence);
  const share = war.score.attacker / total;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5">
          {war.attackerEmblem && <GuildCrest emblem={war.attackerEmblem} size={22} />}
          <span className="truncate font-semibold text-gold">{war.attackerName}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-semibold text-lagoon">
            {war.defenderName ?? t().seigneurie}
          </span>
          {war.defenderEmblem && <GuildCrest emblem={war.defenderEmblem} size={22} />}
        </span>
      </div>
      <div className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-lagoon/70">
        <span
          className="absolute inset-y-0 left-0 bg-gold transition-[width] duration-700"
          style={{ width: `${share * 100}%` }}
        />
        <span className="absolute inset-y-0 left-1/2 w-px bg-night/70" />
      </div>
      <div className="mt-1 flex justify-between font-display text-sm tabular-nums">
        <span className="text-gold">{war.score.attacker}</span>
        <span className="text-lagoon">
          {defence}
          {!war.defender && <span className="text-[10px] text-cream-dim"> {t().threshold}</span>}
        </span>
      </div>
    </div>
  );
}

/** A war: where, what, how long, who leads, and how to take part. */
export function WarCard({ war, props }: { war: WarView; props: GameProps }) {
  const guildless = !props.view.guilds?.mine;
  const live = !war.outcome && props.now < war.endAt;
  return (
    <Panel glow={war.side ? "vermilion" : undefined}>
      <div className="flex items-center gap-3">
        <ResourceIcon code={war.resource} size={40} />
        <div className="min-w-0 flex-1">
          <Label className="text-vermilion">⚔ {t().war}</Label>
          <h3 className="font-display text-base font-extrabold uppercase leading-tight">
            {t().title(props.names.resource(war.resource), props.names.city(war.city))}
          </h3>
        </div>
        {live ? (
          <span className="label shrink-0 text-vermilion">{clock(war.endAt - props.now)}</span>
        ) : (
          <Badge tone={war.outcome === "attacker" ? "gold" : "lagoon"}>
            {war.outcome === "attacker" ? war.attackerName : (war.defenderName ?? t().seigneurie)}
          </Badge>
        )}
      </div>
      <div className="mt-3">
        <WarBar war={war} />
      </div>
      {war.side && (
        <p className="mt-2 text-sm text-gold">
          {t().yourSide(war.side === "attacker" ? war.attackerName : (war.defenderName ?? ""))}
          {war.supplied > 0 && ` · ${t().supplied(war.supplied)}`}
        </p>
      )}
      {live && !war.side && guildless && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-cream-dim">{t().enlistHelp}</p>
          <div className="flex gap-2">
            <Slab
              size="sm"
              className="flex-1"
              disabled={props.busy}
              onClick={() => props.act({ type: "enlist", warId: war.id, side: "attacker" })}
            >
              {t().supply(war.attackerName, d(war.bounty.attacker))}
            </Slab>
            {war.defender && (
              <Slab
                size="sm"
                tone="lagoon"
                className="flex-1"
                disabled={props.busy}
                onClick={() => props.act({ type: "enlist", warId: war.id, side: "defender" })}
              >
                {t().supply(war.defenderName ?? "", d(war.bounty.defender))}
              </Slab>
            )}
          </div>
        </div>
      )}
      {live && (war.side || guildless) && (
        <Slab tone="ghost" size="sm" className="mt-3 w-full" onClick={() => props.goTo("routes")}>
          {t().toRoad}
        </Slab>
      )}
    </Panel>
  );
}

const REFUSALS = () => t().refusals as Record<string, string>;

/** The concessions of the Veneto: holders, tolls, and declaring war on one (by a guild's vote). */
export function Concessions({ props }: { props: GameProps }) {
  const wars = props.view.wars;
  const mine = props.view.guilds?.mine;
  if (!wars) return null;
  const rules = props.catalog.warRules;
  const pending = !!mine?.proposals.some((p) => p.kind === "war" && p.status === "open");
  return (
    <Panel>
      <Label>{t().concessions}</Label>
      <p className="mt-1 text-xs text-cream-dim">
        {t().concessionsHelp(Math.round(rules.memberPremiumBps / 100), d(rules.stake), rules.hours)}
      </p>
      <ul className="mt-3 divide-y divide-line/60">
        {wars.concessions.map((c: ConcessionView) => {
          const ours = !!mine && c.holder === mine.id;
          return (
            <li key={c.code} className="flex items-center gap-2 py-2">
              <ResourceIcon code={c.resource} size={26} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {props.names.city(c.city)}
                  <span className="font-normal text-cream-dim">
                    {" "}
                    · {props.names.resource(c.resource).toLowerCase()}
                  </span>
                </p>
                <p className={`truncate text-xs ${ours ? "text-gold" : "text-cream-dim"}`}>
                  {c.holderName ?? t().seigneurie}
                  {c.tollBps > 0 && ` · ${t().toll(Math.round(c.tollBps / 100))}`}
                </p>
              </div>
              {c.holderEmblem && <GuildCrest emblem={c.holderEmblem} size={26} />}
              {c.war ? (
                <Badge tone="vermilion">⚔</Badge>
              ) : mine && !ours ? (
                <button
                  type="button"
                  disabled={!!c.refusal || pending || props.busy}
                  title={c.refusal ? REFUSALS()[c.refusal] : undefined}
                  onClick={() =>
                    props.act({ type: "propose", proposal: { kind: "war", target: c.code } })
                  }
                  className="label shrink-0 rounded-full px-2 py-1 text-vermilion ring-1 ring-vermilion/60 disabled:opacity-35"
                >
                  {c.refusal === "concession_protected"
                    ? clock(c.protectedUntil - props.now)
                    : t().declare}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** The wars under way and the last ones decided. */
export function WarList({ props }: { props: GameProps }) {
  const wars = props.view.wars;
  if (!wars || (wars.live.length === 0 && wars.recent.length === 0)) return null;
  return (
    <div className="space-y-3">
      <Label className="text-vermilion">{t().live}</Label>
      {wars.live.length === 0 && <p className="text-sm text-cream-dim">{t().none}</p>}
      {wars.live.map((w) => (
        <WarCard key={w.id} war={w} props={props} />
      ))}
      {wars.recent.length > 0 && (
        <details>
          <summary className="label cursor-pointer">{t().recent}</summary>
          <div className="mt-2 space-y-3">
            {wars.recent.map((w) => (
              <WarCard key={w.id} war={w} props={props} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
