import { useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Rules, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import { have } from "./workshops.js";

const t = fr.game.warehouse;

/**
 * A city's warehouse: the week's auction for its places (the bid that wins now, the merchant's
 * own), and for its holder the city's orders delivered at once from it, so much a day.
 */
export function WarehouseSheet(props: GameProps) {
  const [kind, city = ""] = (props.sheet ?? "").split(":");
  const w = props.view.warehouses;
  const line = w?.cities.find((c) => c.city === city);
  const open = kind === "warehouse" && !!line && !!w;
  return (
    <Sheet
      open={open}
      onClose={() => props.setSheet(null)}
      title={t.title(props.names.city(city))}
      summary={w && t.line(w.perCity, w.unitsPerDay)}
    >
      {open && w && line && <Body props={props} city={city} w={w} line={line} />}
    </Sheet>
  );
}

type WView = NonNullable<GameProps["view"]["warehouses"]>;

function Body({
  props,
  city,
  w,
  line,
}: { props: GameProps; city: string; w: WView; line: WView["cities"][number] }) {
  const toWin = Number(BigInt(line.toWin));
  const [amount, setAmount] = useState(() => Math.max(toWin, Number(BigInt(line.mine ?? "0"))));
  const orders = (props.view.road?.orders ?? []).filter(
    (o) => o.city === city && o.status === "open" && o.opensAt <= props.now,
  );
  return (
    <div className="space-y-4">
      {line.held && (
        <section className="space-y-2">
          <p className="text-sm text-gold">{t.held(w.unitsLeft)}</p>
          {orders.length === 0 && <p className="meta">{t.noOrders}</p>}
          <ul className="space-y-2">
            {orders.map((o) => {
              const can = have(props.view, o.resource) >= o.quantity && o.quantity <= w.unitsLeft;
              return (
                <li key={o.id} className="flex items-center gap-2 text-sm">
                  <ResourceIcon code={o.resource} size={28} />
                  <span className="flex-1">
                    {o.quantity} {props.names.resource(o.resource).toLowerCase()} ·{" "}
                    {d(BigInt(o.unitPrice) * BigInt(o.quantity))}
                  </span>
                  <Slab
                    size="sm"
                    disabled={props.busy || !can}
                    onClick={() =>
                      props.act({ type: "dispatchDelivery", orderId: o.id, vehicleId: "warehouse" })
                    }
                  >
                    {t.deliver}
                  </Slab>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <section className="space-y-2">
        <p className="label">{t.auction}</p>
        <p className="text-sm">{t.state(line.bidders, d(line.toWin))}</p>
        {line.mine && <p className="text-sm text-info">{t.mine(d(line.mine))}</p>}
        <label className="block text-sm">
          <span className="flex justify-between">
            <span>{t.bid}</span>
            <span className="font-sans">{d(BigInt(amount))}</span>
          </span>
          <input
            type="range"
            min={Number(BigInt(w.minBid))}
            max={Math.max(toWin * 3, Number(BigInt(w.minBid)) * 5)}
            step={100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 w-full accent-[rgb(var(--gold))]"
          />
        </label>
        <Slab
          className="w-full"
          disabled={props.busy}
          onClick={() => props.act({ type: "warehouseBid", city, amount: String(amount) })}
        >
          {line.mine ? t.rebid : t.place}
        </Slab>
      </section>
      <Rules id="warehouse">{t.help(w.perCity, w.unitsPerDay)}</Rules>
    </div>
  );
}
