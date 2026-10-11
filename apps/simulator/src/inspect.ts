/** Counts what the bots actually do with each mechanic over one season (seed 1). */
import { venice1450Settings } from "@comptoirs/engine";
import { DEFAULT_MIX, runSimulation } from "./sim.js";
const ev = new Map<string, number>();
const trades = new Map<string, number>();
const stock = new Map<string, number>();
const hungryBy = new Map<string, number>();
const r = runSimulation({
  settings: venice1450Settings,
  seed: 1,
  days: 42,
  stepMinutes: 15,
  mix: DEFAULT_MIX,
  lateJoiners: 10,
  onEffects: (fx) => {
    for (const e of fx.events) {
      ev.set(e.type, (ev.get(e.type) ?? 0) + 1);
      if ((e.type === "hungry" || e.type === "upkeep_default") && e.playerId)
        hungryBy.set(`${e.type} ${e.playerId}`, (hungryBy.get(`${e.type} ${e.playerId}`) ?? 0) + 1);
    }
    for (const t of fx.trades) {
      const who = t.buyerId === "market_maker" || t.sellerId === "market_maker" ? "mm" : "p2p";
      trades.set(`${t.resource} ${who}`, (trades.get(`${t.resource} ${who}`) ?? 0) + t.quantity);
    }
    for (const m of fx.stock)
      if (
        [
          "rations",
          "contract",
          "expedition_out",
          "expedition_return",
          "city_sale",
          "plunder",
        ].includes(m.reason)
      ) {
        const k = `${m.resource} ${m.reason}`;
        stock.set(k, (stock.get(k) ?? 0) + m.quantity);
      }
  },
});
console.log(
  "events",
  Object.fromEntries(
    [...ev].filter(([k]) =>
      /contract|expedition|hungry|upkeep_default|build|upgrade|ship|raid|convoy|privateer/.test(k),
    ),
  ),
);
console.log("trades", Object.fromEntries([...trades].sort()));
console.log("stock", Object.fromEntries([...stock].sort()));
console.log("rejected", r.commands.rejectedBy);
const d = r.daily;
for (const x of [d[3], d[10], d[20], d[30], d[41]])
  if (x)
    console.log(
      x.day,
      "m/act",
      Number(x.moneyPerActive) / 100,
      "created",
      Number(x.created) / 100,
      "destroyed",
      Number(x.destroyed) / 100,
      x.createdBy.contract_reward ? `contracts ${Number(x.createdBy.contract_reward) / 100}` : "",
    );

const lastDay = Math.max(...r.players.map((p) => p.day));
const active = new Set(
  r.players.filter((p) => p.day === lastDay && p.active).map((p) => p.playerId),
);
const counts = { hungryActive: 0, hungryInactive: 0, defaultsActive: 0, defaultsInactive: 0 };
for (const [k, n] of hungryBy) {
  const [type, id] = k.split(" ");
  const isActive = active.has(id ?? "");
  if (type === "hungry") {
    if (isActive) counts.hungryActive += n;
    else counts.hungryInactive += n;
  } else if (isActive) counts.defaultsActive += n;
  else counts.defaultsInactive += n;
}
console.log(counts, "active players", active.size);
