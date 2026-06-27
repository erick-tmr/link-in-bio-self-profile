/* ===========================================================================
   I18n — owns the active language and applies it to the DOM.

   Responsibility (SRP): translate [data-i18n] nodes, reflect the active
   language on the .lang-btn switches, and notify subscribers when the language
   changes. It knows nothing about music or any other feature — interested
   parties (e.g. the music dock label) subscribe via onChange().
   =========================================================================== */

export class I18n {
  /**
   * @param {Record<string, Record<string, string>>} dict  language -> key -> text
   * @param {object} [options]
   * @param {Document|HTMLElement} [options.root]  scope for DOM queries
   */
  constructor(dict, { root = document } = {}) {
    this.dict = dict;
    this.root = root;
    this.lang = null;
    this.listeners = new Set();

    this.i18nNodes = root.querySelectorAll("[data-i18n]");
    this.langButtons = root.querySelectorAll(".lang-btn");

    this.langButtons.forEach((btn) => {
      btn.addEventListener("click", () => this.apply(btn.getAttribute("data-lang")));
    });
  }

  /** Look up a single translated string in the active language. */
  t(key) {
    const dict = this.dict[this.lang];
    return dict ? dict[key] : undefined;
  }

  /** Switch language: update the document, DOM nodes, switches, and listeners. */
  apply(lang) {
    if (!this.dict[lang]) return;
    this.lang = lang;
    const dict = this.dict[lang];

    document.documentElement.lang = lang;

    this.i18nNodes.forEach((node) => {
      const value = dict[node.getAttribute("data-i18n")];
      if (value != null) node.textContent = value;
    });

    this.langButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
    });

    this.listeners.forEach((cb) => cb(lang));
  }

  /** Subscribe to language changes. Returns an unsubscribe function. */
  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}
