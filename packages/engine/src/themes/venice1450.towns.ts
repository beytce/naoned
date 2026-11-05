/**
 * Some thirty towns (the gameplay audit, 5 November 2026, P2b, decision of the owner: about three
 * a region, the towns left out merged into their kept neighbour). Kept: in Venetia, Venice, Padua,
 * Treviso and Verona (four, the house's first region); elsewhere a capital and one or two towns on
 * the roads, apart from each other. Each town left out → the kept one it joins, the nearest.
 */
export const VENICE_TOWNS_MERGED: Record<string, string> = {
  // Venetia: Venice, Padua, Treviso, Verona.
  vicenza: "padova",
  ravenna: "padova",
  belluno: "treviso",
  brescia: "verona",
  mantova: "verona",
  // Lombardy: Milan, Genoa, Cremona.
  pavia: "milano",
  como: "milano",
  bergamo: "cremona",
  // Friuli: Udine, Trieste, Pola.
  gorizia: "udine",
  capodistria: "trieste",
  // Romagna: Bologna, Florence, Ancona.
  ferrara: "bologna",
  pisa: "firenze",
  rimini: "ancona",
  // Dalmatia: Zara, Spalato, Ragusa.
  sebenico: "zara",
  durazzo: "ragusa",
  // Germany: Vienna, Augsburg, Trento.
  salisburgo: "vienna",
  norimberga: "augusta",
  ulma: "augusta",
  innsbruck: "trento",
  bolzano: "trento",
  // Greece: Salonica, Candia, Corfu.
  negroponte: "salonicco",
  corone: "salonicco",
  monemvasia: "candia",
  patrasso: "corfu",
  modone: "corfu",
  // The Levant: Alexandria, Damascus, Nicosia.
  beirut: "damasco",
  acri: "damasco",
  tiro: "damasco",
  tripoli: "nicosia",
  rodi: "nicosia",
  famagosta: "nicosia",
  // Constantinople: Constantinople, Trebizond, Caffa.
  adrianopoli: "costantinopoli",
  varna: "costantinopoli",
  smirne: "costantinopoli",
  tana: "caffa",
  // Flanders: Bruges, Antwerp, London.
  gand: "anversa",
  lilla: "bruges",
};
