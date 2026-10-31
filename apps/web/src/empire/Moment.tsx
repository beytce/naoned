import { useEffect } from "react";
import { Illustration, casaArt } from "../art/Illustration.js";
import { BuildingArt } from "../art/buildings.js";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { sound } from "../sound.js";
import { Slab } from "../ui.js";

/**
 * A Casa reached (lot B of the UX audit): a moment over everything, the palace that grows, what the
 * new level opens, the bell; one button back to the house and its new next step.
 */
export function CasaMoment({
  level,
  opens,
  onClose,
}: {
  level: number;
  opens: string[];
  onClose: () => void;
}) {
  const t = fr.empire.moment;
  useEffect(() => {
    sound("bell");
    haptic("success");
  }, []);
  return (
    <section
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-night/90 px-6 text-center backdrop-blur-sm"
      data-casa-moment={level}
      aria-label={t.title(level)}
    >
      <div className="orbit-in w-56">
        <Illustration
          family="casa"
          name={casaArt(level)}
          className="w-full"
          fallback={<BuildingArt type="palazzo" active className="w-full" />}
        />
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">{t.kicker}</p>
      <h2 className="font-place text-3xl font-bold uppercase tracking-[0.12em] text-cream">
        {t.title(level)}
      </h2>
      {opens.length > 0 ? (
        <ul className="space-y-1 text-sm text-cream">
          {opens.map((code) => (
            <li key={code}>✦ {fr.empire.casa.opensNames[code] ?? code}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-cream-dim">{t.nothing}</p>
      )}
      <Slab tone="gold" size="lg" className="mt-2 w-full max-w-xs" onClick={onClose}>
        {t.go}
      </Slab>
    </section>
  );
}
