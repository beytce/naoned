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
// - line: a line of the HUD that gives way item by item (`data-hud-meta`) shows one cut;
// - guide: Lorenzo's ring is drawn where its target is not the element touched under its centre
//   (a sheet over it), or something is left over his bubble (a coin of the effects, still shown
//   once their flights have ended).

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
  fail([...(await overflows(page)), ...(await overlaps(page)), ...(await guide(page))]);
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
