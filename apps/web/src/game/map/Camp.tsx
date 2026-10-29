import { useEffect, useState } from "react";
import { haptic } from "../../haptics.js";
import { fr } from "../../i18n.js";
import { Sheet, Slab } from "../../ui.js";
import { bestAim } from "../terraAim.js";
import type { TerraAction, TerraView } from "../types.js";
import { holderName } from "./TerraLayer.js";

const t = () => fr.game.terra.camp;

/**
 * The merchant's camp (refonte UX lot 8, maquette `Terraferme`), opened by « Lancer un front »:
 * its cells, troops, recruits and bread, the advice of where to strike first (the cheapest cell
 * along the border, `bestAim`) and the one gold action that launches it with the troops it needs.
 * The Condotta, the week's replay and the skirmishes below, in ghosts.
 */
export function CampSheet({
  v,
  open,
  onClose,
  act,
  onCondotta,
  onReplay,
  onSkirmish,
}: {
  v: TerraView;
  open: boolean;
  onClose: () => void;
  act: (a: TerraAction) => Promise<boolean>;
  onCondotta?: () => void;
  onReplay?: () => void;
  onSkirmish?: () => void;
}) {
  // The troops of the front just launched: the advice moves on, the button says what went.
  const [sent, setSent] = useState<number | null>(null);
  useEffect(() => {
    if (open) setSent(null);
  }, [open]);
  const me = v.me;
  const aim = bestAim(v);
  const troops = aim && me ? Math.floor((me.troops * aim.shareBps) / 10_000) : 0;
  const days =
    me?.bread && me.bread.perDay > 0
      ? Math.floor((me.bread.stock * 10_000) / me.bread.perDay)
      : null;
  const ghosts = [
    onCondotta && { label: t().mercenaries, on: onCondotta, hud: "camp-condotta" },
    onReplay && { label: t().week, on: onReplay, hud: "camp-replay" },
    onSkirmish && { label: t().quick, on: onSkirmish, hud: "camp-skirmish" },
  ].filter((x): x is { label: string; on: () => void; hud: string } => !!x);
  return (
    <Sheet
      open={open && !!me}
      onClose={onClose}
      title={me ? t().title(me.cells) : undefined}
      docked
    >
      {me && (
        <div className="space-y-3">
          <p className="text-sm text-cream-dim">
            {t().line(me.troops, me.recruit.perHour)}
            {days !== null && ` · ${t().bread(days)}`}
          </p>
          <p className="text-sm text-cream">
            {aim
              ? aim.holder >= 0
                ? t().aim(holderName(v, aim.holder), troops)
                : t().aimFree(troops)
              : t().none}
          </p>
          <Slab
            size="lg"
            className="w-full"
            coach="camp-launch"
            disabled={sent === null && (!aim || !!v.closed)}
            onClick={async () => {
              if (!aim || sent !== null) return;
              haptic("tap");
              if (await act({ type: "terraFront", aim: aim.cell, shareBps: aim.shareBps }))
                setSent(troops);
            }}
          >
            {sent !== null ? t().launched(sent) : aim ? t().launch(troops) : t().open}
          </Slab>
          {ghosts.length > 0 && (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${ghosts.length}, minmax(0, 1fr))` }}
            >
              {ghosts.map((g) => (
                <button
                  key={g.hud}
                  type="button"
                  data-hud={g.hud}
                  onClick={() => {
                    onClose();
                    g.on();
                  }}
                  className="min-h-12 rounded-full border border-line px-1 text-[0.8125rem] font-semibold leading-tight text-cream transition active:scale-[0.97]"
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
