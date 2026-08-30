/* ===========================================================================
   Site bootstrap — the chrome every page shares.

   Responsibility (SRP): mount the music dock and the decorative layers, wire
   the donate section's copy button, construct the i18n layer and the player,
   and own the language *policy* (which language a visitor gets, and
   remembering it across navigations). I18n itself stays a pure DOM applier —
   persistence is a site decision, not a translation one.

   Each page has its own composition root (js/main.js, js/tools/.../page.js)
   that supplies its dictionary and then calls applyPreferred() last, once its
   own listeners are subscribed: I18n.t() returns undefined until the first
   apply(), so anything that reads copy must already be listening.
   =========================================================================== */
import { I18n } from "./i18n/i18n.js";
import { mountDock } from "./player/dock-markup.js";
import { mountBinaryRain } from "./ui/binary-rain.js";
import { mountKobanRain } from "./ui/koban-rain.js";
import { initDonate } from "./ui/donate.js";
import { TRACKS, Playlist } from "./player/playlist.js";
import { AudioEngine } from "./player/audio-engine.js";
import { MusicPlayer } from "./player/music-player.js";
import { MusicDock } from "./player/music-dock.js";
import { PlaybackMemory } from "./player/playback-memory.js";

const LANG_KEY = "et.lang";

/** Read the remembered language. Storage can throw (Safari private mode). */
function storedLang() {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

function rememberLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage unavailable — the language still applies for this page view */
  }
}

/**
 * Wire up the shared chrome and return the page's I18n instance.
 *
 * @param {object} deps
 * @param {Record<string, Record<string, string>>} deps.dict
 * @param {string} deps.defaultLang  used when nothing valid is remembered
 * @param {Document} [deps.root]
 * @returns {I18n & {applyPreferred: () => void}}
 */
export function bootSite({ dict, defaultLang, root = document }) {
  mountDock(root); // before MusicDock — it resolves the dock's IDs in its constructor
  mountBinaryRain(root); // decorative; no-ops on pages without [data-binary-rain]
  mountKobanRain(root); // decorative; no-ops on pages without [data-koban-rain]

  const i18n = new I18n(dict, { root });

  const audioEl = root.getElementById("track");
  if (audioEl) {
    const playlist = new Playlist(TRACKS, { shuffle: true });
    const player = new MusicPlayer(new AudioEngine(audioEl), playlist);

    // Pick the music up where the previous page left it, before the dock is
    // built, so its first paint shows the resumed track rather than flashing
    // a different one.
    const memory = new PlaybackMemory({ player, playlist });
    memory.restore();
    memory.watch();

    new MusicDock({ player, i18n });
  }

  // The donate section is static markup on every page; only its copy button
  // needs wiring, and it needs i18n to render its own label.
  initDonate({ i18n, root });

  i18n.onChange(rememberLang);

  /** Apply the remembered language, falling back to the page default. */
  i18n.applyPreferred = () => {
    const remembered = storedLang();
    i18n.apply(remembered && dict[remembered] ? remembered : defaultLang);
  };

  return i18n;
}
