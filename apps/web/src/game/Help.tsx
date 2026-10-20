import { NavIcon } from "../art/icons.js";
import { fr } from "../i18n.js";
import { CloseButton, Label, Slab, useOverlay } from "../ui.js";
import { BankSection } from "./Bank.js";
import type { GameProps } from "./Game.js";
import { useWide } from "./useWide.js";

export function Help(props: GameProps & { onClose: () => void }) {
  useOverlay(true, props.onClose);
  const wide = useWide();
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
          <Label className="text-cream-dim">{fr.season}</Label>
          <CloseButton onClick={props.onClose} />
        </div>
        <h1 className="font-display text-3xl font-extrabold uppercase">{fr.game.help}</h1>
        <button
          type="button"
          onClick={() => {
            props.onClose();
            props.openTerraGuide();
          }}
          className="flex w-full items-center gap-3 cut border border-info/60 bg-info/10 px-4 py-3 text-left transition active:scale-[0.99]"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-display font-extrabold uppercase text-info">
              {fr.game.terraGuide.open}
            </span>
            <span className="block text-sm text-cream-dim">{fr.game.terraGuide.cardText}</span>
          </span>
          <span aria-hidden="true" className="text-info">
            →
          </span>
        </button>
        {fr.game.howTo
          .filter((s) => wide || !("wideOnly" in s && s.wideOnly))
          .map((s) => {
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
        <section className="cartouche-line space-y-2 p-4">
          <h2 className="font-display text-base font-extrabold uppercase text-info">
            {fr.game.seasonNotes.title}
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-cream-dim">
            {fr.game.seasonNotes.items.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
        <BankSection />
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
