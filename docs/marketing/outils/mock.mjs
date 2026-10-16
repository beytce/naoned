// Stages an active week of the families' campaign on top of the real /api/game answer.
const HOLD = {
  contarini: ["piove", "chioggia", "mestre", "padova", "adria"],
  morosini: ["feltre", "bassano", "castelfranco", "schio", "vicenza"],
  mocenigo: ["rovigo", "legnago", "ferrara", "mantova"],
  dandolo: ["udine", "pordenone", "conegliano", "treviso"],
  milan: ["brescia", "bergamo", "crema", "lodi", "cremona", "peschiera"],
};
const MARCH = [
  ["contarini", "mestre", "treviso", 0.35],
  ["contarini", "padova", "vicenza", 0.6],
  ["morosini", "vicenza", "verona", 0.5],
  ["morosini", "castelfranco", "mestre", 0.2],
  ["mocenigo", "legnago", "padova", 0.7],
  ["mocenigo", "mantova", "verona", 0.3],
  ["dandolo", "treviso", "castelfranco", 0.55],
  ["dandolo", "conegliano", "bassano", 0.15],
  ["milan", "peschiera", "verona", 0.45],
  ["milan", "cremona", "mantova", 0.25],
  ["contarini", "chioggia", "adria", 0.8],
  ["morosini", "schio", "verona", 0.65],
];
export function stage(body, mine = "contarini") {
  const f = body.view?.families;
  if (!f) return body;
  const now = body.serverTime;
  f.opensAt = now - 86400000;
  f.open = true;
  f.closed = false;
  f.mine = mine;
  f.week = 3;
  const glory = { contarini: 412, morosini: 388, mocenigo: 251, dandolo: 297 };
  for (const x of f.families) {
    x.glory = glory[x.code];
    x.members = 9 + (x.glory % 7);
    x.active = 6;
    x.lands = HOLD[x.code].length;
  }
  const holder = {};
  for (const [fam, ls] of Object.entries(HOLD)) for (const l of ls) holder[l] = fam;
  let i = 0;
  for (const l of f.lands) {
    l.holder = holder[l.code] ?? null;
    l.garrison = l.seat ? l.garrison : 3 + ((i++ * 7) % 11);
    l.defense = l.garrison;
    l.open = l.holder !== mine && !l.seat;
    l.mine = l.holder === mine && !l.seat ? 2 : 0;
    l.from = "piove";
    l.minutes = 40;
    if (["padova", "vicenza", "treviso"].includes(l.code))
      l.work = {
        kind: l.code === "padova" ? "dogana" : l.code === "vicenza" ? "rocca" : "campo",
        family: l.holder,
        by: "x",
        readyAt: now - 1,
        ready: true,
      };
  }
  f.marches = MARCH.map(([fam, from, target, share], k) => ({
    id: `m${k}`,
    family: fam,
    by: null,
    from: fam === "milan" ? null : from,
    target,
    startAt: now - share * 3600000,
    arriveAt: now + (1 - share) * 3600000,
    lances: 4 + (k % 6),
    mine: fam === mine ? 2 : 0,
  }));
  f.me = {
    reserve: 7,
    levy: 5,
    levyMax: 24,
    hired: 2,
    hireLimit: 10,
    nextPrice: "1200",
    merit: 34,
    works: 1,
    worksAllowed: 2,
    ballot: [],
    leaving: [],
  };
  f.members = [{ playerId: body.view.player?.id ?? "me", merit: 34, me: true }];
  return body;
}
export async function install(page, mine) {
  await page.route(/\/api\/game(\?.*)?$/, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    await route.fulfill({ response: res, json: stage(body, mine) });
  });
  await page.routeWebSocket?.(/\/api\/live/, () => {});
}
