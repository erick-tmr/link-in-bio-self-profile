/* ===========================================================================
   SavePatcher — the patcher's state, with no DOM in sight.

   Responsibility (SRP): hold the loaded save and everything derived from it
   (report, error, whether a patch has been applied), and drive save-format.js.
   It takes bytes and exposes bytes; FileReader, Blob and object URLs belong to
   patcher-ui.js. That split is what makes every branch here reachable from
   `node --test` without a browser.

   Mirrors the MusicPlayer/MusicDock seam already used by the music dock: state
   object emits, DOM adapter subscribes.

   save-format.js is loaded lazily so the ~8 KB of byte logic is fetched only
   when the page actually runs, and injected (loadLib) so the failure path is
   testable rather than theoretical.
   =========================================================================== */

/** @typedef {"idle"|"loaded"|"patched"|"error"} Phase */

export class SavePatcher {
  /**
   * @param {object} [deps]
   * @param {() => Promise<object>} [deps.loadLib]  resolves the save-format module
   */
  constructor({ loadLib = () => import("./save-format.js") } = {}) {
    this._loadLib = loadLib;
    this._lib = null;
    this._pending = null;
    this.listeners = new Set();

    this.fileName = null;
    this.bytes = null;
    this.report = null;
    this.error = null;
    /** @type {"unlocked"|"restored"|null} */
    this.patched = null;
  }

  /** @returns {Phase} */
  get phase() {
    if (this.error) return "error";
    if (this.patched) return "patched";
    return this.report ? "loaded" : "idle";
  }

  get loaded() {
    return !!this.report;
  }

  get canUnlock() {
    return this.loaded && this.report.state !== "unlocked";
  }

  get canRemove() {
    return this.loaded && this.report.state !== "locked";
  }

  /**
   * Resolve save-format.js. Memoized, so a failed import is retried on the next
   * call rather than being cached as broken forever.
   * @returns {Promise<object|null>} the module, or null once the error is set
   */
  async ready() {
    if (this._lib) return this._lib;
    if (!this._pending) {
      this._pending = Promise.resolve()
        .then(this._loadLib)
        .then((mod) => {
          this._lib = mod;
          return mod;
        })
        .catch(() => {
          this._pending = null;
          this._fail("lib");
          return null;
        });
    }
    return this._pending;
  }

  /**
   * Validate and inspect a save. Any rejection leaves the previous file cleared
   * and the error visible — never a half-loaded state.
   * @param {string} fileName
   * @param {Uint8Array} bytes
   */
  async loadBytes(fileName, bytes) {
    const lib = await this.ready();
    if (!lib) return;

    const check = lib.validateSave(bytes);
    if (!check.ok) {
      this._fail(check.code, fileName);
      return;
    }

    this.fileName = fileName;
    this.bytes = bytes;
    this.report = lib.inspectSave(bytes);
    this.error = null;
    this.patched = null;
    this._emit();
  }

  /** The browser could not read the file at all. */
  failRead(fileName) {
    this._fail("read", fileName);
  }

  /** Write the N64 unlock markers. */
  unlock() {
    return this._patch("applyUnlock", "unlocked");
  }

  /** Reverse the unlock (also repairs a half-applied save). */
  restore() {
    return this._patch("removeUnlock", "restored");
  }

  reset() {
    this.fileName = null;
    this.bytes = null;
    this.report = null;
    this.error = null;
    this.patched = null;
    this._emit();
  }

  /**
   * Subscribe to state changes.
   * @param {(patcher: SavePatcher) => void} cb
   * @returns {() => void} unsubscribe
   */
  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * @param {"applyUnlock"|"removeUnlock"} op
   * @param {"unlocked"|"restored"} outcome
   */
  async _patch(op, outcome) {
    const lib = await this.ready();
    if (!lib || !this.bytes) return;
    try {
      const out = lib[op](this.bytes);
      this.bytes = out;
      this.report = lib.inspectSave(out);
      this.patched = outcome;
      this.error = null;
    } catch (e) {
      // PatchError carries .code; anything else is genuinely unexpected. The
      // loaded bytes are left untouched either way.
      this.error = (e && e.code) || "unknown";
    }
    this._emit();
  }

  /** Clear the loaded save and surface an error code. */
  _fail(code, fileName = this.fileName) {
    this.error = code;
    this.fileName = fileName;
    this.bytes = null;
    this.report = null;
    this.patched = null;
    this._emit();
  }

  _emit() {
    this.listeners.forEach((cb) => cb(this));
  }
}
