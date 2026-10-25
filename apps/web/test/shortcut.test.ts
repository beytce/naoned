import { describe, expect, it } from "vitest";
import { shortcutTab } from "../src/game/shortcut.js";

describe("the installed app's shortcuts", () => {
  it("open the carts, the Rialto or the ranking, and nothing else", () => {
    expect(shortcutTab("?ouvrir=cargaisons")).toBe("routes");
    expect(shortcutTab("?ouvrir=rialto&utm_source=pwa")).toBe("marche");
    expect(shortcutTab("?ouvrir=classement")).toBe("top");
    expect(shortcutTab("?ouvrir=admin")).toBeNull();
    expect(shortcutTab("")).toBeNull();
  });
});
