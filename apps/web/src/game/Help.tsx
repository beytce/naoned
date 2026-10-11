import { NavIcon } from "../art/icons.js";
import { fr } from "../i18n.js";
import { CloseButton, Label, Slab, useOverlay } from "../ui.js";
import type { GameProps } from "./Game.js";

export function Help(props: GameProps & { onClose: () => void }) {
  useOverlay(true, props.onClose);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a full-screen layer, like the sheets.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={fr.game.help}
      className="fixed inset-0 z-50 animate-fade overflow-y-auto overscroll-contain bg-night"
    >
      <div className="mx-auto max-w-md space-y-6 px-5 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Label className="text-lagoon">{fr.season}</Label>
          <CloseButton onClick={props.onClose} />
        </div>
        <h1 className="font-display text-3xl font-extrabold uppercase">{fr.game.help}</h1>
        {fr.game.howTo.map((s) => {
          const Icon = NavIcon[s.icon as keyof typeof NavIcon];
          return (
            <section key={s.title} className="flex gap-4">
              <div className="slab flex h-12 w-12 shrink-0 items-center justify-center bg-night-3 text-gold ring-1 ring-line">
                <span>{Icon ? <Icon /> : null}</span>
              </div>
              <div>
                <h2 className="font-display text-base font-extrabold uppercase">{s.title}</h2>
                <p className="mt-1 text-cream-dim">{s.text}</p>
              </div>
            </section>
          );
        })}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <Slab
            tone="ghost"
            size="sm"
            onClick={() => {
              props.onClose();
              props.replayIntro();
            }}
          >
            {fr.game.replayIntro}
          </Slab>
          <Slab
            tone="ghost"
            size="sm"
            onClick={() => {
              props.onClose();
              props.replayGuide();
            }}
          >
            {fr.game.replayGuide}
          </Slab>
        </div>
      </div>
    </div>
  );
}
