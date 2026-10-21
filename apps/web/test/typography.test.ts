import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * The typographic rule of index.css: spaced Space Mono capitals (.label) for fixed kickers only;
 * any datum (a price, a time left, a stock, a count) goes in .meta. A `.label` element (or
 * <Label>) whose children format a datum breaks the rule: "1,98 D · EN STOCK : 40".
 */
const FORMATTERS = new Set([
  "d",
  "ducats",
  "amount",
  "clock",
  "clockTime",
  "duration",
  "minutesLabel",
  "ago",
]);

const SRC = join(__dirname, "..", "src");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? tsxFiles(join(dir, e.name))
      : e.name.endsWith(".tsx")
        ? [join(dir, e.name)]
        : [],
  );
}

/** The text of a className attribute: a string, or the literal parts of a template. */
function classText(attr: ts.JsxAttribute): string {
  const init = attr.initializer;
  if (!init) return "";
  if (ts.isStringLiteral(init)) return init.text;
  if (!ts.isJsxExpression(init) || !init.expression) return "";
  const e = init.expression;
  if (ts.isNoSubstitutionTemplateLiteral(e) || ts.isStringLiteral(e)) return e.text;
  if (ts.isTemplateExpression(e))
    return [e.head.text, ...e.templateSpans.map((s) => s.literal.text)].join(" ");
  return "";
}

function isLabel(opening: ts.JsxOpeningElement): boolean {
  if (opening.tagName.getText() === "Label") return true;
  return opening.attributes.properties.some(
    (p) =>
      ts.isJsxAttribute(p) &&
      p.name.getText() === "className" &&
      /(^|\s)label(\s|$)/.test(classText(p)),
  );
}

/**
 * Calls that make a kicker, whatever their arguments: a name (a region, a city, a vehicle, a
 * holder, a mastery), an act or a level number, a yes/no. Any other call with arguments formats a
 * datum.
 */
const KICKERS = new Set([
  "kicker",
  "level",
  "upgradeTo",
  "upgradeLater",
  "closed",
  "respecTitle",
  "region",
  "city",
  "vehicleName",
  "holderName",
  "has",
]);

const callee = (e: ts.Expression): string =>
  ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "";

/** A bare value: a variable or a field; a `.name` or a text of fr is not one. */
function bare(e: ts.Expression): boolean {
  const root = e.getText().split(/[.(]/)[0];
  return (
    ts.isIdentifier(e) ||
    (ts.isPropertyAccessExpression(e) && e.name.text !== "name" && root !== "fr" && root !== "t")
  );
}

/** The first datum among an element's children, if any. */
function datum(node: ts.Node): string | null {
  let found: string | null = null;
  const visit = (n: ts.Node) => {
    if (found) return;
    if (ts.isCallExpression(n)) {
      const name = callee(n.expression);
      if (KICKERS.has(name)) return;
      if (FORMATTERS.has(name) || n.arguments.length > 0) found = n.getText();
    } else if (ts.isTemplateSpan(n) && bare(n.expression)) {
      // `${done} / ${need}`: a bare value in a template.
      found = n.expression.getText();
    }
    ts.forEachChild(n, visit);
  };
  const children = (node as ts.JsxElement).children;
  children.forEach((child, i) => {
    // {done}/{count} or {fr.game.inStock} {stock}: a bare value beside a slash or another value.
    if (!found && ts.isJsxExpression(child) && child.expression && bare(child.expression)) {
      const next = children[i + 1];
      const prev = children[i - 1];
      const prevExpr = children[i - 2];
      if (
        (next && ts.isJsxText(next) && /^\s*\//.test(next.text)) ||
        (prev && ts.isJsxText(prev) && /\/\s*$/.test(prev.text)) ||
        (prev &&
          ts.isJsxText(prev) &&
          /^ +$/.test(prev.text) &&
          prevExpr &&
          ts.isJsxExpression(prevExpr))
      )
        found = child.expression.getText();
    }
    visit(child);
  });
  return found;
}

function offenders(): string[] {
  const out: string[] = [];
  for (const file of tsxFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (n: ts.Node) => {
      if (ts.isJsxElement(n) && isLabel(n.openingElement)) {
        const hit = datum(n);
        if (hit) {
          const line = source.getLineAndCharacterOfPosition(n.getStart()).line + 1;
          out.push(`${relative(SRC, file)}:${line} ${hit.slice(0, 60)}`);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(source);
  }
  return out;
}

describe("typography", () => {
  it("keeps data out of the spaced capitals of .label", () => {
    expect(offenders()).toEqual([]);
  });

  const scan = (code: string) => {
    const source = ts.createSourceFile(
      "x.tsx",
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    let hit: string | null = null;
    const visit = (n: ts.Node) => {
      if (!hit && ts.isJsxElement(n) && isLabel(n.openingElement)) hit = datum(n);
      ts.forEachChild(n, visit);
    };
    visit(source);
    return hit;
  };

  it("finds a datum in a label (the guard works)", () => {
    expect(scan('<p className="label mt-1">{t.have(d(x))}</p>')).toBe("t.have(d(x))");
    expect(scan("<p className={`label ${tone}`}>{clock(ms)}</p>")).toBe("clock(ms)");
    expect(scan("<Label>{`${done} / ${need}`}</Label>")).toBe("done");
    expect(scan('<span className="label">{m.progress}/{m.count}</span>')).toBe("m.progress");
    expect(scan('<p className="label">{fr.game.inStock} {stock}</p>')).toBe("stock");
    expect(scan('<p className="meta">{t.have(d(x))}</p>')).toBeNull();
    expect(scan('<p className="label">{t.kicker(ROMAN[i] ?? String(i))}</p>')).toBeNull();
    expect(scan('<p className="label">{fr.game.buyAt}</p>')).toBeNull();
  });
});
