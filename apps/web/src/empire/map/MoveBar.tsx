import { fr } from "../../i18n.js";
import { Slab } from "../../ui.js";
import { buildingName } from "../logic.js";
import { pct, terrainName, terroirAt, terroirBonus } from "../terroir.js";
import type { EmpirePayload } from "../types.js";

/**
 * Moving a workshop (docs/plan-carte-vivante.md, lot 3): a free tile of the house's touched on the
 * map, what the workshop would gain there said before the one action, « Poser ici »; free, at once.
 */
export function MoveBar({
  p,
  workshopId,
  picked,
  busy,
  onPlace,
  onCancel,
}: {
  p: EmpirePayload;
  workshopId: string;
  picked: { cell: string } | null;
  busy: boolean;
  onPlace: () => void;
  onCancel: () => void;
}) {
  const t = fr.empire.terroir;
  const ws = p.view?.house.workshops.find((w) => w.id === workshopId);
  if (!ws) return null;
  const land = picked ? terroirAt(p, picked.cell) : null;
  const gain = picked ? terroirBonus(p, picked.cell, ws.type) : 0;
  return (
    <section
      className="pointer-events-auto w-full border-t border-info/40 bg-night-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-xl shadow-black/50 lg:mb-4 lg:w-[30rem] lg:rounded-2xl lg:border"
      data-move-bar={workshopId}
    >
      <h3 className="font-place text-lg font-black leading-tight text-cream">
        {t.moveTitle(buildingName(p, ws.type))}
      </h3>
      <p className="mt-1 text-xs text-cream-dim">{t.moveHint}</p>
      {picked && (
        <p className="mt-1 text-xs font-semibold text-cream" data-move-gain={gain}>
          {land ? `${terrainName(land.kind)} · ` : ""}
          {gain > 0 ? t.moveGain(pct(gain)) : t.movePlain}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Slab size="md" tone="ghost" onClick={onCancel}>
          {fr.empire.placing.cancel}
        </Slab>
        <Slab
          size="md"
          tone="gold"
          className="flex-1"
          busy={busy}
          disabled={!picked}
          onClick={onPlace}
        >
          {t.moveHere}
        </Slab>
      </div>
    </section>
  );
}
