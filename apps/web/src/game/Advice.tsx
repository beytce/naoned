import { Lorenzo } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d, minutesLabel } from "./format.js";
import { harvestAndRestart } from "./harvest.js";
import type { NextAction } from "./types.js";

const t = fr.game.advice;

/** What the advice says, and the tap that does it (or opens where it is done). */
function line(props: GameProps, a: NextAction): { text: string; button: string; go: () => void } {
  const building = (id: string) => {
    const b = props.view.buildings.find((x) => x.id === id);
    return b ? props.names.building(b.type) : "";
  };
  switch (a.kind) {
    case "harvest":
      return {
        text: t.harvest(a.count),
        button: t.harvestGo,
        go: () => harvestAndRestart(props),
      };
    case "produce":
      return {
        text: t.produce(building(a.buildingId)),
        button: t.produceGo,
        go: () => props.setSheet(`produce:${a.buildingId}`),
      };
    case "company":
      return {
        text: t.company(a.quantity, a.resource, props.names.resource(a.resource)),
        button: t.companyGo,
        go: () => props.setSheet("company"),
      };
    case "upgrade":
      return {
        text: t.upgrade(
          building(a.buildingId),
          d(a.addedPerHour),
          minutesLabel(Math.max(1, Math.round(a.paybackMinutes))),
        ),
        button: t.upgradeGo,
        go: () => props.setSheet(`upgrade:${a.buildingId}`),
      };
  }
}

/** Lorenzo's next best action, once the first steps are behind (the guide speaks before). */
export function AdviceTile(props: GameProps) {
  if (!props.view.tutorial.includes("sell_city")) return null;
  const first = props.view.next[0];
  const a = first ? line(props, first) : null;
  return (
    // The button goes under the words when they would be left a word a line.
    <div className="flex flex-wrap items-center gap-3 cut border border-gold/40 bg-gold/10 px-3 py-2 text-sm">
      <span className="shrink-0">
        <Lorenzo size={40} />
      </span>
      <span className="min-w-[10rem] flex-1">
        <span className="label block text-gold">{t.title}</span>
        <span className="block">{a ? a.text : t.none}</span>
      </span>
      {a && (
        <Slab size="sm" className="ml-auto" disabled={props.busy} onClick={a.go}>
          {a.button}
        </Slab>
      )}
    </div>
  );
}
