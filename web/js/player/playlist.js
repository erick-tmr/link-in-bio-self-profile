/* ===========================================================================
   Playlist — the track data and a cursor over it.

   Responsibility (SRP): hold the ordered tracks and answer "what's current /
   next / previous". It owns no audio and no DOM.

   Playback order is indirected through an `order` array of indices, so the
   cursor logic is identical whether we play the album straight through or
   shuffled: `current` is always `tracks[order[index]]`. When shuffle is on we
   lay `order` out with Fisher–Yates and re-shuffle each time the queue wraps
   past the end, so playback stays shuffled forever without ever stalling.
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
  { id: "01-opening-movie", title: "Opening Movie", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/01-opening-movie.mp3" },
  { id: "02-introductions", title: "Introductions", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/02-introductions.mp3" },
  { id: "03-littleroot-town", title: "Littleroot Town", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/03-littleroot-town.mp3" },
  { id: "04-birch-lab", title: "Birch Lab", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/04-birch-lab.mp3" },
  { id: "05-route-101", title: "Route 101", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/05-route-101.mp3" },
  { id: "06-oldale-town", title: "Oldale Town", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/06-oldale-town.mp3" },
  { id: "07-pokemon-centre", title: "Pokemon Centre", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/07-pokemon-centre.mp3" },
  { id: "08-pokemart", title: "Pokemart", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/08-pokemart.mp3" },
  { id: "09-petalburg-city", title: "Petalburg City", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/09-petalburg-city.mp3" },
  { id: "10-wallys-theme", title: "Wally's Theme", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/10-wallys-theme.mp3" },
  { id: "11-route-104", title: "Route 104", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/11-route-104.mp3" },
  { id: "12-may", title: "May", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/12-may.mp3" },
  { id: "13-petalburg-woods", title: "Petalburg Woods", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/13-petalburg-woods.mp3" },
  { id: "14-trainers-school", title: "Trainers School", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/14-trainers-school.mp3" },
  { id: "15-crossing-the-sea", title: "Crossing the Sea", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/15-crossing-the-sea.mp3" },
  { id: "16-dewford-town", title: "Dewford Town", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/16-dewford-town.mp3" },
  { id: "17-verdanturf-town", title: "Verdanturf Town", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/17-verdanturf-town.mp3" },
  { id: "18-hurry-along", title: "Hurry Along", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/18-hurry-along.mp3" },
  { id: "19-oceanic-museum", title: "Oceanic Museum", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/19-oceanic-museum.mp3" },
  { id: "20-contest-lobby", title: "Contest Lobby", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/20-contest-lobby.mp3" },
  { id: "21-route-110", title: "Route 110", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/21-route-110.mp3" },
  { id: "22-trick-house", title: "Trick House", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/22-trick-house.mp3" },
  { id: "23-cycling", title: "Cycling", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/23-cycling.mp3" },
  { id: "24-rustboro-city", title: "Rustboro City", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/24-rustboro-city.mp3" },
  { id: "25-route-111", title: "Route 111", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/25-route-111.mp3" },
  { id: "26-surf", title: "Surf", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/26-surf.mp3" },
  { id: "27-pokemon-link", title: "Pokemon Link", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/27-pokemon-link.mp3" },
  { id: "28-super-secret-bases", title: "Super Secret Bases", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/28-super-secret-bases.mp3" },
  { id: "29-fallarbor-town", title: "Fallarbor Town", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/29-fallarbor-town.mp3" },
  { id: "30-museum", title: "Museum", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/30-museum.mp3" },
  { id: "31-mt-chimney", title: "Mt Chimney", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/31-mt-chimney.mp3" },
  { id: "32-route-119", title: "Route 119", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/32-route-119.mp3" },
  { id: "33-lilycove-city", title: "Lilycove City", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/33-lilycove-city.mp3" },
  { id: "34-mt-pyre", title: "Mt Pyre", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/34-mt-pyre.mp3" },
  { id: "35-dive", title: "Dive", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/35-dive.mp3" },
  { id: "36-fortree-city", title: "Fortree City", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/36-fortree-city.mp3" },
  { id: "37-route-120", title: "Route 120", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/37-route-120.mp3" },
  { id: "38-surf-again", title: "Surf (again)", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/38-surf-again.mp3" },
  { id: "39-slateport-city", title: "Slateport City", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/39-slateport-city.mp3" },
  { id: "40-cave-of-origin", title: "Cave of Origin", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/40-cave-of-origin.mp3" },
  { id: "41-sootopolis-city", title: "Sootopolis City", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/41-sootopolis-city.mp3" },
  { id: "42-dive-again", title: "Dive (again)", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/42-dive-again.mp3" },
  { id: "43-ever-grande-city", title: "Ever Grande City", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/43-ever-grande-city.mp3" },
  { id: "44-hall-of-fame", title: "Hall of Fame", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/44-hall-of-fame.mp3" },
  { id: "45-lets-go-home", title: "Let's Go Home", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/45-lets-go-home.mp3" },
  { id: "46-ending-theme", title: "Ending Theme", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/46-ending-theme.mp3" },
  { id: "47-southern-island", title: "Southern Island", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/47-southern-island.mp3" },
  { id: "48-a-path-we-all-must-walk", title: "A Path We All Must Walk", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/48-a-path-we-all-must-walk.mp3" },
  { id: "49-soaring-illusions", title: "Soaring Illusions", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/49-soaring-illusions.mp3" },
  { id: "50-soaring-dreams", title: "Soaring Dreams", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/50-soaring-dreams.mp3" },
  { id: "51-the-heirs-to-eternity", title: "The Heirs to Eternity", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/51-the-heirs-to-eternity.mp3" },
  { id: "52-sky-pillar", title: "Sky Pillar", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/52-sky-pillar.mp3" },
  { id: "53-azoth", title: "Azoth", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/53-azoth.mp3" },
  { id: "54-the-lament-of-falling-stars", title: "The Lament of Falling Stars", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/54-the-lament-of-falling-stars.mp3" },
  { id: "55-strains-of-a-new-beginning", title: "Strains of a New Beginning", artist: "Hoenn Journey OST", src: "https://cdn.ericktakeshi.com.br/assets/hoenn/55-strains-of-a-new-beginning.mp3" }
];

/** Fisher–Yates: return a freshly shuffled [0..n-1] (pure; no Math.random bias). */
function shuffledIndices(n) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export class Playlist {
  /**
   * @param {Track[]} tracks
   * @param {{ shuffle?: boolean }} [options]
   */
  constructor(tracks, { shuffle = false } = {}) {
    if (!tracks || tracks.length === 0) throw new Error("Playlist requires at least one track");
    this.tracks = tracks;
    this.shuffle = shuffle;
    this.index = 0; // cursor into `order`
    this.order = shuffle
      ? shuffledIndices(tracks.length)
      : Array.from({ length: tracks.length }, (_, i) => i);
  }

  /** @returns {Track} */
  get current() {
    return this.tracks[this.order[this.index]];
  }

  get length() {
    return this.tracks.length;
  }

  /** Advance to the next track (wraps around; re-shuffles on wrap). @returns {Track} */
  next() {
    if (this.index + 1 < this.tracks.length) {
      this.index += 1;
    } else {
      if (this.shuffle) this._reshuffle();
      this.index = 0;
    }
    return this.current;
  }

  /** Go to the previous track (wraps around). @returns {Track} */
  prev() {
    this.index = (this.index - 1 + this.tracks.length) % this.tracks.length;
    return this.current;
  }

  /** Re-lay the shuffled order, keeping the just-played track off the new top. */
  _reshuffle() {
    const last = this.order[this.index];
    this.order = shuffledIndices(this.tracks.length);
    if (this.tracks.length > 1 && this.order[0] === last) {
      [this.order[0], this.order[1]] = [this.order[1], this.order[0]];
    }
  }
}
