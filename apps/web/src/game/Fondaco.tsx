import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Rules, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import { have } from "./workshops.js";

const t = fr.game.fondaco;

/**
 * A merchant's fondaco in a city (E1-3): its level, the city's orders it brings each day, and
 * what the next level costs. One sheet per city, opened from the city on the trade's map.
 */
export function FondacoSheet(props: GameProps) {
  const [kind, city = ""] = (props.sheet ?? "").split(":");
  const f = props.view.fondaci;
  const line = f?.cities.find((c) => c.city === city);
  const open = kind === "fondaco" && !!line && !!f;
  return (
    <Sheet
      open={open}
      onClose={() => props.setSheet(null)}
      title={t.title(props.names.city(city))}
      summary={f && line ? t.line(line.level, f.topLevel) : undefined}
    >
      {open && f && line && <Body props={props} city={city} f={f} line={line} />}
    </Sheet>
  );
}

type FView = NonNullable<GameProps["view"]["fondaci"]>;

function Body({
  props,
  city,
  f,
  line,
}: { props: GameProps; city: string; f: FView; line: FView["cities"][number] }) {
  const next = line.next;
  const cities = f.cities.filter((c) => c.level > 0).length;
  const full = f.levels >= f.maxLevels || (line.level === 0 && cities >= f.maxCities);
  const cash = BigInt(props.view.cash);
  const can =
    !!next &&
    !full &&
    cash >= BigInt(next.ducats) &&
    Object.entries(next.materials).every(([r, q]) => have(props.view, r) >= q);
  return (
    <div className="space-y-4">
      <p className="text-sm">{t.orders(line.level * f.ordersPerLevel)}</p>
      {next ? (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-gold">{t.next(next.level)}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span>
              {t.cost} : {d(next.ducats)}
            </span>
            {Object.entries(next.materials).map(([r, q]) => (
              <span
                key={r}
                className={`inline-flex items-center gap-1 ${have(props.view, r) >= q ? "" : "text-vermilion"}`}
              >
                <ResourceIcon code={r} size={20} />
                {q}
              </span>
            ))}
          </p>
          {full && <p className="meta">{t.full(f.levels, f.maxLevels, f.maxCities)}</p>}
          <Slab
            className="w-full"
            disabled={props.busy || !can}
            onClick={() => props.act({ type: "buildFondaco", city })}
          >
            {t.build}
          </Slab>
        </section>
      ) : (
        <p className="meta">{t.top}</p>
      )}
      <Rules id="fondaco">
        {t.help(f.maxCities, f.maxLevels, f.topLevel, Math.round(f.priceBps / 100))}
      </Rules>
    </div>
  );
}
