import { describe, expect, it } from "vitest";
import { canonicalEmail, disposableEmail } from "../src/auth/canonical.js";

describe("an address's mailbox", () => {
  it("drops the case and any +suffix, and Gmail's dots", () => {
    expect(canonicalEmail("Ada+fondaco@Example.org")).toBe("ada@example.org");
    expect(canonicalEmail("a.d.a@example.org")).toBe("a.d.a@example.org");
    expect(canonicalEmail("a.b+x@gmail.com")).toBe("ab@gmail.com");
    expect(canonicalEmail("a.b@googlemail.com")).toBe("ab@gmail.com");
  });

  it("knows the throwaway mailboxes, and only them", () => {
    expect(disposableEmail("x@yopmail.com")).toBe(true);
    expect(disposableEmail("x@mailinator.com")).toBe(true);
    expect(disposableEmail("x@gmail.com")).toBe(false);
  });
});
