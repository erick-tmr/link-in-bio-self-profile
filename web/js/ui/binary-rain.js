/* ===========================================================================
   Binary rain — the digit columns falling behind the Cool Tools hero.

   Purely decorative, so it lives in JS rather than the markup: nineteen spans
   of forty digits each would be a third of the page's HTML, and none of it
   means anything to a reader or a crawler. A page opts in with
   `[data-binary-rain]` on an empty container; pages without one cost nothing.

   The column periods are deliberately irregular (6.2s to 13.5s, all with
   negative delays so they start mid-fall). Regular periods make the columns
   visibly march in step after a few seconds.
   =========================================================================== */

/** Column layout: [left %, colour custom property, opacity, duration s, delay s]. */
const COLUMNS = [
  [2, "--green", 0.85, 7.5, -1.2],
  [7, "--blue", 0.8, 11, -4.4],
  [12, "--green", 0.72, 9, -6.1],
  [17, "--green", 0.9, 6.2, -2.9],
  [22, "--red-soft", 0.72, 13, -0.6],
  [27, "--green", 0.8, 8.4, -5.3],
  [32, "--green", 0.7, 10.5, -3.1],
  [37, "--blue", 0.8, 7.9, -7.7],
  [42, "--green", 0.78, 12, -1.9],
  [47, "--green", 0.66, 6.8, -4.8],
  [53, "--green", 0.72, 9.6, -8.2],
  [58, "--red-soft", 0.72, 11.7, -2.2],
  [63, "--green", 0.68, 8.1, -6.6],
  [68, "--green", 0.62, 10.2, -3.7],
  [73, "--blue", 0.8, 13.5, -9.1],
  [78, "--green", 0.62, 7.2, -5.9],
  [83, "--green", 0.6, 9.9, -1.4],
  [88, "--red-soft", 0.72, 12.6, -7.3],
  [93, "--green", 0.6, 8.7, -4.1]
];

const DIGITS_PER_COLUMN = 40;

/**
 * The column scrolls from -50% to 0, so the digits have to be a doubled
 * sequence for the wrap to be seamless.
 */
function digits() {
  let half = "";
  for (let i = 0; i < DIGITS_PER_COLUMN / 2; i++) half += Math.random() < 0.5 ? "0" : "1";
  return half + half;
}

/**
 * Fill every `[data-binary-rain]` container in `root` with its columns.
 *
 * No-ops under `prefers-reduced-motion`: the CSS would freeze the animation
 * anyway, but a static wall of digits is worse than an empty panel.
 *
 * @param {Document|HTMLElement} root
 */
export function mountBinaryRain(root = document) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  for (const host of root.querySelectorAll("[data-binary-rain]")) {
    const frag = document.createDocumentFragment();

    for (const [left, color, opacity, duration, delay] of COLUMNS) {
      const col = document.createElement("span");
      col.className = "hero-panel__col";
      col.style.setProperty("--rain-left", `${left}%`);
      col.style.setProperty("--rain-color", `var(${color})`);
      col.style.setProperty("--rain-opacity", String(opacity));
      col.style.setProperty("--rain-dur", `${duration}s`);
      col.style.setProperty("--rain-delay", `${delay}s`);
      col.textContent = digits();
      frag.append(col);
    }

    host.append(frag);
  }
}
