/* ===========================================================================
   AudioEngine — the only code that touches an HTMLAudioElement.

   Responsibility (SRP): low-level playback over a single <audio> element —
   load a source on demand, play/pause, expose state, forward media events.

   This is the seam for evolving playback (Dependency Inversion): MusicPlayer
   depends on this small surface, not on the DOM media API, so a future
   streaming backend (Media Source Extensions / HLS) can replace this class
   without touching the player, playlist, or UI.
   =========================================================================== */

export class AudioEngine {
  /** @param {HTMLAudioElement} el */
  constructor(el) {
    if (!el) throw new Error("AudioEngine requires an <audio> element");
    this.el = el;
    // On-demand streaming: nothing is fetched until the first load()+play().
    this.el.preload = "none";
    // Full volume — visitors adjust loudness with their own device controls.
    this.el.volume = 1.0;
  }

  /** Point the element at a source (no-op if unchanged) so playback streams it. */
  load(src) {
    if (this.el.src !== src) this.el.src = src;
  }

  /**
   * Start playback. play() rejects until the page has had a user gesture
   * (browser autoplay policy); swallow that so it isn't an unhandled rejection.
   * @returns {Promise<void>}
   */
  play() {
    return this.el.play().catch(() => {});
  }

  pause() {
    this.el.pause();
  }

  get paused() {
    return this.el.paused;
  }

  /** Seconds played in the current source (0 before metadata loads). */
  get currentTime() {
    return this.el.currentTime || 0;
  }

  /** Length of the current source in seconds (NaN/0 until metadata loads). */
  get duration() {
    return this.el.duration || 0;
  }

  /** Jump to an absolute position (seconds) within the current source. */
  seek(seconds) {
    if (Number.isFinite(seconds)) this.el.currentTime = seconds;
  }

  set volume(value) {
    this.el.volume = value;
  }

  get volume() {
    return this.el.volume;
  }

  /** Subscribe to a media event (e.g. "ended"). Returns an unsubscribe fn. */
  on(event, cb) {
    this.el.addEventListener(event, cb);
    return () => this.el.removeEventListener(event, cb);
  }
}
