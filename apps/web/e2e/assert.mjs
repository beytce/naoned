// Layout assertions shared by the end-to-end scripts, run in the page after every step: each
// throws, naming what is wrong.
//
// - overflow: the page scrolls sideways (a line or a block wider than the phone);
// - overlap: two blocks of the HUD (marked `data-hud`, or `role=button`) cover each other by more
//   than 2 px both ways, one not being inside the other; a badge or a dot sitting on its round is
//   inside it, and anything else meant to overlap says so with `data-hud-overlay`;
// - target: a block of the HUD that can be touched is smaller than 44 × 44 px.

const SLACK = 2;
const TARGET = 44;

/** The page is no wider than the phone: nothing to scroll sideways. */
export async function assertNoOverflow(page) {
  fail(await overflows(page));
}

/** No two blocks of the HUD cover each other; those that can be touched are 44 px at least. */
export async function assertNoOverlap(page) {
  fail(await overlaps(page));
}

/** Both at once, all that is wrong in one message. */
export async function assertLayout(page) {
  fail([...(await overflows(page)), ...(await overlaps(page))]);
}

function fail(wrong) {
  if (wrong.length > 0) throw new Error(wrong.join("\n  "));
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
        return `${el.closest("[data-hud]")?.dataset.hud ?? el.tagName.toLowerCase()} « ${what} »`;
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
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (w > slack && h > slack)
            wrong.push(`${name(a)} covers ${name(b)} (${Math.round(w)} × ${Math.round(h)})`);
        }
      }
      return wrong;
    },
    { slack: SLACK, target: TARGET },
  );
}
