/* ===========================================================================
   SavePatcher — the tool's behaviour spec, minus rendering.

   Everything the page can do to a save is exercised here: the happy path, all
   the ways a file gets rejected, the unlock/restore round trip, and the lazy
   import failing. The DOM adapter on top of this only moves strings around.
   =========================================================================== */
import test from "node:test";
import assert from "node:assert/strict";

import { SavePatcher } from "../web/js/tools/mario-tennis/save-patcher.js";
import * as saveFormat from "../web/js/tools/mario-tennis/save-format.js";
import {
  buildLockedSave,
  buildUnlockedSave,
  buildPartialSave,
  truncate,
  smashMagic,
  smashDirectory,
  dirtyTransfer
} from "./helpers/build-save.mjs";

/** A patcher wired to the real lib without going through dynamic import. */
const patcher = () => new SavePatcher({ loadLib: async () => saveFormat });

test("starts idle", () => {
  const p = patcher();
  assert.equal(p.phase, "idle");
  assert.equal(p.loaded, false);
  assert.equal(p.canUnlock, false);
  assert.equal(p.canRemove, false);
  assert.equal(p.bytes, null);
});

test("loading a valid save", async (t) => {
  await t.test("reports the file and its inspection", async () => {
    const p = patcher();
    await p.loadBytes("mine.sav", buildLockedSave());

    assert.equal(p.phase, "loaded");
    assert.equal(p.fileName, "mine.sav");
    assert.equal(p.error, null);
    assert.equal(p.report.state, "locked");
    assert.equal(p.report.saveCounter, 0x3137);
    assert.deepEqual(p.report.playerNames, ["ERICK", "TESTER"]);
  });

  await t.test("notifies subscribers", async () => {
    const p = patcher();
    let calls = 0;
    p.onChange(() => calls++);
    await p.loadBytes("mine.sav", buildLockedSave());
    assert.equal(calls, 1);
  });

  await t.test("unsubscribing stops the notifications", async () => {
    const p = patcher();
    let calls = 0;
    const off = p.onChange(() => calls++);
    off();
    await p.loadBytes("mine.sav", buildLockedSave());
    assert.equal(calls, 0);
  });
});

test("rejecting a bad file", async (t) => {
  const cases = [
    ["a truncated dump", () => truncate(buildLockedSave()), "badSize"],
    ["a broken primary header", () => smashMagic(buildLockedSave(), 0), "badMagic"],
    ["a broken backup header", () => smashMagic(buildLockedSave(), 1), "badMagic"],
    ["a corrupted directory", () => smashDirectory(buildLockedSave()), "badDirectory"]
  ];

  for (const [label, make, code] of cases) {
    await t.test(`${label} -> ${code}`, async () => {
      const p = patcher();
      await p.loadBytes("broken.sav", make());
      assert.equal(p.phase, "error");
      assert.equal(p.error, code);
      assert.equal(p.fileName, "broken.sav", "filename stays visible next to the error");
      assert.equal(p.bytes, null);
      assert.equal(p.report, null);
    });
  }

  await t.test("a failed read reports 'read'", () => {
    const p = patcher();
    p.failRead("unreadable.sav");
    assert.equal(p.error, "read");
    assert.equal(p.fileName, "unreadable.sav");
  });

  await t.test("a rejected file clears a previously loaded one", async () => {
    const p = patcher();
    await p.loadBytes("good.sav", buildLockedSave());
    await p.loadBytes("bad.sav", truncate(buildLockedSave()));
    assert.equal(p.phase, "error");
    assert.equal(p.bytes, null);
    assert.equal(p.report, null);
  });
});

test("unlock", async (t) => {
  await t.test("writes the markers and re-inspects", async () => {
    const p = patcher();
    await p.loadBytes("mine.sav", buildLockedSave());
    await p.unlock();

    assert.equal(p.phase, "patched");
    assert.equal(p.patched, "unlocked");
    assert.equal(p.error, null);
    assert.equal(p.report.state, "unlocked");
  });

  await t.test("output matches a hand-built unlocked save byte for byte", async () => {
    const p = patcher();
    await p.loadBytes("mine.sav", buildLockedSave());
    await p.unlock();
    assert.deepEqual(p.bytes, buildUnlockedSave());
  });

  await t.test("leaves the save counter and profiles alone", async () => {
    const before = buildLockedSave();
    const p = patcher();
    await p.loadBytes("mine.sav", before);
    await p.unlock();

    assert.equal(p.report.saveCounter, 0x3137);
    assert.deepEqual(p.report.playerNames, ["ERICK", "TESTER"]);
    assert.deepEqual(p.bytes.slice(0x800, 0xb00), before.slice(0x800, 0xb00));
  });

  await t.test("refuses when the transfer area already holds data", async () => {
    const p = patcher();
    await p.loadBytes("mine.sav", dirtyTransfer(buildLockedSave()));
    await p.unlock();

    assert.equal(p.error, "transferDirty");
    assert.equal(p.patched, null);
    assert.ok(p.bytes, "the loaded file is kept so the user can still inspect it");
  });

  await t.test("repairs a half-applied save", async () => {
    const p = patcher();
    await p.loadBytes("mine.sav", buildPartialSave());
    assert.equal(p.report.state, "partial");
    await p.unlock();
    assert.equal(p.report.state, "unlocked");
  });
});

test("restore", async (t) => {
  await t.test("round-trips back to the original bytes", async () => {
    const original = buildLockedSave();
    const p = patcher();
    await p.loadBytes("mine.sav", original);
    await p.unlock();
    await p.restore();

    assert.equal(p.patched, "restored");
    assert.equal(p.report.state, "locked");
    assert.deepEqual(p.bytes, original);
  });

  await t.test("repairs a half-applied save", async () => {
    const p = patcher();
    await p.loadBytes("mine.sav", buildPartialSave());
    await p.restore();
    assert.equal(p.report.state, "locked");
    assert.deepEqual(p.bytes, buildLockedSave());
  });
});

test("available actions track the save's state", async (t) => {
  await t.test("a locked save can only be unlocked", async () => {
    const p = patcher();
    await p.loadBytes("mine.sav", buildLockedSave());
    assert.equal(p.canUnlock, true);
    assert.equal(p.canRemove, false);
  });

  await t.test("an unlocked save can only be restored", async () => {
    const p = patcher();
    await p.loadBytes("mine.sav", buildUnlockedSave());
    assert.equal(p.canUnlock, false);
    assert.equal(p.canRemove, true);
  });

  await t.test("a partial save accepts either action", async () => {
    const p = patcher();
    await p.loadBytes("mine.sav", buildPartialSave());
    assert.equal(p.canUnlock, true);
    assert.equal(p.canRemove, true);
  });

  await t.test("nothing is available with no file", () => {
    const p = patcher();
    assert.equal(p.canUnlock, false);
    assert.equal(p.canRemove, false);
  });
});

test("reset clears everything back to idle", async () => {
  const p = patcher();
  await p.loadBytes("mine.sav", buildLockedSave());
  await p.unlock();
  p.reset();

  assert.equal(p.phase, "idle");
  assert.equal(p.fileName, null);
  assert.equal(p.bytes, null);
  assert.equal(p.report, null);
  assert.equal(p.error, null);
  assert.equal(p.patched, null);
});

test("when save-format.js cannot be loaded", async (t) => {
  const broken = () => new SavePatcher({ loadLib: async () => { throw new Error("network"); } });

  await t.test("loading a file reports 'lib' rather than throwing", async () => {
    const p = broken();
    await p.loadBytes("mine.sav", buildLockedSave());
    assert.equal(p.phase, "error");
    assert.equal(p.error, "lib");
  });

  await t.test("ready() resolves null instead of rejecting", async () => {
    assert.equal(await broken().ready(), null);
  });

  await t.test("a later attempt retries the import", async () => {
    let attempts = 0;
    const p = new SavePatcher({
      loadLib: async () => {
        attempts++;
        if (attempts === 1) throw new Error("network");
        return saveFormat;
      }
    });

    await p.loadBytes("mine.sav", buildLockedSave());
    assert.equal(p.error, "lib");

    await p.loadBytes("mine.sav", buildLockedSave());
    assert.equal(attempts, 2);
    assert.equal(p.phase, "loaded");
  });

  await t.test("the module is imported once across many calls", async () => {
    let attempts = 0;
    const p = new SavePatcher({
      loadLib: async () => {
        attempts++;
        return saveFormat;
      }
    });
    await p.loadBytes("mine.sav", buildLockedSave());
    await p.unlock();
    await p.restore();
    assert.equal(attempts, 1);
  });
});

test("an unexpected failure surfaces as 'unknown' and keeps the file", async () => {
  const p = new SavePatcher({
    loadLib: async () => ({
      ...saveFormat,
      applyUnlock() {
        throw new TypeError("something nobody predicted");
      }
    })
  });
  await p.loadBytes("mine.sav", buildLockedSave());
  const before = p.bytes;
  await p.unlock();

  assert.equal(p.error, "unknown");
  assert.equal(p.patched, null);
  assert.equal(p.bytes, before, "the loaded bytes are left untouched");
});
