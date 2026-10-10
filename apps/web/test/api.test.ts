import { describe, expect, it } from "vitest";
import { tokenFromLocation } from "../src/api.js";

describe("tokenFromLocation", () => {
  it("reads the token of a magic link", () => {
    expect(tokenFromLocation({ pathname: "/connexion", search: "?token=abc-_1" })).toBe("abc-_1");
  });

  it("ignores other pages", () => {
    expect(tokenFromLocation({ pathname: "/", search: "?token=abc" })).toBeNull();
    expect(tokenFromLocation({ pathname: "/connexion", search: "" })).toBeNull();
  });
});
