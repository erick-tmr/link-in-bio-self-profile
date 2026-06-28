/* ===========================================================================
   MusicPlayer — orchestrates the playlist and the audio engine.

   Responsibility (SRP): own the playback intent (enabled / playing) and the
   "what plays next" policy. It composes an AudioEngine and a Playlist (both
   injected — Dependency Inversion) and emits a change event so the UI can
   react. It holds no DOM references.

   Today's behaviour is preserved: one track that loops forever. Looping is
   expressed as "on ended, advance the playlist" — with a single track the
   playlist wraps back to it, and the same wiring drives real skipping once
   more tracks exist.
   =========================================================================== */

export class MusicPlayer {
  /**
   * @param {import("./audio-engine.js").AudioEngine} engine
   * @param {import("./playlist.js").Playlist} playlist
   */
  constructor(engine, playlist) {
    this.engine = engine;
    this.playlist = playlist;
    this.enabled = true; // user intent; actual playback waits for a gesture
    this.listeners = new Set();

    // When a track finishes, advance to the next one. Delegating to next()
    // (rather than inlining playlist.next() + load) keeps the UI in sync: it
    // emits the change event so the dock re-renders the new title/artist.
    this.engine.on("ended", () => this.next());
  }

  get currentTrack() {
    return this.playlist.current;
  }

  get isPlaying() {
    return !this.engine.paused;
  }

  get isEnabled() {
    return this.enabled;
  }

  /** Position within the current track, in seconds. */
  get currentTime() {
    return this.engine.currentTime;
  }

  /** Length of the current track, in seconds (0 until metadata loads). */
  get duration() {
    return this.engine.duration;
  }

  /** Begin (or resume) playback of the current track. */
  play() {
    this.enabled = true;
    this._loadAndPlay();
    this._emit();
  }

  pause() {
    this.enabled = false;
    this.engine.pause();
    this._emit();
  }

  /** Toggle play/pause — the mute button's action. */
  toggle() {
    if (this.enabled) this.pause();
    else this.play();
  }

  /** Skip to the next track. Plays it when enabled. (Ready for skip UI.) */
  next() {
    this.playlist.next();
    if (this.enabled) this._loadAndPlay();
    this._emit();
  }

  /**
   * Skip to the previous track — but if we're more than 3s into the current
   * one, "previous" restarts it (the familiar media-player behaviour) instead
   * of jumping back. Plays it when enabled.
   */
  prev() {
    if (this.engine.currentTime > 3) {
      this.engine.seek(0);
      this._emit();
      return;
    }
    this.playlist.prev();
    if (this.enabled) this._loadAndPlay();
    this._emit();
  }

  /** Scrub to a fraction (0..1) of the current track's duration. */
  seek(fraction) {
    const d = this.engine.duration;
    if (d > 0) this.engine.seek(Math.min(1, Math.max(0, fraction)) * d);
  }

  /** Subscribe to player state changes. Returns an unsubscribe function. */
  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Subscribe to playback-position updates (a high-frequency signal kept
   * separate from onChange so the UI can cheaply redraw just the progress bar).
   * The callback receives (currentTime, duration). Returns an unsubscribe fn.
   */
  onTime(cb) {
    const emit = () => cb(this.engine.currentTime, this.engine.duration);
    const offTime = this.engine.on("timeupdate", emit);
    const offMeta = this.engine.on("loadedmetadata", emit);
    return () => {
      offTime();
      offMeta();
    };
  }

  _loadAndPlay() {
    this.engine.load(this.currentTrack.src);
    this.engine.play();
  }

  _emit() {
    this.listeners.forEach((cb) => cb(this));
  }
}
