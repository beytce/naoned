/**
 * A duel against the computer the real server would refuse, the board having been moved for the
 * test (a level, a tower held): what the screen asked is kept, and it is given a duel already
 * lost on a real tower's board (docs/plan-duels.md B1: the server plays the duels piece by piece).
 */
export async function stubDuel(page, onAsk) {
  await page.route("**/api/planche/duel/start", async (route) => {
    onAsk(route.request().postDataJSON());
    const res = await route.fetch({
      postData: JSON.stringify({ kind: "force", passage: "canal-1" }),
    });
    const json = await res.json().catch(() => ({}));
    if (json.duel)
      await route.fetch({
        url: new URL("/api/planche/duel/quit", route.request().url()).href,
        postData: "{}",
      });
    await route.fulfill({
      json: json.duel ? { duel: { ...json.duel, over: true, won: false } } : json,
    });
  });
}
