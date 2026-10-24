import { useEffect, useState } from "react";
import { Crest, defaultCrest } from "../art/crest.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Rules, Sheet } from "../ui.js";
import type { GameProps } from "./Game.js";
import { MerchantName } from "./Name.js";
import { gameApi } from "./api.js";
import type { SupplierPerson, SuppliersView } from "./types.js";

const t = fr.game.suppliers;

const crestOf = (p: SupplierPerson) => p.crest ?? defaultCrest(p.id);

/**
 * A city's official suppliers: for each good, who holds the title this week (paid more there)
 * and who leads the week's deliveries so far, the merchant's own units beside them.
 */
export function SuppliersSheet(props: GameProps) {
  const [kind, city] = (props.sheet ?? "").split(":");
  const open = kind === "suppliers" && !!city;
  const [data, setData] = useState<SuppliersView | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    gameApi
      .suppliers()
      .then((r) => live && setData(r))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [open]);
  const lines = (data?.lines ?? []).filter((l) => l.city === city);
  const pct = Math.round((data?.bonusBps ?? 0) / 100);
  return (
    <Sheet
      open={open}
      onClose={() => props.setSheet(null)}
      title={t.title(props.names.city(city ?? ""))}
      summary={data && t.line(pct, data.minUnits ?? 0)}
    >
      <div className="space-y-4">
        {data && lines.length === 0 && <p className="meta">{t.none}</p>}
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.resource} className="cut bg-night-3 px-3 py-2 ring-1 ring-inset ring-line">
              <div className="flex items-center gap-2">
                <ResourceIcon code={l.resource} size={28} />
                <span className="flex-1 font-semibold">{props.names.resource(l.resource)}</span>
                {l.holder ? (
                  <span className="flex min-w-0 items-center gap-1.5 text-sm">
                    <Crest crest={crestOf(l.holder)} size={22} />
                    {l.holder.me ? (
                      <span className="text-gold">{t.you}</span>
                    ) : (
                      <MerchantName
                        pseudo={l.holder.pseudo}
                        bot={l.holder.bot}
                        fallback="—"
                        className="text-cream"
                      />
                    )}
                  </span>
                ) : (
                  <span className="label">{t.vacant}</span>
                )}
              </div>
              <ol className="mt-2 space-y-0.5 text-xs text-cream-dim">
                {l.top.map((p, i) => (
                  <li key={p.id} className={`flex justify-between ${p.me ? "text-gold" : ""}`}>
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="shrink-0">{i + 1}.</span>
                      {p.me ? t.you : <MerchantName pseudo={p.pseudo} bot={p.bot} fallback="—" />}
                    </span>
                    <span className="tabular-nums">{t.units(p.units)}</span>
                  </li>
                ))}
                {!l.top.some((p) => p.me) && (
                  <li className="flex justify-between">
                    <span>{t.you}</span>
                    <span className="tabular-nums">{t.units(l.mine)}</span>
                  </li>
                )}
              </ol>
            </li>
          ))}
        </ul>
        <Rules id="suppliers">{t.help(pct, data?.minUnits ?? 0)}</Rules>
      </div>
    </Sheet>
  );
}
