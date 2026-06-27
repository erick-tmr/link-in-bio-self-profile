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

    // When a track finishes, advance and keep playing (wrap = loop for 1 track).
    this.engine.on("ended", () => {
      this.playlist.next();
      if (this.enabled) this._loadAndPlay();
    });
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

  /** Skip to the previous track. Plays it when enabled. (Ready for skip UI.) */
  prev() {
    this.playlist.prev();
    if (this.enabled) this._loadAndPlay();
    this._emit();
  }

  /** Subscribe to player state changes. Returns an unsubscribe function. */
  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  _loadAndPlay() {
    this.engine.load(this.currentTrack.src);
    this.engine.play();
  }

  _emit() {
    this.listeners.forEach((cb) => cb(this));
  }
}
