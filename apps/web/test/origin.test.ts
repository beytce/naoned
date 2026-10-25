import { describe, expect, it } from "vitest";
import {
  dropInvite,
  inviteUrl,
  keepInvite,
  keepOrigin,
  originOf,
  pendingInvite,
  shareUrl,
  takeOrigin,
} from "../src/origin.js";

const memory = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
};

describe("where a newcomer comes from", () => {
  it("reads the shared link's ref and the campaign's utm, nothing else", () => {
    expect(originOf("?ref=Ada&utm_source=reddit&utm_campaign=lancement&x=1")).toEqual({
      ref: "Ada",
      utmSource: "reddit",
      utmCampaign: "lancement",
    });
    expect(originOf("?ouvrir=rialto")).toBeNull();
    expect(originOf(`?ref=${"a".repeat(100)}`)?.ref).toHaveLength(64);
  });

  it("keeps the first origin of the visit, taken once at sign-up", () => {
    const s = memory();
    keepOrigin("?utm_source=discord", s);
    keepOrigin("?utm_source=reddit", s);
    expect(takeOrigin(s)).toEqual({ utmSource: "discord" });
    expect(takeOrigin(s)).toBeNull();
  });

  it("plays on without storage", () => {
    const refused = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => undefined,
    };
    expect(() => keepOrigin("?ref=Ada", refused)).not.toThrow();
    expect(takeOrigin(refused)).toBeNull();
  });

  it("shares the game's address with who shared it", () => {
    expect(shareUrl("https://fondaco.example", "Ada Lovelace")).toBe(
      "https://fondaco.example/?ref=Ada%20Lovelace",
    );
    expect(shareUrl("https://fondaco.example", null)).toBe("https://fondaco.example/");
  });
});

describe("a company's invitation", () => {
  it("is kept from the link until answered, the latest link winning", () => {
    const s = memory();
    keepInvite("?ref=Ada&co=Ab3_x-9", s);
    expect(pendingInvite(s)).toBe("Ab3_x-9");
    keepInvite("?co=Zz99zz", s);
    expect(pendingInvite(s)).toBe("Zz99zz");
    // Anything not shaped like a code is ignored.
    keepInvite("?co=<script>", s);
    expect(pendingInvite(s)).toBe("Zz99zz");
    dropInvite(s);
    expect(pendingInvite(s)).toBeNull();
  });

  it("is shared as a link carrying who invites and the company's code", () => {
    expect(inviteUrl("https://fondaco.fr", "Ada Lovelace", "Ab3x")).toBe(
      "https://fondaco.fr/?ref=Ada%20Lovelace&co=Ab3x",
    );
    expect(inviteUrl("https://fondaco.fr", null, "Ab3x")).toBe("https://fondaco.fr/?co=Ab3x");
  });
});
