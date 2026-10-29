import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { merchantLabel } from "../src/game/Name.js";
import { fr } from "../src/i18n.js";

/**
 * One sign for the computer's houses, wherever a merchant's name shows: a name in src/game goes
 * through <MerchantName pseudo bot /> (or merchantLabel() where only text fits, on the map's
 * SVG), which adds « (ordinateur) » to a house. A merchant who believes he beats people and learns
 * they were machines feels deceived.
 */

const GAME = join(__dirname, "..", "src", "game");

/**
 * Names that are never a house's: the merchant's own (`account`, `me`), the seeds of a default
 * crest, and screens of verified merchants only. Famille.tsx goes with the families' clean-up.
 */
const EXEMPT_RECEIVERS = /(^|\.)(account|me)$/;
const EXEMPT_CALLS = new Set(["defaultCrest", "merchantLabel"]);
const EXEMPT_FILES: Record<string, string> = {
  "Ceremony.tsx": "the season's podium, verified e-mails only (season.ts)",
  "Famille.tsx": "dead code, removed with the families (plan-finalisation, 12)",
  "Marche.tsx": "the previous Doge, chosen among people only (season.ts)",
};

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? tsxFiles(join(dir, e.name))
      : e.name.endsWith(".tsx")
        ? [join(dir, e.name)]
        : [],
  );
}

/** A merchant's name read: `x.pseudo`, or a lookup in the names met (`props.people[id]`). */
function nameRead(node: ts.Node): node is ts.PropertyAccessExpression | ts.ElementAccessExpression {
  if (ts.isPropertyAccessExpression(node)) return node.name.text === "pseudo";
  return ts.isElementAccessExpression(node) && /(^|\.)people$/.test(node.expression.getText());
}

/** Whether a name read is passed to MerchantName, to an exempt call, or is one's own. */
function allowed(node: ts.PropertyAccessExpression | ts.ElementAccessExpression): boolean {
  if (EXEMPT_RECEIVERS.test(node.expression.getText())) return true;
  for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p) && EXEMPT_CALLS.has(p.expression.getText())) return true;
    if (ts.isJsxAttribute(p) && p.name.getText() === "pseudo") {
      const tag = (p.parent.parent as ts.JsxOpeningLikeElement).tagName.getText();
      return tag === "MerchantName";
    }
  }
  return false;
}

function faults(): string[] {
  const out: string[] = [];
  for (const file of tsxFiles(GAME)) {
    const name = relative(GAME, file);
    if (name in EXEMPT_FILES) continue;
    const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (nameRead(node) && !allowed(node)) {
        const { line } = src.getLineAndCharacterOfPosition(node.getStart());
        out.push(`${name}:${line + 1} ${node.getText()}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
  return out;
}

describe("the computer's houses", () => {
  it("are named through MerchantName or merchantLabel everywhere in the game", () => {
    expect(faults()).toEqual([]);
  });

  it("carry the seal in text, a person's name left as it is", () => {
    // « (ordinateur) » in text after the name (refonte UX, lot 7), no longer a « PNJ » seal.
    expect(merchantLabel("Comm884", true)).toBe(`Comm884 ${fr.game.npc}`);
    expect(fr.game.npc).toBe("(ordinateur)");
    expect(merchantLabel("ada", false)).toBe("ada");
    expect(merchantLabel(null, true, "—")).toBe(`— ${fr.game.npc}`);
  });
});
