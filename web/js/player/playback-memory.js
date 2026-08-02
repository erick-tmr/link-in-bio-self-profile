/* ===========================================================================
   PlaybackMemory — carries the music across a page navigation.

   Responsibility (SRP): persist just enough playback state (which track, how
   far in, playing or paused, and the shuffled queue behind it) and hand it
   back to a fresh page. It owns no audio, no DOM and no playlist logic; it
   reads a snapshot from the two of them and gives it back on the next load.

   sessionStorage, not localStorage, on purpose. Resuming mid-track is only
   sensible inside one visit: coming back tomorrow should start fresh, and a
   second tab should keep its own queue rather than fight over one key. The
   language preference is the opposite case, which is why that one is in
   localStorage (see js/site.js).

   Saving is event-driven rather than on a timer. pagehide is the one event
   that reliably fires on navigation everywhere, including iOS and bfcache;
   visibilitychange covers a tab being backgrounded and then discarded.
   =========================================================================== */

const KEY = "et.playback";

/** sessionStorage, or null where it is unavailable (Safari private mode). */
export function safeSessionStorage() {
  try {
    const s = globalThis.sessionStorage;
    const probe = "__et_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export class PlaybackMemory {
  /**
   * @param {object} deps
   * @param {import("./music-player.js").MusicPlayer} deps.player
   * @param {import("./playlist.js").Playlist} deps.playlist
   * @param {Storage|null} [deps.storage]
   * @param {string} [deps.key]
   */
  constructor({ player, playlist, storage = safeSessionStorage(), key = KEY }) {
    this.player = player;
    this.playlist = playlist;
    this.storage = storage;
    this.key = key;

    // The position we handed to the player, held until the media reports a
    // real one of its own. See save().
    this._resumeAt = 0;
    this._resumeId = null;
  }

  /**
   * Apply whatever the previous page saved. A snapshot that no longer fits the
   * current track list is discarded by Playlist.restore(), in which case this
   * leaves the freshly shuffled queue alone and reports false.
   *
   * @returns {boolean} whether a previous session was picked up
   */
  restore() {
    const saved = this._read();
    if (!saved) return false;
    if (!this.playlist.restore(saved.queue)) return false;

    this._resumeAt = saved.position;
    this._resumeId = saved.queue.id;
    this.player.resumeFrom(saved.position, saved.playing);
    return true;
  }

  /**
   * Snapshot the current position. Safe to call at any time.
   *
   * The subtlety is the window right after a resume. An element that has been
   * given a source but has not loaded it yet reports currentTime 0: the
   * position we asked for is held as the default playback start position and
   * only becomes visible once the media loads. If autoplay was refused, that
   * can take until the visitor's first keypress or click. Saving during that
   * window would overwrite a perfectly good position with the start of the
   * track, and the next page would resume from zero.
   *
   * So until the player reports a position of its own, keep reporting the one
   * we resumed from. Once it does, the media is live and is trusted from then
   * on, including a deliberate seek back to the very beginning.
   */
  save() {
    if (!this.storage) return;

    const live = Math.max(0, Math.floor(this.player.currentTime));
    if (live > 0) {
      this._resumeAt = 0;
      this._resumeId = null;
    }

    const stillOnResumedTrack = this._resumeId !== null && this.playlist.current.id === this._resumeId;
    const position = live > 0 ? live : stillOnResumedTrack ? this._resumeAt : 0;

    try {
      this.storage.setItem(
        this.key,
        JSON.stringify({
          queue: this.playlist.snapshot(),
          position,
          playing: this.player.isEnabled
        })
      );
    } catch {
      /* quota or a disabled store — losing the position is not worth throwing */
    }
  }

  /**
   * Start recording. Saves when the track or play state changes, and again as
   * the page goes away so the position is as fresh as possible.
   *
   * @param {EventTarget} [target]  the window, injected for tests
   * @returns {() => void} stop recording
   */
  watch(target = globalThis) {
    const save = () => this.save();
    const onHide = () => {
      if (target.document && target.document.visibilityState === "visible") return;
      this.save();
    };

    const offChange = this.player.onChange(save);
    target.addEventListener("pagehide", save);
    target.addEventListener("visibilitychange", onHide);

    return () => {
      offChange();
      target.removeEventListener("pagehide", save);
      target.removeEventListener("visibilitychange", onHide);
    };
  }

  /** Forget the saved session (used when nothing should be resumed). */
  clear() {
    if (!this.storage) return;
    try {
      this.storage.removeItem(this.key);
    } catch {
      /* nothing to do */
    }
  }

  _read() {
    if (!this.storage) return null;
    let raw;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return null;
    }
    if (!raw) return null;

    try {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return null;
      return {
        queue: saved.queue,
        position: Number.isFinite(saved.position) && saved.position > 0 ? saved.position : 0,
        playing: saved.playing !== false
      };
    } catch {
      return null; // corrupt entry; start clean rather than guess
    }
  }
}
