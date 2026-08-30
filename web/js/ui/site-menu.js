/* ===========================================================================
   All-pages menu — the header's site map disclosure.

   The three nav buttons only reach the two hubs. This panel carries the whole
   map: both hubs, the pages inside them, and the profiles off-site.

   Every link in it is reachable some other way, so the trigger ships from the
   server with the hidden attribute set and is revealed here. Without JS a
   visitor keeps the nav buttons and never meets a button that does nothing —
   the same bargain js/ui/donate.js strikes with the Ko-fi disclosure.

   The panel itself stays static markup: I18n queries [data-i18n] once, when it
   is constructed, so copy built at runtime would never be translated.
   =========================================================================== */

/**
 * Wire the header's all-pages menu. No-ops on pages without one.
 *
 * @param {Document|HTMLElement} [root]
 */
export function initSiteMenu(root = document) {
  const toggle = root.querySelector("[data-site-menu-toggle]");
  const panel = root.querySelector("[data-site-menu]");
  if (!toggle || !panel) return;

  let open = false;

  const render = () => {
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    // The panel is pinned under a sticky header, so it caps its own height
    // against the viewport and scrolls inside that. Only its distance from the
    // top of the viewport is missing, and that is the header's height — which
    // changes as the header wraps, so it is read here rather than guessed.
    if (open) panel.style.setProperty("--menu-top", `${panel.getBoundingClientRect().top}px`);
  };

  const close = () => {
    if (!open) return;
    open = false;
    render();
  };

  toggle.hidden = false; // JS is running, so the trigger can be trusted to work
  render();

  toggle.addEventListener("click", () => {
    open = !open;
    render();
  });

  // A panel this size covers whatever it drops over, so it has to be as easy
  // to dismiss as it is to open: Escape, or a press anywhere outside it.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !open) return;
    close();
    toggle.focus(); // Escape should not strand the keyboard at the top of the page
  });

  document.addEventListener("pointerdown", (event) => {
    if (!open || panel.contains(event.target) || toggle.contains(event.target)) return;
    close();
  });
}
