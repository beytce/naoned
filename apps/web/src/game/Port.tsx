import { useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { Galley, PortArt } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { Big, Label, Panel, Ribbon, Sheet, Slab, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { Destination, ExpeditionView } from "./types.js";

const pct = (bps: number) => `${bps / 100} %`;

function ActiveGalley({ e, props }: { e: ExpeditionView; props: GameProps }) {
  const back = props.now >= e.returnAt;
  const progress = (props.now - e.departAt) / (e.returnAt - e.departAt);
  const port = props.catalog.ports.find((p) => p.code === e.destination)?.name ?? e.destination;
  return (
    <Panel glow={back ? "gold" : "lagoon"}>
      <div className="flex items-center justify-between">
        <Label className={back ? "text-gold" : "text-lagoon"}>
          {back ? fr.game.port.back : fr.game.port.atSea}
        </Label>
        <span className="label">{port}</span>
      </div>
      {back ? (
        <Slab
          size="lg"
          className="mt-3 w-full"
          disabled={props.busy}
          onClick={() => props.act({ type: "collectExpedition", expeditionId: e.id })}
        >
          {fr.game.port.unload}
        </Slab>
      ) : (
        <div className="mt-2 space-y-3">
          <Big className="text-4xl">{clock(e.returnAt - props.now)}</Big>
          <Ribbon value={progress} tone="lagoon" />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {Object.entries(e.cargo).map(([r, q]) => (
          <span key={r} className="inline-flex items-center gap-1 text-sm">
            <ResourceIcon code={r} size={20} />
            {q}
          </span>
        ))}
        <span className="label ml-auto">{d(e.cargoValue)}</span>
      </div>
    </Panel>
  );
}

function DestinationCard(props: {
  code: string;
  dest: Destination;
  game: GameProps;
  busy: boolean;
  onCharter: () => void;
}) {
  const { dest, game } = props;
  const name = game.catalog.ports.find((p) => p.code === props.code)?.name ?? props.code;
  const stats: [string, string][] = [
    [fr.game.port.duration, `${dest.hours} h`],
    [
      fr.game.port.risk,
      `${pct(dest.riskBps)} · ${pct(dest.escortRiskBps)} ${fr.game.port.escortRisk}`,
    ],
    [fr.game.port.gain, `+${pct(dest.gainBps)}`],
    [fr.game.port.charter, d(dest.charter)],
    [fr.game.port.escort, d(dest.escort)],
    [
      fr.game.port.provisions,
      Object.entries(dest.provisions)
        .map(([r, q]) => `${q} ${game.names.resource(r).toLowerCase()}`)
        .join(", "),
    ],
  ];
  return (
    <Panel>
      <PortArt
        code={props.code}
        className="-mx-4 -mt-4 mb-3 h-24 w-[calc(100%+2rem)] max-w-none bg-night-2"
      />
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-extrabold uppercase">{name}</h2>
        <div className="flex items-center gap-2">
          <span className="label">{fr.game.port.brings}</span>
          <ResourceIcon code={dest.returns} size={36} />
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">{k}</dt>
            <dd className="text-sm font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <Slab className="mt-4 w-full" tone="lagoon" disabled={props.busy} onClick={props.onCharter}>
        {fr.game.port.charterBtn}
      </Slab>
    </Panel>
  );
}

function Stepper({
  value,
  max,
  onChange,
}: { value: number; max: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(max, v)));
  const btn = "slab h-9 min-w-9 bg-night-4 px-2 font-display text-sm ring-1 ring-inset ring-line";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={btn} onClick={() => set(value - 10)}>
        <span>−10</span>
      </button>
      <span className="w-12 text-center font-display text-base tabular-nums">{value}</span>
      <button type="button" className={btn} onClick={() => set(value + 10)}>
        <span>+10</span>
      </button>
      <button type="button" className="label px-1 text-gold" onClick={() => set(max)}>
        max
      </button>
    </div>
  );
}

function CharterSheet({
  code,
  dest,
  props,
}: { code: string; dest: Destination; props: GameProps }) {
  const [cargo, setCargo] = useState<Record<string, number>>({});
  const [escort, setEscort] = useState(false);
  const refs = props.catalog.referencePrices;
  const shippable = props.catalog.resources.filter(
    (r) => r.tier !== "luxury" && have(props.view, r.code) > 0,
  );
  const value = Object.entries(cargo).reduce(
    (v, [r, q]) => v + BigInt(refs[r] ?? "0") * BigInt(q),
    0n,
  );
  const max = BigInt(dest.maxCargoValue);
  const back =
    BigInt(refs[dest.returns] ?? "1") > 0n
      ? (value * BigInt(10_000 + dest.gainBps)) / 10_000n / BigInt(refs[dest.returns] ?? "1")
      : 0n;
  const fee = BigInt(dest.charter) + (escort ? BigInt(dest.escort) : 0n);
  const food = Object.entries(dest.provisions).every(
    ([r, q]) => have(props.view, r) - (cargo[r] ?? 0) >= q,
  );
  const name = props.catalog.ports.find((p) => p.code === code)?.name ?? code;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Galley className="h-16 w-24" sailing />
        <div>
          <Label>{fr.game.port.cargo}</Label>
          <h3 className="font-display text-lg font-extrabold uppercase">{name}</h3>
        </div>
      </div>
      {shippable.length === 0 ? (
        <p className="text-sm text-cream-dim">{fr.game.port.nothing}</p>
      ) : (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {shippable.map((r) => (
            <div key={r.code} className="flex items-center gap-2">
              <ResourceIcon code={r.code} size={28} />
              <span className="flex-1 text-sm">
                {r.name} <span className="text-muted">({have(props.view, r.code)})</span>
              </span>
              <Stepper
                value={cargo[r.code] ?? 0}
                max={have(props.view, r.code)}
                onChange={(v) => setCargo({ ...cargo, [r.code]: v })}
              />
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="label">{fr.game.port.cargoValue}</span>
          <span className={value > max ? "text-vermilion" : ""}>
            {d(value)} / {d(max)}
          </span>
        </div>
        <Ribbon value={Number(value) / Number(max)} />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={escort}
          onChange={(e) => setEscort(e.target.checked)}
          className="h-5 w-5 accent-gold"
        />
        {fr.game.port.withEscort} (+{d(dest.escort)}, {fr.game.port.risk.toLowerCase()}{" "}
        {pct(escort ? dest.escortRiskBps : dest.riskBps)})
      </label>
      <div className="flex items-center justify-between bg-night-3 p-3 ring-1 ring-line">
        <div>
          <Label>{fr.game.port.expected}</Label>
          <div className="mt-1 flex items-center gap-2">
            <ResourceIcon code={dest.returns} size={28} />
            <Big className="text-2xl text-gold">{back.toString()}</Big>
          </div>
        </div>
        <div className="text-right">
          <Label>{fr.game.port.charter}</Label>
          <p className="mt-1 font-display text-sm font-semibold">{d(fee)}</p>
        </div>
      </div>
      <Slab
        size="lg"
        className="w-full"
        disabled={
          props.busy || value === 0n || value > max || !food || BigInt(props.view.cash) < fee
        }
        onClick={async () => {
          const filled = Object.fromEntries(Object.entries(cargo).filter(([, q]) => q > 0));
          if (
            await props.act({ type: "launchExpedition", destination: code, cargo: filled, escort })
          ) {
            props.setSheet(null);
          }
        }}
      >
        {fr.game.port.sail}
      </Slab>
    </div>
  );
}

export function Port(props: GameProps) {
  const active = props.view.expeditions.filter((e) => e.outcome === "pending");
  const past = props.view.expeditions.filter((e) => e.outcome !== "pending");
  const full = active.length >= props.catalog.maxGalleys;
  const charterCode = props.sheet?.startsWith("charter:") ? props.sheet.slice(8) : null;
  const charterDest = charterCode ? props.catalog.destinations[charterCode] : undefined;

  return (
    <div className="space-y-6">
      <header className="text-center">
        <Galley className="mx-auto h-32 w-56" sailing={active.length > 0} />
        <Label className="mt-2 text-lagoon">⚓ {fr.game.port.kicker}</Label>
        <h1 className="mt-2 font-display text-[2rem] font-extrabold uppercase leading-[1.05]">
          {fr.game.port.title}
        </h1>
        <p className="mt-2 text-sm text-cream-dim">{fr.game.port.help}</p>
      </header>

      {active.map((e) => (
        <ActiveGalley key={e.id} e={e} props={props} />
      ))}

      {Object.entries(props.catalog.destinations).map(([code, dest]) => (
        <DestinationCard
          key={code}
          code={code}
          dest={dest}
          game={props}
          busy={full}
          onCharter={() => props.setSheet(`charter:${code}`)}
        />
      ))}
      {full && <p className="text-center text-sm text-muted">{fr.game.port.busy}</p>}

      {past.length > 0 && (
        <section className="space-y-2">
          <Label>{fr.game.port.history}</Label>
          {past.map((e) => {
            const dest = props.catalog.destinations[e.destination];
            return (
              <div
                key={e.id}
                className="flex items-center gap-3 border-b border-line/70 py-2 text-sm"
              >
                <span className={e.outcome === "lost" ? "text-vermilion" : "text-lagoon"}>
                  {e.outcome === "lost" ? "☠" : "⚓"}
                </span>
                <span className="flex-1">
                  {props.catalog.ports.find((p) => p.code === e.destination)?.name} ·{" "}
                  {e.outcome === "lost"
                    ? fr.game.port.lost
                    : fr.game.port.returned(e.brought, props.names.resource(dest?.returns ?? ""))}
                </span>
                <span className="label">{d(e.cargoValue)}</span>
              </div>
            );
          })}
        </section>
      )}

      <Sheet open={!!charterDest} onClose={() => props.setSheet(null)}>
        {charterCode && charterDest && (
          <CharterSheet key={charterCode} code={charterCode} dest={charterDest} props={props} />
        )}
      </Sheet>
    </div>
  );
}
