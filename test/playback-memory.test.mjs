/* ===========================================================================
   Carrying playback across a page navigation.

   The interesting cases are all failure cases: a stale snapshot from before
   the track list changed, a corrupt entry, storage that throws. Getting any of
   them wrong means the wrong song, or a thrown error on page load, so they are
   asserted here rather than clicked through.
   =========================================================================== */
import test from "node:test";
import assert from "node:assert/strict";

import { Playlist } from "../web/js/player/playlist.js";
import { PlaybackMemory } from "../web/js/player/playback-memory.js";
import { AudioEngine } from "../web/js/player/audio-engine.js";

const TRACKS = [
  { id: "a", title: "A", artist: "x", src: "a.mp3" },
  { id: "b", title: "B", artist: "x", src: "b.mp3" },
  { id: "c", title: "C", artist: "x", src: "c.mp3" },
  { id: "d", title: "D", artist: "x", src: "d.mp3" }
];

/** An in-memory stand-in for sessionStorage. */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    get size() {
      return map.size;
    }
  };
}

/** An <audio> stand-in with the src getter's absolute-URL behaviour. */
function fakeAudio(baseURI = "https://example.test/tools/") {
  return {
    baseURI,
    preload: "",
    volume: 1,
    _src: "",
    currentTime: 0,
    assignments: 0,
    get src() {
      return this._src;
    },
    set src(value) {
      this._src = new URL(value, baseURI).href; // what a real element reports back
      this.assignments++;
      this.currentTime = 0; // and what a real element does to the position
    },
    addEventListener() {},
    removeEventListener() {},
    play: () => Promise.resolve(),
    pause() {}
  };
}

/** A MusicPlayer stand-in recording what it was asked to resume. */
function fakePlayer({ currentTime = 0, isEnabled = true } = {}) {
  return {
    currentTime,
    isEnabled,
    resumed: null,
    listeners: new Set(),
    resumeFrom(seconds, playing) {
      this.resumed = { seconds, playing };
      return Promise.resolve(playing);
    },
    onChange(cb) {
      this.listeners.add(cb);
      return () => this.listeners.delete(cb);
    },
    emit() {
      this.listeners.forEach((cb) => cb(this));
    }
  };
}

/** A window stand-in that lets tests fire pagehide / visibilitychange. */
function fakeWindow(visibilityState = "visible") {
  const handlers = new Map();
  return {
    document: { visibilityState },
    addEventListener: (type, cb) => handlers.set(type, cb),
    removeEventListener: (type) => handlers.delete(type),
    fire: (type) => handlers.get(type)?.(),
    has: (type) => handlers.has(type)
  };
}

test("Playlist snapshot / restore", async (t) => {
  await t.test("round-trips the queue and the cursor", () => {
    const a = new Playlist(TRACKS, { shuffle: true });
    a.next();
    a.next();
    const snap = a.snapshot();

    const b = new Playlist(TRACKS, { shuffle: true });
    assert.equal(b.restore(snap), true);
    assert.deepEqual(b.order, a.order);
    assert.equal(b.index, a.index);
    assert.equal(b.current.id, a.current.id);
  });

  await t.test("the restored queue keeps playing in the same order", () => {
    const a = new Playlist(TRACKS, { shuffle: true });
    const b = new Playlist(TRACKS, { shuffle: true });
    b.restore(a.snapshot());
    assert.equal(b.next().id, a.next().id);
    assert.equal(b.next().id, a.next().id);
  });

  await t.test("rejects a snapshot from a different-sized track list", () => {
    const snap = new Playlist(TRACKS.slice(0, 3), { shuffle: true }).snapshot();
    const fresh = new Playlist(TRACKS, { shuffle: true });
    const before = [...fresh.order];
    assert.equal(fresh.restore(snap), false);
    assert.deepEqual(fresh.order, before, "the fresh shuffle must survive");
  });

  await t.test("rejects a snapshot whose track id no longer matches", () => {
    const p = new Playlist(TRACKS, { shuffle: true });
    const snap = p.snapshot();
    snap.id = "renamed-since";
    assert.equal(new Playlist(TRACKS, { shuffle: true }).restore(snap), false);
  });

  await t.test("rejects an order that is not a permutation", () => {
    const p = new Playlist(TRACKS);
    assert.equal(p.restore({ order: [0, 0, 1, 2], index: 0, id: "a" }), false);
    assert.equal(p.restore({ order: [0, 1, 2, 9], index: 0, id: "a" }), false);
  });

  await t.test("rejects an out-of-range or non-integer cursor", () => {
    const p = new Playlist(TRACKS);
    for (const index of [-1, 4, 1.5, "0", null, undefined]) {
      assert.equal(p.restore({ order: [0, 1, 2, 3], index, id: "a" }), false, `index ${index}`);
    }
  });

  await t.test("rejects junk", () => {
    const p = new Playlist(TRACKS);
    for (const snap of [null, undefined, {}, { order: "nope" }, []]) {
      assert.equal(p.restore(snap), false);
    }
  });
});

test("PlaybackMemory", async (t) => {
  await t.test("saves the queue, the position and the play state", () => {
    const playlist = new Playlist(TRACKS, { shuffle: true });
    const player = fakePlayer({ currentTime: 42.7, isEnabled: true });
    const storage = fakeStorage();

    new PlaybackMemory({ player, playlist, storage }).save();

    const saved = JSON.parse(storage.getItem("et.playback"));
    assert.equal(saved.position, 42, "seconds are floored, not rounded up past the track");
    assert.equal(saved.playing, true);
    assert.deepEqual(saved.queue, playlist.snapshot());
  });

  await t.test("restores onto a fresh page", () => {
    const source = new Playlist(TRACKS, { shuffle: true });
    source.next();
    const storage = fakeStorage({
      "et.playback": JSON.stringify({ queue: source.snapshot(), position: 91, playing: true })
    });

    const playlist = new Playlist(TRACKS, { shuffle: true });
    const player = fakePlayer();
    assert.equal(new PlaybackMemory({ player, playlist, storage }).restore(), true);

    assert.equal(playlist.current.id, source.current.id);
    assert.deepEqual(player.resumed, { seconds: 91, playing: true });
  });

  await t.test("restores a paused session without starting playback", () => {
    const source = new Playlist(TRACKS, { shuffle: true });
    const storage = fakeStorage({
      "et.playback": JSON.stringify({ queue: source.snapshot(), position: 12, playing: false })
    });
    const player = fakePlayer();
    new PlaybackMemory({ player, playlist: new Playlist(TRACKS, { shuffle: true }), storage }).restore();
    assert.deepEqual(player.resumed, { seconds: 12, playing: false });
  });

  await t.test("does nothing on a first visit", () => {
    const player = fakePlayer();
    const memory = new PlaybackMemory({ player, playlist: new Playlist(TRACKS), storage: fakeStorage() });
    assert.equal(memory.restore(), false);
    assert.equal(player.resumed, null);
  });

  await t.test("ignores a corrupt entry rather than throwing", () => {
    const player = fakePlayer();
    const storage = fakeStorage({ "et.playback": "{not json" });
    const memory = new PlaybackMemory({ player, playlist: new Playlist(TRACKS), storage });
    assert.equal(memory.restore(), false);
    assert.equal(player.resumed, null);
  });

  await t.test("leaves the fresh shuffle alone when the snapshot is stale", () => {
    const stale = new Playlist(TRACKS.slice(0, 2), { shuffle: true }).snapshot();
    const storage = fakeStorage({
      "et.playback": JSON.stringify({ queue: stale, position: 30, playing: true })
    });
    const playlist = new Playlist(TRACKS, { shuffle: true });
    const before = [...playlist.order];
    const player = fakePlayer();

    assert.equal(new PlaybackMemory({ player, playlist, storage }).restore(), false);
    assert.deepEqual(playlist.order, before);
    assert.equal(player.resumed, null, "must not resume a position from another queue");
  });

  await t.test("survives storage being unavailable", () => {
    const throwing = {
      getItem() { throw new Error("denied"); },
      setItem() { throw new Error("denied"); },
      removeItem() { throw new Error("denied"); }
    };
    const memory = new PlaybackMemory({
      player: fakePlayer(),
      playlist: new Playlist(TRACKS),
      storage: throwing
    });
    assert.equal(memory.restore(), false);
    assert.doesNotThrow(() => memory.save());
    assert.doesNotThrow(() => memory.clear());
  });

  await t.test("a null storage is inert, not a crash", () => {
    const memory = new PlaybackMemory({
      player: fakePlayer(),
      playlist: new Playlist(TRACKS),
      storage: null
    });
    assert.equal(memory.restore(), false);
    assert.doesNotThrow(() => memory.save());
  });
});

test("AudioEngine.load does not rewind the track it is already playing", async (t) => {
  // Regression: the src getter reports an absolute URL, so comparing it
  // against a relative one never matched. Every load() looked like a track
  // change, reassigned src, and reset currentTime to 0 — which is what the
  // dock's first-gesture handler does on the very next keypress.
  await t.test("a relative source is recognised as unchanged", () => {
    const el = fakeAudio("https://example.test/tools/");
    const engine = new AudioEngine(el);

    engine.load("/assets/hoenn/track.mp3");
    el.currentTime = 75;
    const assignmentsAfterFirstLoad = el.assignments;

    engine.load("/assets/hoenn/track.mp3");

    assert.equal(el.assignments, assignmentsAfterFirstLoad, "must not reassign src");
    assert.equal(el.currentTime, 75, "the position must survive");
  });

  await t.test("an absolute source is recognised as unchanged", () => {
    const el = fakeAudio();
    const engine = new AudioEngine(el);
    engine.load("https://cdn.example.test/a.mp3");
    el.currentTime = 30;
    engine.load("https://cdn.example.test/a.mp3");
    assert.equal(el.currentTime, 30);
  });

  await t.test("a genuinely different source still loads", () => {
    const el = fakeAudio();
    const engine = new AudioEngine(el);
    engine.load("/assets/a.mp3");
    el.currentTime = 12;
    engine.load("/assets/b.mp3");
    assert.equal(el.currentTime, 0, "a real track change starts from the beginning");
    assert.equal(el.src, "https://example.test/assets/b.mp3");
  });
});

test("PlaybackMemory does not clobber the position before the media loads", async (t) => {
  // An element that has a source but has not loaded it reports currentTime 0.
  // Saving in that window would overwrite the resumed position with zero, and
  // the next page would start the track over.
  const withResume = (position) => {
    const source = new Playlist(TRACKS, { shuffle: true });
    const storage = fakeStorage({
      "et.playback": JSON.stringify({ queue: source.snapshot(), position, playing: true })
    });
    const playlist = new Playlist(TRACKS, { shuffle: true });
    const player = fakePlayer({ currentTime: 0 });
    const memory = new PlaybackMemory({ player, playlist, storage });
    memory.restore();
    return { memory, player, playlist, storage };
  };

  await t.test("keeps the resumed position while the player still reports zero", () => {
    const { memory, storage } = withResume(75);
    memory.save();
    assert.equal(JSON.parse(storage.getItem("et.playback")).position, 75);
  });

  await t.test("switches to the live position once the media reports one", () => {
    const { memory, player, storage } = withResume(75);
    player.currentTime = 80.9;
    memory.save();
    assert.equal(JSON.parse(storage.getItem("et.playback")).position, 80);
  });

  await t.test("a deliberate seek back to zero is honoured once the media is live", () => {
    const { memory, player, storage } = withResume(75);
    player.currentTime = 80;
    memory.save();
    player.currentTime = 0; // the visitor dragged the scrubber to the start
    memory.save();
    assert.equal(JSON.parse(storage.getItem("et.playback")).position, 0);
  });

  await t.test("skipping to another track drops the carried-over position", () => {
    const { memory, playlist, storage } = withResume(75);
    playlist.next();
    memory.save();
    const saved = JSON.parse(storage.getItem("et.playback"));
    assert.equal(saved.position, 0, "the new track must not inherit the old offset");
    assert.equal(saved.queue.id, playlist.current.id);
  });

  await t.test("a first visit still saves zero rather than inventing a position", () => {
    const playlist = new Playlist(TRACKS, { shuffle: true });
    const storage = fakeStorage();
    const memory = new PlaybackMemory({ player: fakePlayer({ currentTime: 0 }), playlist, storage });
    memory.restore();
    memory.save();
    assert.equal(JSON.parse(storage.getItem("et.playback")).position, 0);
  });
});

test("PlaybackMemory.watch", async (t) => {
  const setup = (visibility = "visible") => {
    const playlist = new Playlist(TRACKS, { shuffle: true });
    const player = fakePlayer({ currentTime: 7 });
    const storage = fakeStorage();
    const win = fakeWindow(visibility);
    const memory = new PlaybackMemory({ player, playlist, storage });
    const stop = memory.watch(win);
    return { player, storage, win, stop };
  };

  await t.test("saves when the page goes away", () => {
    const { storage, win } = setup();
    assert.equal(storage.size, 0);
    win.fire("pagehide");
    assert.equal(JSON.parse(storage.getItem("et.playback")).position, 7);
  });

  await t.test("saves when the track or play state changes", () => {
    const { player, storage } = setup();
    player.emit();
    assert.equal(storage.size, 1);
  });

  await t.test("saves when the tab is hidden, but not when it becomes visible", () => {
    const visible = setup("visible");
    visible.win.fire("visibilitychange");
    assert.equal(visible.storage.size, 0, "a tab coming back into view has nothing to record");

    const hidden = setup("hidden");
    hidden.win.fire("visibilitychange");
    assert.equal(hidden.storage.size, 1);
  });

  await t.test("stops recording when torn down", () => {
    const { player, storage, win, stop } = setup();
    stop();
    assert.equal(win.has("pagehide"), false);
    player.emit();
    assert.equal(storage.size, 0);
  });
});
