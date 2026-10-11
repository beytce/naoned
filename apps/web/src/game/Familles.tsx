import { useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Qty, Ribbon, Slab, Stat, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { FamiliesView, FamilyOrderView } from "./types.js";

const t = () => fr.game.families;

function familyName(props: GameProps, code: string | null): string {
  return props.catalog.families.find((f) => f.code === code)?.name ?? code ?? "";
}

function personName(props: GameProps, id: string | null): string {
  if (!id) return t().noOne;
  return props.people[id] ?? fr.game.anonymous;
}

/** One of the four families, as a card to choose from (or to watch before allegiance opens). */
function FamilyCard({
  code,
  fam,
  props,
  canPledge,
}: { code: string; fam: FamiliesView; props: GameProps; canPledge: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const def = props.catalog.families.find((f) => f.code === code);
  const standing = fam.standings.find((s) => s.family === code);
  if (!def) return null;
  return (
    <Panel glow={fam.inPower === code ? "gold" : undefined}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold uppercase leading-tight">
            {def.name}
          </h2>
          <p className="label mt-1">{def.domain}</p>
        </div>
        {fam.inPower === code && <Badge>{t().inPower}</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(def.quantities).map(([r, q]) => (
          <span
            key={r}
            className="flex items-center gap-1 rounded-lg bg-night-2 px-2 py-1 text-xs ring-1 ring-inset ring-line/70"
          >
            <ResourceIcon code={r} size={18} />
            {q} {props.names.resource(r).toLowerCase()}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-cream-dim">{t().members(standing?.members ?? 0)}</p>
      {canPledge &&
        (confirm ? (
          <div className="mt-3 flex gap-2">
            <Slab
              className="flex-1"
              size="sm"
              disabled={props.busy}
              onClick={() => props.act({ type: "joinFamily", family: code })}
            >
              {t().confirm}
            </Slab>
            <Slab tone="ghost" size="sm" onClick={() => setConfirm(false)}>
              {t().cancel}
            </Slab>
          </div>
        ) : (
          <Slab className="mt-3 w-full" size="sm" onClick={() => setConfirm(true)}>
            {t().pledge}
          </Slab>
        ))}
    </Panel>
  );
}

function OrderCard({ o, props }: { o: FamilyOrderView; props: GameProps }) {
  const missing = Math.max(0, o.quantity - have(props.view, o.resource));
  const reward = BigInt(o.unitPrice) * BigInt(o.quantity);
  return (
    <Panel glow={o.done ? undefined : missing === 0 ? "gold" : undefined}>
      <Label>{t().order}</Label>
      <div className={`mt-2 flex items-center gap-3 ${o.done ? "opacity-50" : ""}`}>
        <ResourceIcon code={o.resource} size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold uppercase">
            {o.quantity} {props.names.resource(o.resource).toLowerCase()}
          </p>
          <p className="mt-1 text-xs text-cream-dim">
            {t().orderHelp(props.catalog.familyRules.orderInfluence)}
          </p>
        </div>
        <div className="text-right">
          <Label>{fr.game.contracts.reward}</Label>
          <Big className="mt-1 text-xl text-gold">{d(reward)}</Big>
        </div>
      </div>
      <div className="mt-3">
        {o.done ? (
          <span className="label text-lagoon">✓ {fr.game.contracts.done}</span>
        ) : missing > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-vermilion">{fr.game.contracts.missing(missing)}</span>
            <Slab
              tone="ghost"
              size="sm"
              onClick={() => {
                props.goTo("marche");
                props.setMarketTab("joueurs");
                props.setSheet(`trade:${o.resource}`);
              }}
            >
              {fr.game.contracts.buy}
            </Slab>
          </div>
        ) : (
          <Slab
            className="w-full"
            disabled={props.busy}
            onClick={() => props.act({ type: "fulfillFamilyOrder", orderId: o.id })}
          >
            {fr.game.contracts.deliver}
          </Slab>
        )}
      </div>
    </Panel>
  );
}

function Patronage({ fam, props }: { fam: FamiliesView; props: GameProps }) {
  const unit = BigInt(props.catalog.familyRules.patronageUnit);
  const cash = BigInt(props.view.cash);
  const affordable = unit > 0n ? Number(cash / unit) : 0;
  const max = Math.max(0, Math.min(fam.patronageLeft, affordable));
  const [points, setPoints] = useState(Math.min(5, max));
  const p = Math.max(1, Math.min(points, max));
  return (
    <Panel>
      <Label>{t().patronage}</Label>
      <p className="mt-2 text-sm text-cream-dim">{t().patronageHelp}</p>
      <p className="label mt-3">{t().patronageLeft(fam.patronageLeft)}</p>
      {max > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <Qty value={p} max={max} onChange={setPoints} />
          <Slab disabled={props.busy} onClick={() => props.act({ type: "patronize", points: p })}>
            {t().give(d(unit * BigInt(p)))}
          </Slab>
        </div>
      )}
      {max > 0 && <p className="mt-2 text-right text-xs text-lagoon">{t().points(p)}</p>}
    </Panel>
  );
}

function Standings({ fam, props }: { fam: FamiliesView; props: GameProps }) {
  const top = fam.standings[0]?.score ?? 0;
  return (
    <Panel>
      <Label>{t().standings}</Label>
      <p className="mt-2 text-sm text-cream-dim">
        {t().standingsHelp(props.catalog.familyRules.minMembers)}
      </p>
      {props.catalog.familyRules.incumbentHandicapBps > 0 && fam.inPower && (
        <p className="mt-1 text-xs text-cream-dim">
          {t().contumacia(Math.round(props.catalog.familyRules.incumbentHandicapBps / 100))}
        </p>
      )}
      <ol className="mt-3 space-y-3">
        {fam.standings.map((s, i) => (
          <li key={s.family} className={s.family === fam.mine ? "text-gold" : ""}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display font-extrabold uppercase">
                {i + 1}. {familyName(props, s.family)}{" "}
                {fam.inPower === s.family && <Badge>{t().inPower}</Badge>}
              </span>
              <span className="font-display tabular-nums">{(s.score / 100).toFixed(1)}</span>
            </div>
            <div className="mt-1">
              <Ribbon value={top > 0 ? s.score / top : 0} tone="lagoon" />
            </div>
            <p className="mt-1 text-xs text-cream-dim">
              {t().members(s.members)} · {t().champion} : {personName(props, s.champion)}
              {s.champion && props.bots.has(s.champion) && ` (${fr.game.npc})`}
            </p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Members({ fam, props }: { fam: FamiliesView; props: GameProps }) {
  const cap = props.catalog.familyRules.weeklyCapPerMember;
  return (
    <Panel>
      <Label>{t().house}</Label>
      <p className="mt-1 text-xs text-cream-dim">{t().cap(cap)}</p>
      <ul className="mt-3 space-y-3">
        {fam.members.map((m) => (
          <li key={m.playerId}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className={m.me ? "font-semibold text-gold" : ""}>
                {m.me ? t().you : personName(props, m.playerId)}{" "}
                {props.bots.has(m.playerId) && <Badge tone="ghost">{fr.game.npc}</Badge>}
              </span>
              <span className="tabular-nums text-cream-dim">{m.week}</span>
            </div>
            <div className="mt-1">
              <Ribbon value={cap > 0 ? m.week / cap : 0} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The patrician families: allegiance, the family's order, patronage and the weekly race. */
export function Familles(props: GameProps) {
  const fam = props.view.families;
  if (!fam) return null;
  const header = (
    <header>
      <Label className="text-gold">☆ {t().kicker}</Label>
      <h1 className="mt-2 font-display text-[2rem] font-extrabold uppercase leading-[1.05]">
        {t().title}
      </h1>
      <p className="mt-2 text-sm text-cream-dim">{t().help}</p>
    </header>
  );
  const codes = props.catalog.families.map((f) => f.code);

  if (!fam.mine) {
    const open = fam.opensAt <= props.now;
    return (
      <section className="space-y-4">
        {header}
        {open ? (
          <>
            <Label>{t().choose}</Label>
            <p className="text-sm text-cream-dim">{t().chooseHelp}</p>
          </>
        ) : (
          <p className="text-sm text-lagoon">{t().opensIn(clock(fam.opensAt - props.now))}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {codes.map((c) => (
            <FamilyCard key={c} code={c} fam={fam} props={props} canPledge={open} />
          ))}
        </div>
        <Standings fam={fam} props={props} />
      </section>
    );
  }

  const def = props.catalog.families.find((f) => f.code === fam.mine);
  const power = fam.inPower === fam.mine;
  return (
    <section className="space-y-4">
      {header}
      <Panel glow={power ? "gold" : "lagoon"}>
        <Label>{t().yours}</Label>
        <div className="mt-1 flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold uppercase">{def?.name}</h2>
          {power && <Badge>{t().inPower}</Badge>}
        </div>
        <p className="label mt-1">{def?.domain}</p>
        {power && (
          <p className="mt-2 text-sm text-gold">
            {t().powerHelp(Math.round(props.catalog.familyRules.powerPremiumBps / 100))}
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label={t().influenceWeek} value={fam.influence.week} tone="lagoon" />
          <Stat label={t().influenceSeason} value={fam.influence.season} />
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {fam.orders.map((o) => (
            <OrderCard key={o.id} o={o} props={props} />
          ))}
          <Patronage fam={fam} props={props} />
        </div>
        <div className="space-y-4">
          <Standings fam={fam} props={props} />
          <Members fam={fam} props={props} />
        </div>
      </div>
    </section>
  );
}
