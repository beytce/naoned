import { describe, expect, it } from "vitest";
import { placeFrom, pushOpened, withoutPlace } from "../src/game/shortcut.js";

describe("the places an address opens", () => {
  it("open the carts, the Rialto or the ranking from the installed app's shortcuts", () => {
    expect(placeFrom("?ouvrir=cargaisons")).toEqual({ tab: "routes" });
    expect(placeFrom("?ouvrir=rialto&utm_source=pwa")).toEqual({ tab: "marche" });
    expect(placeFrom("?ouvrir=classement")).toEqual({ tab: "top" });
  });

  it("open a push's place, from a list only", () => {
    expect(placeFrom("?open=workshops&src=push&kind=harvest")).toEqual({ sheet: "workshops" });
    expect(placeFrom("?open=notices")).toEqual({ sheet: "notices" });
    expect(placeFrom("?open=terra")).toEqual({ layer: "terra" });
    expect(placeFrom("?open=admin")).toBeNull();
    expect(placeFrom("?ouvrir=admin")).toBeNull();
    expect(placeFrom("")).toBeNull();
  });

  it("know the push the game was opened from, and clean the address", () => {
    expect(pushOpened("?open=cargo&src=push&kind=delivery")).toBe("delivery");
    expect(pushOpened("?open=cargo&kind=delivery")).toBeNull();
    expect(pushOpened("?src=push&kind=<script>")).toBeNull();
    expect(withoutPlace(new URL("https://x.test/?open=cargo&src=push&kind=delivery&ref=Ada"))).toBe(
      "/?ref=Ada",
    );
  });
});
