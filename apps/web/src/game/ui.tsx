import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-ink/10 bg-white/70 p-4 shadow-sm dark:border-ink-light/10 dark:bg-white/5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Btn(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const base = "rounded-lg px-3 py-2.5 text-sm font-semibold disabled:opacity-40";
  const look =
    props.variant === "secondary"
      ? "border border-rust/40 text-rust dark:border-gold/40 dark:text-gold"
      : "bg-rust text-white active:bg-rust-light";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={`${base} ${look} ${props.className ?? ""}`}
    >
      {props.children}
    </button>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-ink-light/10">
      <div
        className="h-full rounded-full bg-gold transition-all"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  );
}

/** Quantity picker for one hand: -, value, +, and quick shortcuts. */
export function Qty(props: { value: number; max: number; onChange: (v: number) => void }) {
  const set = (v: number) => props.onChange(Math.max(1, Math.min(Math.max(1, props.max), v)));
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className="h-9 w-9 rounded-lg border border-ink/20 text-lg dark:border-ink-light/20"
        onClick={() => set(props.value - 1)}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={props.value}
        onChange={(e) => set(Number(e.target.value) || 1)}
        className="h-9 w-16 rounded-lg border border-ink/20 bg-white text-center dark:border-ink-light/20 dark:bg-black/30"
      />
      <button
        type="button"
        className="h-9 w-9 rounded-lg border border-ink/20 text-lg dark:border-ink-light/20"
        onClick={() => set(props.value + 1)}
      >
        +
      </button>
      <button
        type="button"
        className="h-9 rounded-lg px-2 text-xs underline opacity-70"
        onClick={() => set(props.max)}
      >
        max
      </button>
    </div>
  );
}
