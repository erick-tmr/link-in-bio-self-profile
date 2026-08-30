/* ===========================================================================
   Donate — the two interactive parts of the support section.

   Everything else in the section is static markup, because the ask, the key
   and the Pix QR have to survive with JS switched off. These two do not:

     1. The copy button. A clipboard button is inert without JS, so it owns its
        own label rather than leaving it to I18n's [data-i18n] sweep — the
        sweep would reset "COPIED ✓" to the idle label the moment a visitor
        switched language mid-confirmation. Listeners run at the end of
        I18n.apply(), so re-rendering on change puts the right one back.

     2. The Ko-fi disclosure. In the markup it is a plain link to ko-fi.com, so
        a visitor without JS still gets there; JS upgrades it in place into a
        button that opens the widget inline. The frame's URL waits in data-src
        until that first open — every page on the site carries this section,
        and an eager src would mean a third-party request, and Ko-fi's cookies,
        on every page view whether or not anyone asked for it.
   =========================================================================== */

/** How long the copy button stays in its confirmed state before reverting. */
const CONFIRM_MS = 1800;

/**
 * Put `node`'s text in the visitor's selection so they can copy it by hand.
 * Used when the clipboard API is unavailable or refuses — the button must not
 * claim a copy that never happened.
 */
function select(node) {
  const selection = window.getSelection?.();
  if (!node || !selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** The Pix key's copy-to-clipboard button. */
function initCopy({ i18n, root }) {
  const button = root.querySelector("[data-donate-copy]");
  if (!button) return;

  const key = button.getAttribute("data-donate-copy");
  const keyNode = root.querySelector("[data-donate-key]");
  let copied = false;
  let timer;

  const render = () => {
    const label = i18n.t(copied ? "donateCopied" : "donateCopy");
    if (label != null) button.textContent = label;
    button.classList.toggle("is-copied", copied);
  };

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(key);
      copied = true;
      render();
      clearTimeout(timer);
      timer = setTimeout(() => {
        copied = false;
        render();
      }, CONFIRM_MS);
    } catch {
      // No clipboard access (insecure context, or the visitor said no). Hand
      // them the selection instead and leave the label alone.
      select(keyNode);
    }
  });

  i18n.onChange(render);
}

/** The Ko-fi widget's show/hide disclosure. */
function initKofi({ i18n, root }) {
  const toggle = root.querySelector("[data-donate-kofi-toggle]");
  const panel = root.querySelector("[data-donate-kofi-panel]");
  if (!toggle || !panel) return;

  const label = toggle.querySelector("[data-donate-kofi-label]");
  const frame = panel.querySelector("iframe[data-src]");
  let open = false;

  // It ships as a link so it works without JS; from here on it is a button.
  toggle.setAttribute("role", "button");

  const render = () => {
    const text = i18n.t(open ? "donateKofiClose" : "donateKofiOpen");
    if (text != null && label) label.textContent = text;
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  };

  toggle.addEventListener("click", (event) => {
    // Let a modified click through to the href — opening Ko-fi in a new tab is
    // a reasonable thing to want, and the link still points there.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open = !open;
    if (open && frame && !frame.src) frame.src = frame.dataset.src;
    render();
  });

  i18n.onChange(render);
  render();
}

/**
 * Wire the donate section. No-ops on pages without one.
 *
 * @param {object} deps
 * @param {import("../i18n/i18n.js").I18n} deps.i18n
 * @param {Document|HTMLElement} [deps.root]
 */
export function initDonate({ i18n, root = document }) {
  initCopy({ i18n, root });
  initKofi({ i18n, root });
}
