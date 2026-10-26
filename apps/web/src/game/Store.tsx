import { CHAIN_COLOUR, CHAIN_ORDER, GoodsMark, chainGoods } from "../art/goods.js";
import { fr } from "../i18n.js";
import type { GameProps } from "./Game.js";

const R = 44;
const C = 2 * Math.PI * R;

/**
 * The store in the Lagune direction: a ring of what lies in it, split by chain in the chains'
 * colours, the total in its middle; then one constellation per chain, its goods from raw to
 * finished (a hollow mark at zero). Touching a good opens its trade at the Rialto.
 */
export function StoreView(props: GameProps) {
  const { view } = props;
  const stock = new Map(view.inventory.map((i) => [i.resource, i]));
  const qty = (code: string) => stock.get(code)?.available ?? 0;
  const traded = new Set(view.market.map((l) => l.resource));
  // The chains shown: those of the Terraferma always, the luxury ones once something of them is
  // in the store.
  const chains = CHAIN_ORDER.filter(
    (c) =>
      ["food", "construction", "carpentry"].includes(c) || chainGoods(c).some((g) => qty(g) > 0),
  );
  const byChain = chains.map((c) => ({ c, n: chainGoods(c).reduce((n, g) => n + qty(g), 0) }));
  const total = byChain.reduce((n, x) => n + x.n, 0);
  let at = 0;
  const t = fr.game.store;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5">
        <svg
          viewBox="-56 -56 112 112"
          className="h-28 w-28 shrink-0 -rotate-90"
          role="img"
          aria-label={t.total(total)}
        >
          <circle r={R} fill="none" stroke="rgb(var(--night-4))" strokeWidth="10" />
          {byChain
            .filter((x) => x.n > 0)
            .map((x) => {
              const len = (x.n / Math.max(1, total)) * C;
              const part = (
                <circle
                  key={x.c}
                  r={R}
                  fill="none"
                  stroke={CHAIN_COLOUR[x.c]}
                  strokeWidth="10"
                  strokeDasharray={`${Math.max(0, len - 2).toFixed(1)} ${C.toFixed(1)}`}
                  strokeDashoffset={(-at).toFixed(1)}
                />
              );
              at += len;
              return part;
            })}
          <text
            x="0"
            y="7"
            transform="rotate(90)"
            textAnchor="middle"
            className="fill-cream font-display text-[1.375rem] font-extrabold"
          >
            {total}
          </text>
        </svg>
        <ul className="space-y-1.5 text-sm">
          {byChain.map((x) => (
            <li key={x.c} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: CHAIN_COLOUR[x.c] }}
              />
              <span>{fr.game.chains[x.c]}</span>
              <b className="font-display tabular-nums">{x.n}</b>
            </li>
          ))}
        </ul>
      </div>
      {chains.map((c) => (
        <section key={c} className="rounded-2xl bg-night-3 p-3">
          <p className="mb-2 font-display text-xs font-bold" style={{ color: CHAIN_COLOUR[c] }}>
            {fr.game.chains[c]}
          </p>
          <ul className="flex flex-wrap items-start gap-x-2 gap-y-3">
            {chainGoods(c).map((g) => {
              const line = stock.get(g);
              const n = line?.available ?? 0;
              const content = (
                <>
                  <GoodsMark code={g} size={38} covered={n > 0} />
                  <b className="font-display text-sm tabular-nums">{n}</b>
                  <span className="max-w-full truncate text-xs text-cream-dim">
                    {props.names.resource(g)}
                  </span>
                  {line && line.escrow > 0 && (
                    <span className="text-xs text-info">{t.escrow(line.escrow)}</span>
                  )}
                </>
              );
              return (
                <li key={g} className="w-[4.5rem]">
                  {traded.has(g) ? (
                    <button
                      type="button"
                      aria-label={`${props.names.resource(g)} · ${n}`}
                      onClick={() => props.setSheet(`trade:${g}`)}
                      className={`flex min-h-11 w-full flex-col items-center gap-0.5 transition active:scale-95 ${n > 0 ? "" : "opacity-60"}`}
                    >
                      {content}
                    </button>
                  ) : (
                    <span
                      className={`flex w-full flex-col items-center gap-0.5 ${n > 0 ? "" : "opacity-60"}`}
                    >
                      {content}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
