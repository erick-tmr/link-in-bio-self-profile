/* ===========================================================================
   Koban rain — the gold coins falling behind the donate card.

   Purely decorative, so it lives in JS rather than the markup, for the same
   reason as binary-rain.js: twenty coins are sixty-odd nested spans carrying
   nothing a reader or a crawler can use, repeated on every page of the site.
   A page opts in with `[data-koban-rain]` on an empty container.

   Each coin gets its own fall period, phase and sheen period, all irregular
   on purpose — round numbers make the column visibly fall in step after a few
   seconds. The negative delays start every coin mid-fall, so the card is
   already raining on first paint instead of filling up from empty.

   How far a coin falls is measured, not fixed: the card it rains on more than
   doubles in height when the Ko-fi widget opens, and a constant drop left the
   coins fading out two thirds of the way down an open card. The keyframes take
   the distance from --koban-drop, which is kept in step with the card's real
   height here.
   =========================================================================== */

/**
 * Coin layout: [left %, width, height, fall period s, delay s, sheen period s,
 * sparkle size, spin]. The two spins are mirror images — "a" tumbles clockwise
 * and catches the light on its top-right corner, "b" the other way.
 */
const COINS = [
  [2, 18, 9, 5.6, -0.3, 2.4, 10, "a"],
  [7, 24, 11, 7, -3.2, 2.8, 13, "b"],
  [12, 14, 7, 8.4, -4.1, 3.1, 8, "b"],
  [17, 21, 10, 6.2, -1.1, 2.2, 12, "a"],
  [23, 16, 8, 9.3, -6.8, 3.4, 9, "b"],
  [28, 25, 12, 6.6, -2.3, 2.5, 14, "a"],
  [33, 15, 8, 8, -5.4, 3.6, 8, "b"],
  [38, 20, 10, 5.9, -1.9, 2.6, 11, "a"],
  [43, 23, 11, 7.4, -3.9, 2.9, 13, "b"],
  [48, 14, 7, 9.6, -7.2, 3.8, 8, "a"],
  [53, 19, 9, 6.4, -0.8, 2.3, 10, "b"],
  [59, 25, 12, 7.8, -4.6, 2.7, 14, "a"],
  [64, 16, 8, 8.8, -2.7, 3.3, 9, "b"],
  [69, 22, 10, 6, -5.9, 2.1, 12, "a"],
  [74, 15, 7, 9.1, -1.5, 3.5, 8, "b"],
  [79, 24, 11, 6.9, -3.4, 2.8, 13, "a"],
  [85, 18, 9, 8.2, -6.3, 3, 10, "b"],
  [90, 21, 10, 5.8, -2, 2.4, 12, "a"],
  [95, 14, 7, 9.9, -4.8, 3.7, 8, "b"],
  [98, 23, 11, 7.2, -1.2, 2.6, 13, "a"]
];

/**
 * The sparkle sits just off the coin's corner, overhanging by about half its
 * own size. Both offsets fall out of the sparkle size, so the table above only
 * has to carry the size.
 */
const sparkX = (size) => -Math.round(size * 0.45);
const sparkY = (size) => -Math.round(size / 2);

/** One coin: the disc, the sheen sweeping across it, and its corner sparkle. */
function coin([x, w, h, fall, delay, sheen, spark, spin]) {
  const vars = [
    `--x:${x}%`,
    `--w:${w}px`,
    `--h:${h}px`,
    `--fall:${fall}s`,
    `--delay:${delay}s`,
    `--sheen:${sheen}s`,
    `--s:${spark}px`,
    `--sx:${sparkX(spark)}px`,
    `--sy:${sparkY(spark)}px`
  ].join("; ");

  return `<span class="koban koban--${spin}" style="${vars}">
    <span class="koban__coin"><span class="koban__sheen"></span></span>
    <span class="koban__spark"></span>
  </span>`;
}

/**
 * A coin starts 34px above the card, so it has to travel the card's full height
 * plus that head start to leave the bottom edge. The extra margin lets it
 * finish fading just past the edge rather than winking out inside the frame.
 */
const dropFor = (card) => Math.round(card.getBoundingClientRect().height) + 80;

/**
 * Keep `--koban-drop` on `host` in step with the height of the card it rains
 * on. The card resizes on its own schedule — the Ko-fi disclosure opening, the
 * widget's frame settling, the copy reflowing on a rotate — so this watches
 * rather than measuring once.
 */
function trackCardHeight(host) {
  const card = host.parentElement;
  if (!card) return;

  const apply = () => host.style.setProperty("--koban-drop", `${dropFor(card)}px`);
  apply();

  if (typeof ResizeObserver === "function") {
    // Writing a custom property on a child cannot resize the card, so this
    // cannot feed itself.
    new ResizeObserver(apply).observe(card);
  } else {
    window.addEventListener("resize", apply);
  }
}

/**
 * Fill every `[data-koban-rain]` container in `root` with its coins.
 *
 * No-ops under `prefers-reduced-motion`: the CSS freezes the animation anyway,
 * and twenty coins stopped mid-air read as a bug rather than as decoration.
 *
 * @param {Document|HTMLElement} root
 */
export function mountKobanRain(root = document) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  for (const host of root.querySelectorAll("[data-koban-rain]")) {
    host.innerHTML = COINS.map(coin).join("");
    trackCardHeight(host);
  }
}
