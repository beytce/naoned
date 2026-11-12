/**
 * The load of the lagoons (docs/plan-lagunes.md G4): a hundred lagoons of 48 houses, each played
 * a day of the game, hour by hour, its computer's houses visiting at their hours as the server
 * plays them. What does a day cost, how much memory do they hold, how heavy is the board a player
 * reads? Prints Markdown for docs/calibration.md.
 *
 *   pnpm --filter @comptoirs/simulator lagunes-charge [lagoons] [days]
 */
import {
  type PlancheState,
  plancheAdvance,
  plancheInit,
  plancheRobot,
  venice1450Lagune,
} from "@comptoirs/engine";

const HOUR = 3_600_000;
const N = Number(process.argv[2]) || 100;
const DAYS = Number(process.argv[3]) || 1;
const T0 = Date.parse("2026-11-16T00:00:00Z");
const S = venice1450Lagune;
const VISIT = 8;

/** The board as the server sends it: amounts as strings of deniers. */
const wire = (s: PlancheState) =>
  JSON.stringify(s, (_k, v) => (typeof v === "bigint" ? v.toString() : v));

/** A lagoon played from `from` to `to`, hour by hour, as the server's hub does. */
function play(s0: PlancheState, from: number, to: number): PlancheState {
  let s = s0;
  for (let t = from + HOUR; t <= to; t += HOUR) {
    s = plancheAdvance(S, s, t);
    const hour = Math.round((t - T0) / HOUR);
    S.houses.forEach((h, k) => {
      if ((hour + k) % VISIT === 0) s = plancheRobot(S, s, h.id, t);
    });
  }
  return s;
}

const before = process.memoryUsage().heapUsed;
let lagoons = Array.from({ length: N }, () => plancheInit(S, T0));
// A first week, so that the islands and the threads are those of a lagoon in play.
const warm = performance.now();
lagoons = lagoons.map((s) => play(s, T0, T0 + 7 * 24 * HOUR));
const warmMs = performance.now() - warm;
globalThis.gc?.();
const held = process.memoryUsage().heapUsed - before;
const start = T0 + 7 * 24 * HOUR;
const t0 = performance.now();
lagoons = lagoons.map((s) => play(s, start, start + DAYS * 24 * HOUR));
const dayMs = (performance.now() - t0) / DAYS;
const sizes = lagoons.map((s) => wire(s).length);
const size = sizes.reduce((a, b) => a + b, 0) / sizes.length;

const kb = (n: number) => `${Math.round(n / 1024).toLocaleString("fr-FR")} Ko`;
console.log(`### La charge de ${N} lagunes de ${S.houses.length} Maisons\n`);
console.log("| Mesure | Valeur |");
console.log("| --- | --- |");
console.log(`| Une première semaine de jeu, pour les ${N} | ${(warmMs / 1000).toFixed(1)} s |`);
console.log(
  `| Une journée de jeu, pour les ${N} | ${(dayMs / 1000).toFixed(1)} s, soit ${(dayMs / N).toFixed(0)} ms par lagune |`,
);
console.log(
  `| Part d'un processeur prise par le jeu | ${((dayMs / (24 * HOUR)) * 100).toFixed(3)} % |`,
);
console.log(`| Mémoire tenue par les ${N} lagunes | ${kb(held)} (${kb(held / N)} par lagune) |`);
console.log(`| La planche envoyée à chaque lecture | ${kb(size)} |`);
console.log(
  `| Ce qu'envoie le serveur, ${N * S.houses.length} joueurs lisant toutes les 6 s | ${kb((size * N * S.houses.length) / 6)} par seconde |`,
);
