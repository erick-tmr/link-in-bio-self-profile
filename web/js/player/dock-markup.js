/* ===========================================================================
   Dock markup — the music dock's DOM, owned in one place.

   Responsibility (SRP): produce the dock's markup and append it to a page.
   It wires nothing; MusicDock (music-dock.js) looks these IDs up and gives
   them behaviour, so mountDock() must run before MusicDock is constructed.

   Why this is JS and not static HTML: every page carries the same dock, and
   the markup declares ~20 IDs that music-dock.js resolves by hand. Three
   copies in three HTML files would drift the moment a control is added or an
   ID renamed. The site's other markup is inlined static HTML on purpose (so
   the page still reads without JS), but the dock is not content — it has no
   text of its own, no SEO value, and does nothing at all without JS. Leaving
   it out of the HTML actually improves the no-JS render, which would
   otherwise show a dead panel with blank labels.
   =========================================================================== */

const RAY_SHINY = "https://cdn.ericktakeshi.com.br/assets/rayquaza-shiny.png";
const RAY_SPRITE = "https://cdn.ericktakeshi.com.br/assets/rayquaza-sprite.png";

/** The dock's markup: expanded panel + collapsed puck + the audio element. */
export const DOCK_MARKUP = `
<div class="player" id="player">
  <!-- Expanded panel -->
  <div class="player__panel">
    <!-- decorative layers are clipped to the rounded panel; the panel itself
         is overflow:visible so the orbiting Rayquaza can rise above it
         instead of being clipped inside. -->
    <div class="player__clip" aria-hidden="true">
      <div class="player__scan"></div>
      <img class="player__bg-ray" src="${RAY_SHINY}" alt="" />
    </div>

    <div class="player__inner">
      <!-- header -->
      <div class="player__header">
        <span class="player__status-dot" aria-hidden="true"></span>
        <span class="player__status" id="playerStatus"></span>
        <span class="player__fm">SKY PILLAR · FM</span>
        <button type="button" class="player__min" id="playerMin" aria-label="Minimize player">
          <span class="player__min-bar" aria-hidden="true"></span>
        </button>
      </div>

      <!-- art + meta -->
      <div class="player__meta">
        <div class="player__art">
          <div class="player__art-scan" aria-hidden="true"></div>
          <img class="player__art-ray" src="${RAY_SHINY}" alt="" aria-hidden="true" />
        </div>
        <div class="player__info">
          <div class="player__title" id="playerTitle"></div>
          <div class="player__artist" id="playerArtist"></div>
          <span class="eq eq--meta" aria-hidden="true">
            <span class="eq__bar"></span>
            <span class="eq__bar"></span>
            <span class="eq__bar"></span>
            <span class="eq__bar"></span>
            <span class="eq__bar"></span>
          </span>
        </div>
      </div>

      <!-- progress -->
      <div class="player__progress">
        <div class="player__bar" id="playerBar">
          <div class="player__fill" id="playerFill"></div>
          <div class="player__handle" id="playerHandle"></div>
        </div>
        <div class="player__times">
          <span id="playerNow">0:00</span>
          <span id="playerTotal">--:--</span>
        </div>
      </div>

      <!-- transport -->
      <div class="player__transport">
        <button type="button" class="player__btn" id="playerPrev" aria-label="Previous track">
          <span class="ico-prev" aria-hidden="true"></span>
        </button>

        <div class="player__play-wrap">
          <div class="player__orbit" aria-hidden="true">
            <div class="player__orbit-arm">
              <img class="player__orbit-ray" src="${RAY_SPRITE}" alt="" />
            </div>
          </div>
          <button type="button" class="player__play" id="playerPlay" aria-label="Play or pause" aria-pressed="true">
            <span class="ico-pause" aria-hidden="true"><span></span><span></span></span>
            <span class="ico-play" aria-hidden="true"></span>
          </button>
        </div>

        <button type="button" class="player__btn" id="playerNext" aria-label="Next track">
          <span class="ico-next" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  </div>

  <!-- Collapsed puck -->
  <button type="button" class="player__mini" id="playerMini" aria-label="Open music player">
    <div class="player__orbit player__orbit--mini" aria-hidden="true">
      <div class="player__orbit-arm player__orbit-arm--mini">
        <img class="player__orbit-ray" src="${RAY_SPRITE}" alt="" />
      </div>
    </div>
    <span class="eq" aria-hidden="true">
      <span class="eq__bar"></span>
      <span class="eq__bar"></span>
      <span class="eq__bar"></span>
      <span class="eq__bar"></span>
    </span>
    <span class="player__badge" aria-hidden="true">♪</span>
  </button>

  <!-- Track source + looping are owned by the player (web/js/player/). -->
  <audio id="track" preload="none"></audio>
</div>`;

/**
 * Append the dock to the page, inside `.page` when it exists so the dock sits
 * in the same stacking context as on the original markup. Idempotent: a second
 * call is a no-op, so it can never produce duplicate IDs.
 *
 * @param {Document} [root]
 * @returns {HTMLElement|null} the mounted dock, or null if it was already there
 */
export function mountDock(root = document) {
  if (root.getElementById("player")) return null;
  const host = root.querySelector(".page") || root.body;
  if (!host) return null;
  host.insertAdjacentHTML("beforeend", DOCK_MARKUP);
  return root.getElementById("player");
}
