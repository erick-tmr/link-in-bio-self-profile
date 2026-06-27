/* ===========================================================================
   Erick Takeshi — personal page · entry point.

   Composition root: this is the one place where concrete modules are
   constructed and wired together. Everything else depends on the small
   interfaces passed in here, not on each other.
   =========================================================================== */
import { DICT, DEFAULT_LANG } from "./i18n/dictionary.js";
import { I18n } from "./i18n/i18n.js";
import { TRACKS, Playlist } from "./player/playlist.js";
import { AudioEngine } from "./player/audio-engine.js";
import { MusicPlayer } from "./player/music-player.js";
import { MusicDock } from "./player/music-dock.js";

const i18n = new I18n(DICT);

const audioEl = document.getElementById("track");
if (audioEl) {
  const player = new MusicPlayer(new AudioEngine(audioEl), new Playlist(TRACKS));
  new MusicDock({ player, i18n });
}

i18n.apply(DEFAULT_LANG);
