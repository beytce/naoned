import { useEffect, useRef, useState } from "react";
import { Crest, defaultCrest } from "../art/crest.js";
import { type DomainPlot, DomainScene, skyPhase } from "../art/domain.js";
import { MasteryEmblem } from "../art/mastery.js";
import { fr } from "../i18n.js";
import { Label } from "../ui.js";
import type { GameProps } from "./Game.js";

/** How long the golden burst of a new building or level lasts. */
const BURST_MS = 3_000;

function parisHour(now: number): number {
  return Number(
    new Intl.DateTimeFormat("fr-FR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/Paris",
    })
      .formatToParts(new Date(now))
      .find((p) => p.type === "hour")?.value ?? 12,
  );
}

/**
 * The merchant's domain at the head of the counter: what they have built, drawn on their land.
 * A touch on a workshop opens it; a touch on an empty plot leads to what can be built.
 */
export function Domain(props: GameProps) {
  const { view, now, catalog } = props;
  // Buildings just built or upgraded since the last view: a golden burst on their plot.
  const seen = useRef<Map<string, number> | null>(null);
  const [bursts, setBursts] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const levels = new Map(view.buildings.map((b) => [b.id, b.level]));
    const before = seen.current;
    seen.current = levels;
    if (!before) return;
    const grown = [...levels].filter(([id, level]) => (before.get(id) ?? 0) < level);
    if (grown.length === 0) return;
    const at = Date.now();
    setBursts((old) => new Map([...old, ...grown.map(([id]) => [id, at] as const)]));
  }, [view.buildings]);

  const plots: DomainPlot[] = view.buildings.map((b) => {
    const ready = b.job
      ? Math.min(b.job.batches, Math.floor((now - b.job.startedAt) / b.job.batchMs))
      : 0;
    return {
      id: b.id,
      type: b.type,
      level: b.level,
      active: b.job !== null && ready < b.job.batches,
      ready: ready > 0,
      burst: (bursts.get(b.id) ?? 0) + BURST_MS > Date.now(),
    };
  });
  const levels = view.buildings.reduce((n, b) => n + b.level, 0);
  const stock = view.inventory.reduce((n, i) => n + i.available, 0);
  const home = (view.road?.vehicles ?? []).filter((v) => v.status === "free").map((v) => v.type);
  const crest = props.account.crest ?? defaultCrest(props.account.id);
  const t = fr.game.domain;

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-night-2">
      <div className="flex items-end justify-between gap-3 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <Label className="text-gold">{view.standing.title.current.name}</Label>
          <h2 className="truncate font-display text-lg font-extrabold uppercase leading-tight">
            {t.house(props.account.pseudo ?? "")}
          </h2>
        </div>
        <p className="label shrink-0 text-right">
          {t.workshops(view.buildings.length)}
          <br />
          {t.levels(levels)}
        </p>
      </div>
      <DomainScene
        region={view.player.region}
        phase={skyPhase(parisHour(now))}
        plots={plots}
        maxPlots={catalog.rules.maxBuildings}
        vehiclesHome={home}
        stock={stock}
        crest={<Crest crest={crest} size={26} />}
        emblem={
          view.mastery.chosen ? <MasteryEmblem code={view.mastery.chosen} size={20} /> : undefined
        }
        labelOf={(p) => `${props.names.building(p.type)}, ${fr.game.level(p.level)}`}
        emptyLabel={t.build}
        title={t.title(view.buildings.length, levels)}
        onPlot={(p) => {
          const b = view.buildings.find((x) => x.id === p.id);
          if (!b) return;
          if (b.job === null && b.canStart > 0) props.setSheet(`produce:${b.id}`);
          else if (b.upgradeCost) props.setSheet(`upgrade:${b.id}`);
          else props.setSheet(`produce:${b.id}`);
        }}
        onEmpty={() =>
          document
            .getElementById("build-section")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />
    </section>
  );
}
