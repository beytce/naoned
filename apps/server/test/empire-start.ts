/**
 * The first steps (docs/plan-premiers-pas.md, lot 1): a house starts without a workshop and builds
 * them on the free tiles given round its fondaco. The tests of the server that need a house at work
 * build the three of before (clay, wood, planks), one after the other, as the player would.
 */

interface MapView {
  tileSize?: number;
  unlocked: string[];
  home: { x: number; y: number };
  cities: { x: number; y: number }[];
}
interface View {
  map: MapView;
  house: { workshops: { tile?: string }[]; builds?: { cell?: string }[] };
}

/** The house's free tiles: owned, no town, no fondaco, no workshop, no site on them. */
export function freeTiles(view: View): string[] {
  const size = view.map.tileSize ?? 15;
  const at = (x: number, y: number) => `${Math.floor(x / size)},${Math.floor(y / size)}`;
  const taken = new Set<string>([
    at(view.map.home.x, view.map.home.y),
    ...view.map.cities.map((c) => at(c.x, c.y)),
    ...view.house.workshops.flatMap((w) => (w.tile ? [w.tile] : [])),
    ...(view.house.builds ?? []).flatMap((b) => (b.cell ? [b.cell] : [])),
  ]);
  return view.map.unlocked.filter((k) => !taken.has(k));
}

export const FIRST_WORKSHOPS = [
  { workshopType: "clay_pit", recipe: "dig_clay" },
  { workshopType: "lumber_camp", recipe: "cut_wood" },
  { workshopType: "sawmill", recipe: "saw_planks" },
] as const;

/**
 * Builds the first workshops, each on a free tile, waiting out each site (one at a time at the
 * Casa 1): `act` plays an action and returns its body, `view` reads the house, `wait` moves the
 * clock on.
 */
export async function buildFirstWorkshops(
  act: (payload: unknown) => Promise<{ error?: string }>,
  view: () => Promise<View>,
  wait: (ms: number) => void,
  workshops: readonly { workshopType: string; recipe: string }[] = FIRST_WORKSHOPS,
): Promise<void> {
  for (const w of workshops) {
    const tile = freeTiles(await view())[0];
    if (!tile) throw new Error("no free tile");
    const res = await act({ type: "empireBuildWorkshop", ...w, tile });
    if (res.error) throw new Error(`${w.workshopType}: ${res.error}`);
    wait(2 * 60_000);
  }
  // The last site ends at the next read.
  await view();
}

type Post = (
  cookie: string,
  url: string,
  payload?: unknown,
) => Promise<{ json(): { error?: string; view?: unknown } }>;

/** Joins the empire and builds the first workshops: a house at work, as after the guide. */
export async function joinAtWork(post: Post, cookie: string, wait: (ms: number) => void) {
  await post(cookie, "/api/empire/join");
  await buildFirstWorkshops(
    async (payload) => post(cookie, "/api/empire/actions", payload).then((r) => r.json()),
    async () =>
      (await post(cookie, "/api/empire/actions", { type: "empireRelaunchAll" })).json()
        .view as View,
    wait,
  );
}
