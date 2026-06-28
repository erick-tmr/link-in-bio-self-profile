/* ===========================================================================
   MusicDock — the UI adapter between the DOM player and the MusicPlayer.

   Responsibility (SRP): wire the player's controls (play/pause, prev, next,
   seek, minimize/expand) to the MusicPlayer, reflect player state on screen
   (now-playing label, track meta, progress, paused vs playing visuals), and
   handle the browser's autoplay policy by starting playback on the first user
   gesture.

   It keeps two cheap, separate redraw paths: render() for state/track changes
   (driven by player.onChange + i18n.onChange) and renderTime() for the
   high-frequency progress tick (driven by player.onTime). The status label
   depends on both playback state and language, so the dock recomputes it via
   i18n.t() — keeping the language and player modules unaware of each other.
   =========================================================================== */

const MOBILE_MAX = 640; // start collapsed below this width so it doesn't crowd

/** Seconds -> "m:ss". */
function fmt(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

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

    this.el = root.getElementById("player");
    if (!this.el) return; // no player markup on the page — nothing to wire

    this.status = root.getElementById("playerStatus");
    this.title = root.getElementById("playerTitle");
    this.artist = root.getElementById("playerArtist");
    this.bar = root.getElementById("playerBar");
    this.fill = root.getElementById("playerFill");
    this.handle = root.getElementById("playerHandle");
    this.timeNow = root.getElementById("playerNow");
    this.timeTotal = root.getElementById("playerTotal");

    const playBtn = root.getElementById("playerPlay");
    const prevBtn = root.getElementById("playerPrev");
    const nextBtn = root.getElementById("playerNext");
    const minBtn = root.getElementById("playerMin");
    const miniBtn = root.getElementById("playerMini");

    if (playBtn) playBtn.addEventListener("click", () => this.player.toggle());
    if (prevBtn) prevBtn.addEventListener("click", () => this.player.prev());
    if (nextBtn) nextBtn.addEventListener("click", () => this.player.next());
    if (minBtn) minBtn.addEventListener("click", () => this.setCollapsed(true));
    if (miniBtn) miniBtn.addEventListener("click", () => this.setCollapsed(false));
    if (this.bar) this.bar.addEventListener("click", (e) => this._seekFromEvent(e));

    // Two redraw paths: state/track (onChange + i18n) and progress (onTime).
    this.player.onChange(() => this.render());
    this.i18n.onChange(() => this.render());
    this.player.onTime((cur, dur) => this.renderTime(cur, dur));

    // Tuck the player away on small screens.
    if (typeof window !== "undefined" && window.innerWidth < MOBILE_MAX) {
      this.setCollapsed(true);
    }

    this.render();
    this._armAutoplay();
  }

  /** Reflect playback state + current track on the player UI. */
  render() {
    const enabled = this.player.isEnabled;
    this.el.classList.toggle("is-muted", !enabled);

    const track = this.player.currentTrack;
    if (this.title) this.title.textContent = track ? track.title : "";
    if (this.artist) this.artist.textContent = track ? track.artist : "";
    if (this.status) {
      this.status.textContent = this.i18n.t(enabled ? "musicNowPlaying" : "musicPaused") ?? "";
    }

    const playBtn = this.el.querySelector("#playerPlay");
    if (playBtn) playBtn.setAttribute("aria-pressed", String(enabled));
  }

  /** Update just the progress bar + time labels (high-frequency tick). */
  renderTime(cur, dur) {
    const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;
    if (this.fill) this.fill.style.width = pct + "%";
    if (this.handle) this.handle.style.left = pct + "%";
    if (this.timeNow) this.timeNow.textContent = fmt(cur);
    if (this.timeTotal) this.timeTotal.textContent = dur > 0 ? fmt(dur) : "--:--";
  }

  /** Collapse to the puck (true) or expand the panel (false). */
  setCollapsed(collapsed) {
    this.el.classList.toggle("is-collapsed", collapsed);
  }

  /** Seek to the clicked fraction of the progress bar. */
  _seekFromEvent(e) {
    const rect = this.bar.getBoundingClientRect();
    if (!rect.width) return;
    const fraction = (e.clientX - rect.left) / rect.width;
    this.player.seek(fraction);
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
