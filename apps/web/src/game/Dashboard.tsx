import { useEffect, useState } from "react";
import { fr } from "../i18n.js";
import { Sheet } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { DashboardView } from "./types.js";

const t = fr.game.dashboard;

const COLOR = {
  me: "rgb(var(--gold))",
  rival: "rgb(var(--info))",
  leader: "rgb(var(--cream-dim))",
} as const;

/** What the workshops earn an hour at reference prices, from the view (no request). */
function perHour(props: GameProps): bigint {
  return props.view.buildings.reduce((n, b) => n + BigInt(b.economics.marginPerHour), 0n);
}

/** On the Comptoir: what the counter earns an hour, and a door to the dashboard. */
export function DashboardTile(props: GameProps) {
  return (
    <button
      type="button"
      onClick={() => props.setSheet("dashboard")}
      className="flex w-full items-center gap-3 cut border border-line bg-night-3 px-3 py-2 text-left text-sm text-cream-dim transition active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-cream">{t.title}</span>
        <span className="label block">{t.perHour(d(perHour(props)))}</span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

/** The counter's dashboard: an hour, a day, a week, and seven days against the rival and the first. */
export function DashboardSheet(props: GameProps) {
  const open = props.sheet === "dashboard";
  const [data, setData] = useState<DashboardView | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    gameApi
      .dashboard()
      .then((r) => live && setData(r))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [open]);
  return (
    <Sheet open={open} onClose={() => props.setSheet(null)}>
      <div className="space-y-4 pt-6">
        <h3 className="font-display text-xl font-extrabold uppercase">{t.title}</h3>
        <p className="note">{t.help(data?.days.length ?? 7)}</p>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Figure label={t.hour} value={d(perHour(props))} />
          <Figure label={t.today} value={data ? d(data.today) : "…"} />
          <Figure label={t.week} value={data ? d(data.week) : "…"} />
        </dl>
        {data && <Curves data={data} />}
      </div>
    </Sheet>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="cut bg-night-3 px-2 py-2 ring-1 ring-inset ring-line">
      <dt className="label">{label}</dt>
      <dd className="font-mono text-base tabular-nums text-cream">{value}</dd>
    </div>
  );
}

/** Seven days (thirty with the Pass) of net sales added up, one line per merchant. */
function Curves({ data }: { data: DashboardView }) {
  const W = 320;
  const H = 130;
  const lines = data.lines.map((l) => {
    const points: number[] = [];
    for (const v of l.daily) points.push((points.at(-1) ?? 0) + Number(BigInt(v)));
    return { ...l, points };
  });
  const all = lines.flatMap((l) => l.points);
  const lo = Math.min(0, ...all);
  const hi = Math.max(1, ...all);
  const x = (i: number) => 6 + (i / Math.max(1, data.days.length - 1)) * (W - 12);
  const y = (v: number) => H - 18 - ((v - lo) / (hi - lo)) * (H - 30);
  // Seven days: each weekday; thirty: the date, one week apart (the last one always).
  const long = data.days.length > 7;
  const dayLabel = (day: string) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString(
      "fr-FR",
      long ? { day: "numeric", month: "short" } : { weekday: "short" },
    );
  const shown = (i: number) => !long || (data.days.length - 1 - i) % 7 === 0;
  // The first label shown and the last one hug the edges, so none is cut by the chart.
  const first = data.days.findIndex((_, i) => shown(i));
  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={t.chart(data.days.length)}
        className="block cut bg-night-3 ring-1 ring-inset ring-line"
      >
        <line x1="6" x2={W - 6} y1={y(0)} y2={y(0)} stroke="rgb(var(--line))" />
        {data.days.map((day, i) =>
          shown(i) ? (
            <text
              key={day}
              x={x(i)}
              y={H - 4}
              textAnchor={i === first ? "start" : i === data.days.length - 1 ? "end" : "middle"}
              fontSize="9"
              fill="rgb(var(--cream-dim))"
            >
              {dayLabel(day)}
            </text>
          ) : null,
        )}
        {lines
          .slice()
          .reverse()
          .map((l) => (
            <path
              key={l.who}
              d={l.points
                .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
                .join(" ")}
              fill="none"
              stroke={COLOR[l.who]}
              strokeWidth={l.who === "me" ? 2.5 : 1.5}
              strokeDasharray={l.who === "leader" ? "4 3" : undefined}
              strokeLinejoin="round"
            />
          ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {lines.map((l) => (
          <span key={l.who} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4"
              style={{ background: COLOR[l.who] }}
            />
            <span className="text-cream-dim">
              {t.who[l.who](l.pseudo ?? "—")} · {d(BigInt(l.points.at(-1) ?? 0))}
            </span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
