/* ===========================================================================
   Playlist — the track data and a cursor over it.

   Responsibility (SRP): hold the ordered tracks and answer "what's current /
   next / previous". It owns no audio and no DOM, so it is trivial to grow into
   a multi-track queue later — add entries to TRACKS and the skip wiring already
   works (next/prev wrap around).
   =========================================================================== */

/**
 * @typedef {object} Track
 * @property {string} id
 * @property {string} title
 * @property {string} artist
 * @property {string} src    fully-qualified audio URL (served from the CDN)
 */

/** @type {Track[]} */
export const TRACKS = [
  {
    id: "littleroot-town-lofi",
    title: "Littleroot Town (lo-fi)",
    artist: "Pokémon R/S/E",
    src: "https://www.ericktakeshi.com.br/assets/littleroot-town-lofi.mp3"
  }
];

export class Playlist {
  /** @param {Track[]} tracks */
  constructor(tracks) {
    if (!tracks || tracks.length === 0) throw new Error("Playlist requires at least one track");
    this.tracks = tracks;
    this.index = 0;
  }

  /** @returns {Track} */
  get current() {
    return this.tracks[this.index];
  }

  get length() {
    return this.tracks.length;
  }

  /** Advance to the next track (wraps around). @returns {Track} */
  next() {
    this.index = (this.index + 1) % this.tracks.length;
    return this.current;
  }

  /** Go to the previous track (wraps around). @returns {Track} */
  prev() {
    this.index = (this.index - 1 + this.tracks.length) % this.tracks.length;
    return this.current;
  }
}
