/* ===========================================================================
   MusicDock — the UI adapter between the DOM dock and the MusicPlayer.

   Responsibility (SRP): wire the dock's button to the player, reflect player
   state on screen (muted class, aria-pressed, label text), and handle the
   browser's autoplay policy by starting playback on the first user gesture.

   The music label depends on two things — playback state and language — so the
   dock subscribes to BOTH player.onChange and i18n.onChange and recomputes the
   text via i18n.t(). That keeps the language and player modules unaware of each
   other (the coupling lived in the old applyLang -> updateMusicLabel call).
   =========================================================================== */

export class MusicDock {
  /**
   * @param {object} deps
   * @param {import("./music-player.js").MusicPlayer} deps.player
   * @param {import("../i18n/i18n.js").I18n} deps.i18n
   * @param {Document|HTMLElement} [deps.root]
   */
  constructor({ player, i18n, root = document }) {
    this.player = player;
    this.i18n = i18n;

    this.dock = root.getElementById("dock");
    this.musicBtn = root.getElementById("musicBtn");
    this.musicLabel = root.getElementById("musicLabel");

    if (this.musicBtn) this.musicBtn.addEventListener("click", () => this.player.toggle());

    // Re-render whenever playback state OR language changes.
    this.player.onChange(() => this.render());
    this.i18n.onChange(() => this.render());

    this._armAutoplay();
  }

  /** Reflect the player's enabled (intent) state on the dock. */
  render() {
    const enabled = this.player.isEnabled;
    if (this.dock) this.dock.classList.toggle("is-muted", !enabled);
    if (this.musicBtn) this.musicBtn.setAttribute("aria-pressed", String(enabled));
    if (this.musicLabel) {
      this.musicLabel.textContent = this.i18n.t(enabled ? "musicOn" : "musicOff") ?? "";
    }
  }

  /** Start playback on the first user gesture (browser autoplay policy). */
  _armAutoplay() {
    const kick = () => {
      if (this.player.isEnabled) this.player.play();
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
  }
}
