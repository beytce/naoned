import { type ReactNode, useEffect } from "react";
import { P } from "./art/palette.js";

type Tone = "gold" | "lagoon" | "vermilion" | "ghost";

const TONES: Record<Tone, string> = {
  gold: "bg-gold text-ink hover:brightness-105 active:brightness-95",
  lagoon: "bg-lagoon text-on-lagoon hover:brightness-105 active:brightness-95",
  vermilion: "bg-vermilion text-cream hover:brightness-105 active:brightness-95",
  ghost: "bg-night-4 text-cream ring-1 ring-inset ring-line hover:ring-cream-dim/40",
};

/** Main button: a rounded block, gold for the action that matters. */
export function Slab(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  coach?: string;
}) {
  const size = {
    sm: "px-3 py-2 text-xs",
    md: "px-5 py-3 text-sm",
    lg: "px-6 py-4 text-base",
  }[props.size ?? "md"];
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      data-coach={props.coach}
      className={`rounded-xl font-display font-extrabold uppercase tracking-wide transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35 ${size} ${TONES[props.tone ?? "gold"]} ${props.className ?? ""}`}
    >
      <span>{props.children}</span>
    </button>
  );
}

/** Segmented control: the chosen option is a vellum pill. */
export function Tabs<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  coach?: string;
}) {
  return (
    <div className="flex gap-1 rounded-2xl border border-line bg-night-2 p-1">
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <button
            key={o.value}
            type="button"
            data-coach={props.coach ? `${props.coach}-${o.value}` : undefined}
            onClick={() => props.onChange(o.value)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${on ? "bg-cream text-night shadow-sm" : "text-cream-dim hover:text-cream"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Card: deep water with a thin foam line; a coloured line draws the eye when it matters. */
export function Panel({
  children,
  className = "",
  glow,
}: { children: ReactNode; className?: string; glow?: Tone }) {
  const border =
    glow === "gold"
      ? "border-gold/70"
      : glow === "lagoon"
        ? "border-lagoon/60"
        : glow === "vermilion"
          ? "border-vermilion/70"
          : "border-line";
  return (
    <div className={`rounded-2xl border bg-night-3 p-4 ${border} ${className}`}>{children}</div>
  );
}

/** On/off switch (vellum knob), instead of a bare checkbox. */
export function Switch(props: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      onClick={() => props.onChange(!props.checked)}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-night-3 p-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{props.label}</span>
        {props.hint && <span className="block text-xs text-cream-dim">{props.hint}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${props.checked ? "bg-lagoon" : "bg-night-4 ring-1 ring-inset ring-line"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-cream transition-all ${props.checked ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}

/** Small figure tile: a label and a value, side by side with others. */
export function Stat({
  label,
  value,
  tone,
}: { label: ReactNode; value: ReactNode; tone?: "gold" | "lagoon" | "vermilion" }) {
  const color =
    tone === "gold"
      ? "text-gold"
      : tone === "lagoon"
        ? "text-lagoon"
        : tone === "vermilion"
          ? "text-vermilion"
          : "text-cream";
  return (
    <div className="rounded-xl bg-night-2 px-3 py-2.5 ring-1 ring-inset ring-line/70">
      <p className="text-xs text-cream-dim">{label}</p>
      <p className={`mt-0.5 font-display text-base font-extrabold tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`label ${className}`}>{children}</p>;
}

/** Big display number, for money and countdowns. */
export function Big({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-display font-extrabold tabular-nums leading-none ${className}`}>
      {children}
    </p>
  );
}

export function Badge({ children, tone = "gold" }: { children: ReactNode; tone?: Tone }) {
  const look = {
    gold: "bg-gold text-ink",
    lagoon: "bg-lagoon text-on-lagoon",
    vermilion: "bg-vermilion text-cream",
    ghost: "bg-night-4 text-cream",
  }[tone];
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest ${look}`}
    >
      <span>{children}</span>
    </span>
  );
}

/** Striped progress bar, like a guild ledger's ribbon. */
export function Ribbon({
  value,
  label,
  tone = "gold",
}: { value: number; label?: string; tone?: "gold" | "lagoon" }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative h-6 overflow-hidden rounded-full bg-night ring-1 ring-line">
      <div
        className={`stripes h-full rounded-full ${tone === "gold" ? "bg-gold" : "bg-lagoon"} transition-all duration-500`}
        style={{ width: `${v * 100}%` }}
      />
      {label && (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold tracking-widest text-cream [text-shadow:0_1px_2px_#000]">
          {label}
        </span>
      )}
    </div>
  );
}

export function Sparkline({
  points,
  width = 96,
  height = 28,
}: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <path
          d={`M2 ${height / 2} H${width - 2}`}
          stroke={P.line}
          strokeWidth="2"
          strokeDasharray="3 4"
        />
      </svg>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map(
    (p, i) =>
      [
        2 + (i * (width - 4)) / (points.length - 1),
        height - 3 - ((p - min) / span) * (height - 6),
      ] as const,
  );
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const up = (points.at(-1) ?? 0) >= (points[0] ?? 0);
  const color = up ? P.lagoon : P.vermilion;
  const last = xy.at(-1) ?? [0, 0];
  return (
    <svg width={width} height={height} aria-hidden="true">
      <path d={`${d} L${last[0]} ${height} L2 ${height} Z`} fill={color} opacity="0.12" />
      <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

export function Donut({
  parts,
  size = 120,
}: { parts: { value: number; color: string }[]; size?: number }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke={P.night} strokeWidth="14" />
      {parts.map((p) => {
        const len = (p.value / total) * c;
        const el = (
          <circle
            key={p.color}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="14"
            strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

export function Qty(props: { value: number; max: number; onChange: (v: number) => void }) {
  const set = (v: number) =>
    props.onChange(Math.max(1, Math.min(Math.max(1, props.max), Math.round(v))));
  const btn =
    "h-10 w-10 rounded-xl bg-night-4 font-display text-lg ring-1 ring-inset ring-line hover:ring-cream-dim/40";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => set(props.value - 1)}>
        <span>−</span>
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={props.value}
        onChange={(e) => set(Number(e.target.value) || 1)}
        className="h-10 w-16 rounded-xl bg-night text-center font-display text-base ring-1 ring-line focus:outline-none focus:ring-gold"
      />
      <button type="button" className={btn} onClick={() => set(props.value + 1)}>
        <span>+</span>
      </button>
      <button type="button" className="label px-1 text-gold" onClick={() => set(props.max)}>
        max
      </button>
    </div>
  );
}

/** Bottom sheet on a phone, centred window on a computer, for focused actions. */
export function Sheet({
  open,
  onClose,
  children,
}: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[92dvh] w-full max-w-md animate-rise overflow-y-auto rounded-t-3xl border-t border-line bg-night-2 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 lg:max-w-lg lg:rounded-3xl lg:border lg:p-7">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line lg:hidden" />
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-cream-dim ring-1 ring-line hover:text-cream"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

/** "05:12" or "3 h 05" or "2 j 4 h". */
export function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
