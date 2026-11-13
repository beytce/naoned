/**
 * Venice's passages for the prototype of the Passe (docs/plan-passe.md): the rules shared by every
 * duel, a few boards from the lagoon's mouth to a strait of the open sea, and the problems.
 * In the game these are a world's settings (`worlds.settings`), never constants of the engine.
 */
import type { PasseSetup } from "../passe/board.js";
import { venice1450PasseProblems } from "./venice1450.passe.problems.js";

const E = 0;
const POST = 2;
const REEF = 3;

/** What every duel shares: one special piece each, three holds, all saved in eight barges or fewer. */
const rules: Pick<PasseSetup, "fire" | "cargo"> = {
  fire: { thread: 1, chain: 1 },
  cargo: { holds: 3, full: 8, step: 2 },
};

type Board = Pick<PasseSetup, "width" | "height" | "cells" | "first"> & { name: string };

/** A board from its rows, north first: `.` empty, `o` a chain post laid in advance, `#` a reef. */
function board(name: string, first: 1 | 2, rows: string[]): Board {
  const cells = rows.flatMap((r) => [...r].map((c) => (c === "#" ? REEF : c === "o" ? POST : E)));
  return { name, width: rows[0]?.length ?? 0, height: rows.length, cells, first };
}

/** The duel on line: fifteen seconds a piece, then the lieutenant lays one; a room lives half an hour. */
const duel = { moveSeconds: 15, roomMinutes: 30, lieutenant: 2 };

export const venice1450Passe = {
  rules,
  duel,
  boards: {
    /** The first duel: a toll keeper of the lagoon, a small bare board. */
    lido: board("Bouche du Lido", 1, [".....", ".....", ".....", ".....", "....."]),
    /** A passage held by a house: one post laid in advance. */
    chioggia: board("Bouche de Chioggia", 1, [
      ".......",
      ".......",
      ".....o.",
      ".......",
      ".......",
      ".......",
      ".......",
    ]),
    /** A corsair's strait: a reef on each side, where the chain hooks. */
    segna: board("Détroit de Segna", 1, [
      ".......",
      ".......",
      "#......",
      ".......",
      "......#",
      ".......",
      ".......",
    ]),
    /** A dark strait of the open sea: larger, reefs on both sides and a post laid in advance. */
    otrante: board("Canal d’Otrante", 1, [
      ".........",
      ".........",
      "......o..",
      "#........",
      ".........",
      "........#",
      ".........",
      ".........",
      ".........",
    ]),
    // The black straits (docs/plan-muda.md N1): the powers' own, never held; reefs and narrows.
    /** The Turk's: the narrows of the Dardanelles, reefs pressing from both banks. */
    dardanelles: board("Les Dardanelles", 1, [
      ".........",
      "#........",
      ".........",
      ".......#.",
      ".........",
      ".#.......",
      ".........",
      "........#",
      ".........",
    ]),
    /** Genoa's: a wall of reefs across the middle, a gap on each side. */
    portofino: board("Le cap de Portofino", 1, [
      ".........",
      ".........",
      ".........",
      ".........",
      "..#.#.#..",
      ".........",
      ".........",
      ".........",
      ".........",
    ]),
    /** Milan's: the mouths of the Po, islets scattered in the delta. */
    po: board("Les bouches du Pô", 1, [
      ".........",
      "...#.....",
      ".........",
      "......#..",
      ".........",
      "..#......",
      ".........",
      ".....#...",
      ".........",
    ]),
    // The straits of the Muda (docs/plan-muda.md N2), on the way to Alexandria.
    /** Off Zara: a reef near each bank. */
    zara: board("Le large de Zara", 1, [
      ".......",
      "#......",
      ".......",
      ".......",
      ".......",
      "......#",
      ".......",
    ]),
    /** The channel of Curzola: two reefs in the middle. */
    curzola: board("Le canal de Curzola", 1, [
      ".......",
      ".......",
      "..#....",
      ".......",
      "....#..",
      ".......",
      ".......",
    ]),
  },
  problems: venice1450PasseProblems,
} as const;
