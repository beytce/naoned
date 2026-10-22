// Layout assertions shared by the end-to-end scripts, run in the page after every step: each
// throws, naming what is wrong.
//
// - overflow: the page scrolls sideways (a line or a block wider than the phone);
// - overlap: two blocks of the HUD (marked `data-hud`, or `role=button`) cover each other by more
//   than 2 px both ways, one not being inside the other; a badge or a dot sitting on its round is
//   inside it, and anything else meant to overlap says so with `data-hud-overlay`;
// - map: a block of the HUD (a round: its disc) covers a name, a medallion or a figure of the
//   map (`data-map-label`);
// - target: a block of the HUD that can be touched is smaller than 44 × 44 px;
// - touch: a button or a link of an open window (`aria-modal`), a panel (`data-panel`: a place's
//   panel, Lorenzo's cards on the Terraferma) or Lorenzo's bubble is touched on less than
//   44 × 44 px; its real hit area is measured (a pseudo-element reaching past the drawing
//   counts) by what the page finds under the points 21.5 px from its centre, the element brought
//   into view first, its window's scroll put back after (another layer laid over a side, as
//   Lorenzo's bubble over a panel, is left to the guide's check);
// - line: a line of the HUD that gives way item by item (`data-hud-meta`) shows one cut;
// - wrap: a line of data (`.meta` that is not a sentence: no full stop, « 1,98 d · 40 en
//   stock », « Se termine dans 1 j 21 h ») takes more than one line on the screen;
// - guide: Lorenzo's ring is drawn where its target is not the element touched under its centre
//   (a sheet over it), or something is left over his bubble (a coin of the effects, still shown
//   once their flights have ended).
//
// And on demand, `assertSheetHead`: an open window scrolled to its foot keeps its head (the
// cross, and its title when it has one) at its top, in sight and touched first.

const SLACK = 2;
const TARGET = 44;

/** The page is no wider than the phone: nothing to scroll sideways. */
export async function assertNoOverflow(page) {
  fail(await overflows(page));
}

/** No two blocks of the HUD cover each other, nor the map's names; targets are 44 px at least. */
export async function assertNoOverlap(page) {
  fail(await overlaps(page));
}

/** All at once, all that is wrong in one message. */
export async function assertLayout(page) {
  await settled(page);
  fail([
    ...(await overflows(page)),
    ...(await overlaps(page)),
    ...(await touches(page)),
    ...(await wraps(page)),
    ...(await guide(page)),
  ]);
}

/**
 * Every open window, scrolled to its foot, keeps its head at its top: the cross, and its title
 * when it has one, in sight and the element found under their centre. The scroll is put back.
 */
export async function assertSheetHead(page) {
  const faults = await page.evaluate(async () => {
    const out = [];
    for (const sheet of document.querySelectorAll('[aria-modal="true"]')) {
      const head = sheet.querySelector("[data-sheet-head]");
      if (!head) continue;
      const before = sheet.scrollTop;
      sheet.scrollTop = sheet.scrollHeight;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const s = sheet.getBoundingClientRect();
      const name = head.querySelector("h3")?.textContent?.trim() || "a window";
      if (sheet.scrollTop === 0) {
        sheet.scrollTop = before;
        continue;
      }
      const h = head.getBoundingClientRect();
      if (Math.abs(h.top - s.top) > 1)
        out.push(`head: ${name}'s head at ${Math.round(h.top - s.top)} px from its top, scrolled`);
      for (const el of [head.querySelector('[aria-label="Fermer"]'), head.querySelector("h3")]) {
        if (!el) continue;
        const b = el.getBoundingClientRect();
        const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!at || !(el === at || el.contains(at)))
          out.push(
            `head: ${name}'s ${el.tagName === "H3" ? "title" : "cross"} out of sight, scrolled`,
          );
      }
      sheet.scrollTop = before;
    }
    return out;
  });
  fail(faults);
}

/** The merchant's name shows `min` letters at least (all of it when shorter), on any layer. */
export async function assertName(page, min) {
  const seen = await page.evaluate(() => {
    const el = document.querySelector("[data-hud-name]");
    if (!el) return null;
    const text = el.textContent ?? "";
    const node = el.firstChild;
    const room = el.clientWidth;
    // The width the first letters take as laid out (an ellipsis only paints over the rest).
    const range = document.createRange();
    const width = (n) => {
      range.setStart(node, 0);
      range.setEnd(node, n);
      return range.getBoundingClientRect().width;
    };
    if (!node || width(text.length) <= room + 0.5) return { text, shown: text.length };
    const probe = el.cloneNode(false);
    probe.textContent = "…";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    el.parentElement.append(probe);
    const dots = probe.getBoundingClientRect().width;
    probe.remove();
    let shown = 0;
    while (shown < text.length && width(shown + 1) + dots <= room + 0.5) shown++;
    return { text, shown };
  });
  if (!seen) throw new Error("no merchant's name in the HUD ([data-hud-name])");
  const want = Math.min(min, seen.text.length);
  if (seen.shown < want)
    throw new Error(`the name « ${seen.text} » shows ${seen.shown} letters, ${want} wanted`);
}

function fail(wrong) {
  if (wrong.length > 0) throw new Error(wrong.join("\n  "));
}

/** The coins of the effects landed: a step is judged once their flights are over. */
function settled(page) {
  return page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.target?.closest?.("[data-fx-layer]"))
        .map((a) => a.finished.catch(() => {})),
    ),
  );
}

function overflows(page) {
  return page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    const width = window.innerWidth;
    if (root.scrollWidth <= width) return [];
    // Name the widest culprits, to find them without a picture.
    const wide = [...document.body.querySelectorAll("*")]
      .filter((el) => el.getBoundingClientRect().right > width + 1)
      .filter((el) => !el.parentElement || el.parentElement.getBoundingClientRect().right <= width)
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()} « ${(el.textContent ?? "").trim().slice(0, 40)} »`);
    return [`the page is ${root.scrollWidth} px wide for ${width} px: ${wide.join(", ")}`];
  });
}

function overlaps(page) {
  return page.evaluate(
    ({ slack, target }) => {
      const shown = (el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return false;
        if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth)
          return false;
        for (let e = el; e; e = e.parentElement) {
          const s = getComputedStyle(e);
          if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0)
            return false;
        }
        return true;
      };
      const name = (el) => {
        const what =
          el.getAttribute("aria-label") ||
          (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
        const where = el.closest("[data-hud]")?.dataset.hud;
        return `${where ?? (el.closest("[data-map-label]") ? "map" : el.tagName.toLowerCase())} « ${what} »`;
      };
      const covers = (a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        return w > slack && h > slack ? `${Math.round(w)} × ${Math.round(h)}` : null;
      };
      const blocks = [...document.querySelectorAll("[data-hud], [role=button]")]
        .filter((el) => !el.closest("[data-hud-overlay]"))
        .filter(shown);
      const wrong = [];
      // What a finger may touch in the HUD: its blocks themselves, or what they hold.
      const touch = "button, a, [role=button]";
      const targets = [
        ...document.querySelectorAll(
          `[data-hud]:is(${touch}), [data-hud] :is(${touch}), [role=button]`,
        ),
      ]
        .filter((el) => !el.closest("[data-hud-overlay]"))
        .filter(shown);
      for (const el of targets) {
        const r = el.getBoundingClientRect();
        if (r.width < target - 0.5 || r.height < target - 0.5)
          wrong.push(`${name(el)} is ${Math.round(r.width)} × ${Math.round(r.height)} px`);
      }
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          const a = blocks[i];
          const b = blocks[j];
          if (a.contains(b) || b.contains(a)) continue;
          const by = covers(a, b);
          if (by) wrong.push(`${name(a)} covers ${name(b)} (${by})`);
        }
      }
      // The HUD over the map's names, medallions and figures: text written over text.
      const hud = blocks.filter((el) => el.matches("[data-hud]"));
      const labels = [...document.querySelectorAll("[data-map-label]")].filter(shown);
      for (const a of hud) {
        // A round is judged by what is drawn (its disc), not by the 44 px its finger gets.
        const ink = a.matches("button") ? (a.querySelector(":scope > .hud-orb") ?? a) : a;
        for (const b of labels) {
          const by = covers(ink, b);
          if (by) wrong.push(`${name(a)} covers the map's ${name(b)} (${by})`);
        }
      }
      // A line giving way item by item: each item shown whole, or wrapped out of sight.
      for (const line of document.querySelectorAll("[data-hud-meta]")) {
        if (!shown(line)) continue;
        const box = line.getBoundingClientRect();
        for (const item of line.children) {
          const r = item.getBoundingClientRect();
          const out = r.top >= box.bottom - 0.5;
          const whole = r.left >= box.left - 0.5 && r.right <= box.right + 0.5;
          if (!out && !whole) wrong.push(`${name(line)}: « ${item.textContent} » cut`);
        }
      }
      return wrong;
    },
    { slack: SLACK, target: TARGET },
  );
}

/** The buttons and links of the windows and panels open: 44 × 44 px of touch, measured. */
function touches(page) {
  return page.evaluate(
    ({ target }) => {
      const half = target / 2 - 0.5;
      const shown = (el) => {
        if (el.getClientRects().length === 0) return false;
        for (let e = el; e; e = e.parentElement) {
          const s = getComputedStyle(e);
          if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0)
            return false;
        }
        return true;
      };
      const name = (el) =>
        `${el.tagName.toLowerCase()} « ${(el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40)} »`;
      const scope = '[aria-modal="true"], [data-panel], [data-coach-bubble]';
      const touch = "button, a, [role=button]";
      const targets = [...document.querySelectorAll(`:is(${scope}) :is(${touch})`)]
        // The HUD has its own check; a disabled control is measured once it can be touched.
        .filter((el) => !el.closest("[data-hud], [data-hud-overlay]"))
        .filter((el) => !el.disabled && el.getAttribute("aria-disabled") !== "true")
        .filter(shown);
      // Every scroll put back as it was once measured: the step's picture is taken after.
      const scrolled = new Map();
      const keep = (el) => {
        for (let e = el.parentElement; e; e = e.parentElement)
          if (e.scrollHeight > e.clientHeight || e.scrollWidth > e.clientWidth)
            if (!scrolled.has(e)) scrolled.set(e, [e.scrollLeft, e.scrollTop]);
      };
      const wrong = [];
      for (const el of targets) {
        keep(el);
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const root = el.closest(scope);
        const on = (px, py) => {
          // The screen's edge: a finger cannot miss beyond it.
          if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) return true;
          const hit = document.elementFromPoint(px, py);
          if (!hit) return false;
          if (el.contains(hit)) return true;
          // Another layer laid over it for a while (Lorenzo's bubble over a panel): not this
          // control's own size, the guide's check looks at what it covers.
          const layer = hit.closest(`${scope}, [data-hud], [data-hud-overlay]`);
          return !!layer && layer !== root && !layer.contains(root) && !root.contains(layer);
        };
        // Under something else at its very centre (a bubble, a sticky foot): not this check's.
        if (!on(x, y)) continue;
        const short = [
          ["above", x, y - half],
          ["below", x, y + half],
          ["left", x - half, y],
          ["right", x + half, y],
        ].filter(([, px, py]) => !on(px, py));
        if (short.length > 0)
          wrong.push(
            `${name(el)} is touched on less than ${target} × ${target} px (drawn ${Math.round(r.width)} × ${Math.round(r.height)}, short ${short.map(([side]) => side).join(", ")})`,
          );
      }
      for (const [e, [left, top]] of scrolled) e.scrollTo({ left, top, behavior: "instant" });
      return wrong;
    },
    { target: TARGET },
  );
}

/** A line of data reads on one line: never « 21 » at the end of one, « h » on the next. */
function wraps(page) {
  return page.evaluate(() => {
    const wrong = [];
    for (const el of document.querySelectorAll(".meta")) {
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      // A sentence, read through, may run over several lines.
      if (text === "" || /[.!?:]( |$)/.test(text)) continue;
      if (el.getClientRects().length === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= innerHeight || r.width < 1) continue;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || Number(s.opacity) === 0) continue;
      const line = Number.parseFloat(s.lineHeight) || Number.parseFloat(s.fontSize) * 1.375;
      // Its text's own boxes: one line is one height of line, whatever the box around it.
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set([...range.getClientRects()].map((b) => Math.round(b.top / (line / 2))));
      const rows = Math.round(range.getBoundingClientRect().height / line);
      if (rows > 1 && tops.size > 1)
        wrong.push(
          `.meta « ${text.slice(0, 50)} » wraps on ${rows} lines (${Math.round(r.width)} px wide)`,
        );
    }
    return wrong;
  });
}

/** Lorenzo's ring on what is touched under it; nothing left over his bubble. */
function guide(page) {
  return page.evaluate(() => {
    const wrong = [];
    const ring = document.querySelector(".coach-ring");
    if (ring) {
      const name = ring.getAttribute("data-coach-target");
      const r = ring.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const target = hit?.closest("[data-coach]");
      const ok =
        hit &&
        [...document.querySelectorAll(`[data-coach="${name}"]`)].some(
          (el) => el.contains(hit) || hit.contains(el),
        );
      if (!ok) {
        const what = (hit?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
        wrong.push(
          `the guide rings « ${name} », but under its centre is ${target ? `« ${target.dataset.coach} »` : (hit?.tagName.toLowerCase() ?? "nothing")} « ${what} »`,
        );
      }
    }
    const bubble = document.querySelector("[data-coach-bubble]");
    const fx = [...document.querySelectorAll("[data-fx-layer] > *")].filter(
      (el) => Number(getComputedStyle(el).opacity) > 0.05,
    );
    for (const el of fx) {
      const what = el.hasAttribute("data-coin") ? "a coin" : `« ${el.textContent} »`;
      const r = el.getBoundingClientRect();
      const over = bubble
        ? (() => {
            const b = bubble.getBoundingClientRect();
            return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
          })()
        : false;
      wrong.push(
        `${what} of the effects left on screen after its flight${over ? ", over Lorenzo's bubble" : ""}`,
      );
    }
    return wrong;
  });
}
