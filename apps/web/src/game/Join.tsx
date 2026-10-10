import { useState } from "react";
import { fr } from "../i18n.js";
import type { Names } from "./Game.js";
import type { Catalog } from "./types.js";
import { Btn, Card } from "./ui.js";

export function Join(props: {
  catalog: Catalog;
  names: Names;
  onJoin: (region: string) => Promise<void>;
  toast: string | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const bonus = props.catalog.rules.regionBonusBps / 100;
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="text-center">
        <h1 className="font-serif text-3xl font-bold text-rust dark:text-gold">{fr.appName}</h1>
        <p className="mt-1 text-sm opacity-70">{props.catalog.world.name}</p>
      </header>
      <h2 className="font-serif text-xl">{fr.game.chooseRegion}</h2>
      <p className="text-sm opacity-70">{fr.game.chooseRegionHelp}</p>
      {props.catalog.regions.map((r) => (
        <Card key={r.code} className="space-y-2">
          <h3 className="font-serif text-lg font-semibold">{r.name}</h3>
          <p className="text-sm">
            {fr.game.regionBonus(bonus, props.names.resource(r.bonusResource))}
          </p>
          <p className="text-sm opacity-70">
            {fr.game.startingKit(r.startingBuildings.map(props.names.building).join(", "))}
          </p>
          <Btn
            className="w-full"
            disabled={busy !== null}
            onClick={async () => {
              setBusy(r.code);
              await props.onJoin(r.code);
              setBusy(null);
            }}
          >
            {busy === r.code ? "…" : fr.game.settleIn(r.name)}
          </Btn>
        </Card>
      ))}
      {props.toast && <p className="text-sm text-red-700 dark:text-red-400">{props.toast}</p>}
    </main>
  );
}
