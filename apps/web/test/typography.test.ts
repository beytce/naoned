import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * The typographic rule of index.css: spaced Space Mono capitals (.label) for fixed kickers only;
 * any datum (a price, a time left, a stock, a count) goes in .meta. A `.label` element (or
 * <Label>) breaks the rule as soon as it shows a value that is neither a literal, a text of fr nor
 * one of the TITLES below, or calls a title with a formatted datum: "1,98 D · EN STOCK : 40",
 * "ABSENT 14 H".
 */

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
 * Titles: the texts and names a kicker may show, as qualified paths (an alias such as
 * `const t = fr.game.acts` or `const t = () => fr.game.cargo` is followed back to fr). A call of
 * one of them is a title too, as long as none of its arguments formats a datum: « ACTE III »,
 * « NIVEAU 4 », a city's name. Any other value in a label is a datum.
 */
const TITLES = new Set([
  // Texts of fr called with a number or a name: « ACTE III », « NIVEAU 4 », « SAISON D'AVRIL ».
  "fr.game.acts.kicker",
  "fr.game.week.kicker",
  "fr.game.season.closed",
  "fr.game.level",
  "fr.game.upgradeTo",
  "fr.game.workshop.upgradeLater",
  "fr.game.house.spend.respecTitle",
  // Names: a city, a good, a region, the world, a vehicle, a Terraferma holder.
  "props.names.city",
  "props.names.resource",
  "props.names.region",
  "props.game.names.region",
  "props.catalog.world.name",
  "props.catalog.regions[].name",
  "vehicleName",
  "holderName",
  // An act's numeral, a signal's glyph.
  "numeral",
  "SIGNAL_GLYPH",
  // Props that carry a kicker from their caller, who passes a text of fr.
  "Label.children",
  "Figure.label",
  "BookSide.title",
  "Podium.title",
  "row.label",
]);

/** Calls that format a datum, wherever they stand, even inside a title's arguments. */
const FORMATTERS = new Set([
  "d",
  "ducats",
  "amount",
  "clock",
  "clockTime",
  "duration",
  "minutesLabel",
  "ago",
  "hoursAway",
]);

/** Files left out of the scan: dead code the plan removes (« Ménage du code mort »). */
const DEAD = new Set(["game/Famille.tsx"]);

/** The declaration of `name` seen from `from`: the nearest enclosing `const name = …`. */
function declared(name: string, from: ts.Node): ts.Expression | undefined {
  for (let n: ts.Node | undefined = from; n; n = n.parent) {
    const statements = (n as ts.Block).statements;
    if (!statements) continue;
    for (const st of statements) {
      if (!ts.isVariableStatement(st)) continue;
      for (const decl of st.declarationList.declarations)
        if (ts.isIdentifier(decl.name) && decl.name.text === name && decl.initializer)
          return decl.initializer;
    }
  }
  return undefined;
}

/** The name of a function, declared or assigned to a constant. */
function functionName(f: ts.SignatureDeclaration): string {
  if (f.name && ts.isIdentifier(f.name)) return f.name.text;
  const parent = f.parent;
  return parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)
    ? parent.name.text
    : "?";
}

/**
 * The path of a parameter: `Figure.label` for a component's prop, `xs[]` for the item of a
 * callback given to `xs.map(…)`.
 */
function parameter(name: string, from: ts.Node): string | null {
  for (let n: ts.Node | undefined = from; n; n = n.parent) {
    if (!ts.isFunctionLike(n)) continue;
    for (const p of n.parameters) {
      const names = ts.isIdentifier(p.name)
        ? [p.name.text]
        : ts.isObjectBindingPattern(p.name)
          ? p.name.elements.map((e) => e.name.getText())
          : [];
      if (!names.includes(name)) continue;
      const call = n.parent;
      if (
        ts.isIdentifier(p.name) &&
        call &&
        ts.isCallExpression(call) &&
        ts.isPropertyAccessExpression(call.expression)
      )
        return `${qualify(call.expression.expression) ?? "?"}[]`;
      // A component's props read as props.names.city wherever they are passed.
      return name === "props" ? "props" : `${functionName(n)}.${name}`;
    }
  }
  return null;
}

/**
 * The qualified path of a reference, aliases followed: `t.kicker` → `fr.game.acts.kicker`,
 * `slide.kicker` → `fr.intro.slides[].kicker`, a prop → `Figure.label`. Null if it is not one.
 */
function qualify(e: ts.Expression, depth = 0): string | null {
  if (depth > 12) return null;
  if (ts.isParenthesizedExpression(e)) return qualify(e.expression, depth + 1);
  if (ts.isIdentifier(e)) {
    const init = declared(e.text, e);
    if (init && ts.isArrowFunction(init)) return e.text;
    if (init) return qualify(init, depth + 1) ?? e.text;
    return parameter(e.text, e) ?? e.text;
  }
  if (ts.isPropertyAccessExpression(e)) {
    const head = qualify(e.expression, depth + 1);
    return head === null ? null : `${head}.${e.name.text}`;
  }
  if (ts.isElementAccessExpression(e)) {
    const head = qualify(e.expression, depth + 1);
    return head === null ? null : `${head}[]`;
  }
  if (
    ts.isBinaryExpression(e) &&
    (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      e.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  )
    return qualify(e.left, depth + 1);
  if (ts.isCallExpression(e)) {
    // t() where const t = () => fr.game.cargo.
    if (e.arguments.length === 0 && ts.isIdentifier(e.expression)) {
      const init = declared(e.expression.text, e);
      if (init && ts.isArrowFunction(init) && !ts.isBlock(init.body))
        return qualify(init.body as ts.Expression, depth + 1);
    }
    // xs.find(…): an item of xs.
    if (ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === "find") {
      const head = qualify(e.expression.expression, depth + 1);
      return head === null ? null : `${head}[]`;
    }
  }
  return null;
}

const calleeName = (e: ts.Expression): string =>
  ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "";

/** A formatter call anywhere under `n`. */
function formats(n: ts.Node): string | null {
  if (ts.isCallExpression(n) && FORMATTERS.has(calleeName(n.expression))) return n.getText();
  return ts.forEachChild(n, formats) ?? null;
}

/** The datum an expression shown in a label carries, if any. */
function shown(e: ts.Expression): string | null {
  if (
    ts.isStringLiteral(e) ||
    ts.isNoSubstitutionTemplateLiteral(e) ||
    ts.isNumericLiteral(e) ||
    e.kind === ts.SyntaxKind.NullKeyword ||
    e.kind === ts.SyntaxKind.TrueKeyword ||
    e.kind === ts.SyntaxKind.FalseKeyword
  )
    return null;
  if (ts.isParenthesizedExpression(e)) return shown(e.expression);
  if (ts.isTemplateExpression(e)) {
    for (const span of e.templateSpans) {
      const hit = shown(span.expression);
      if (hit) return hit;
    }
    return null;
  }
  // What the condition decides is not shown, only its branches.
  if (ts.isConditionalExpression(e)) return shown(e.whenTrue) ?? shown(e.whenFalse);
  if (ts.isBinaryExpression(e)) {
    const op = e.operatorToken.kind;
    // fr.kinds[code] ?? code: a text of fr by its code, the code itself failing that.
    if (
      op === ts.SyntaxKind.QuestionQuestionToken &&
      ts.isElementAccessExpression(e.left) &&
      e.left.argumentExpression.getText() === e.right.getText()
    )
      return shown(e.left);
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return shown(e.right);
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken)
      return shown(e.left) ?? shown(e.right);
    return e.getText(); // S{h.week + 1}, a sum or a concatenation.
  }
  if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e))
    return ts.isJsxSelfClosingElement(e) ? null : children(e.children);
  if (ts.isElementAccessExpression(e)) {
    // A text of fr picked by a code (fr.game.events[code]), a numeral, a glyph.
    const head = qualify(e.expression);
    return head?.startsWith("fr.") || (head && TITLES.has(head)) ? null : e.getText();
  }
  if (ts.isCallExpression(e)) {
    const path = qualify(e.expression);
    if (path && TITLES.has(path)) return formats(e) ? e.getText() : null;
    // A zero-argument text of fr (t().title is a property, not this).
    if (path?.startsWith("fr.") && e.arguments.length === 0) return null;
    return e.getText();
  }
  const path = qualify(e);
  if (path?.startsWith("fr.") || (path && TITLES.has(path))) return null;
  return `${e.getText()} [${path}]`;
}

/** The first datum among JSX children, if any. */
function children(list: ts.NodeArray<ts.JsxChild>): string | null {
  for (const child of list) {
    const hit =
      ts.isJsxExpression(child) && child.expression
        ? shown(child.expression)
        : ts.isJsxElement(child) || ts.isJsxFragment(child)
          ? children(child.children)
          : null;
    if (hit) return hit;
  }
  return null;
}

/** The first datum among an element's children, if any. */
const datum = (node: ts.JsxElement): string | null => children(node.children);

function offenders(): string[] {
  const out: string[] = [];
  for (const file of tsxFiles(SRC)) {
    if (DEAD.has(relative(SRC, file))) continue;
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
    const visit = (n: ts.Node): string | null =>
      (ts.isJsxElement(n) && isLabel(n.openingElement) ? datum(n) : null) ??
      ts.forEachChild(n, visit) ??
      null;
    return visit(source);
  };

  it("finds a datum in a label (the guard works)", () => {
    const hit = (code: string) => scan(code)?.replace(/ \[.*\]$/, "") ?? null;
    // A formatter, a parameterised text, a bare value beside a slash or another value.
    expect(hit('<p className="label mt-1">{t.have(d(x))}</p>')).toBe("t.have(d(x))");
    expect(hit("<p className={`label ${tone}`}>{clock(ms)}</p>")).toBe("clock(ms)");
    expect(hit("<Label>{`${done} / ${need}`}</Label>")).toBe("done");
    expect(hit('<span className="label">{m.progress}/{m.count}</span>')).toBe("m.progress");
    expect(hit('<p className="label">{fr.game.stock} {stock}</p>')).toBe("stock");
    // Any value that is not a title: a date, a count, a day, a sum (Legal, Admin, Famille).
    expect(hit('<p className="label">Mise à jour : {LEGAL.updated}</p>')).toBe("LEGAL.updated");
    expect(hit('<p className="label">{m.reports} signalement</p>')).toBe("m.reports");
    expect(hit('<p className="label">J+{r.day}</p>')).toBe("r.day");
    expect(hit('<p className="label">S{h.week + 1}</p>')).toBe("h.week + 1");
    expect(hit('<p className="label">{ok ? "Oui" : count}</p>')).toBe("count");
    expect(hit('<p className="label"><span>{n}</span></p>')).toBe("n");
    // A title's arguments are visited: « ABSENT 14 H » on the sheet of return.
    const away = "const t = fr.game.acts; <Label>{t.kicker(hoursAway(ms))}</Label>";
    expect(hit(away)).toBe("t.kicker(hoursAway(ms))");
    expect(hit("<Label>{fr.game.level(clock(ms))}</Label>")).toBe("fr.game.level(clock(ms))");
    // A title by a bare name only is no title: the list holds qualified paths.
    expect(hit("<Label>{other.kicker(n)}</Label>")).toBe("other.kicker(n)");
    expect(hit("<Label>{t.level(n)}</Label>")).toBe("t.level(n)");
    // Out of a label, or a title.
    expect(hit('<p className="meta">{t.have(d(x))}</p>')).toBeNull();
    expect(hit("const t = () => fr.game.acts; <Label>{t().kicker(numeral(i))}</Label>")).toBeNull();
    expect(hit('<p className="label">{fr.game.buyAt}</p>')).toBeNull();
    expect(hit("const t = fr.game.season; <Label>{t.closed(season)}</Label>")).toBeNull();
    expect(hit('<p className="label">{fr.game.kinds[k] ?? k}</p>')).toBeNull();
  });
});
