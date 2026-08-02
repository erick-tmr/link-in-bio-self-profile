/* ===========================================================================
   Tests for web/js/tools/mario-tennis/save-format.js.

   Synthetic fixtures come from ./helpers/build-save.mjs (hand-encoded spec).
   Set MT_FIXTURES_DIR to a directory holding real cartridge dumps to also run
   the real-hardware assertions locally; those files are never committed.
   =========================================================================== */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  SAVE_SIZE, HALF, OFFSETS, TRANSFER_SUM,
  sum16, canonicalTransferBlock, validateSave, detectUnlockState,
  readRecords, inspectSave, applyUnlock, removeUnlock, PatchError
} from "../web/js/tools/mario-tennis/save-format.js";

import {
  TYPE02_SENTINEL, buildLockedSave, buildUnlockedSave, buildPartialSave,
  truncate, smashMagic, smashDirectory, dirtyTransfer
} from "./helpers/build-save.mjs";

const bytesEqual = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

describe("sum16", () => {
  it("sums bytes mod 0x10000", () => {
    assert.equal(sum16(new Uint8Array([1, 2, 3]), 0, 3), 6);
    assert.equal(sum16(new Uint8Array([0xff, 0xff]), 0, 2), 0x1fe);
    const wrap = new Uint8Array(0x300).fill(0xff);
    assert.equal(sum16(wrap, 0, 0x300), (0x300 * 0xff) & 0xffff);
  });

  it("canonical transfer block sums to the stored checksum", () => {
    const block = canonicalTransferBlock();
    assert.equal(block.length, 0x200);
    assert.equal(sum16(block, 0, block.length), TRANSFER_SUM);
  });
});

describe("validateSave", () => {
  it("accepts locked and unlocked fixtures", () => {
    assert.deepEqual(validateSave(buildLockedSave()), { ok: true });
    assert.deepEqual(validateSave(buildUnlockedSave()), { ok: true });
  });

  it("rejects wrong sizes", () => {
    assert.equal(validateSave(truncate(buildLockedSave())).code, "badSize");
    assert.equal(validateSave(new Uint8Array(SAVE_SIZE * 2)).code, "badSize");
    assert.equal(validateSave(new Uint8Array(0)).code, "badSize");
  });

  it("rejects a smashed magic in either half", () => {
    assert.equal(validateSave(smashMagic(buildLockedSave(), 0)).code, "badMagic");
    assert.equal(validateSave(smashMagic(buildLockedSave(), 1)).code, "badMagic");
  });

  it("rejects a corrupted directory", () => {
    assert.equal(validateSave(smashDirectory(buildLockedSave())).code, "badDirectory");
  });
});

describe("detectUnlockState", () => {
  it("classifies the four states", () => {
    assert.equal(detectUnlockState(buildLockedSave()), "locked");
    assert.equal(detectUnlockState(buildUnlockedSave()), "unlocked");
    assert.equal(detectUnlockState(buildPartialSave()), "partial");
    assert.equal(detectUnlockState(new Uint8Array(SAVE_SIZE)), "invalid");
  });

  it("treats stray transfer-area data as partial", () => {
    assert.equal(detectUnlockState(dirtyTransfer(buildLockedSave())), "partial");
  });
});

describe("applyUnlock", () => {
  it("produces exactly the hand-built unlocked save", () => {
    assert.ok(bytesEqual(applyUnlock(buildLockedSave()), buildUnlockedSave()));
  });

  it("does not mutate its input", () => {
    const input = buildLockedSave();
    const before = new Uint8Array(input);
    applyUnlock(input);
    assert.ok(bytesEqual(input, before));
  });

  it("is idempotent", () => {
    const once = applyUnlock(buildLockedSave());
    assert.ok(bytesEqual(applyUnlock(once), once));
  });

  it("leaves counters, profiles and type-02 records untouched", () => {
    const out = applyUnlock(buildLockedSave({ counter: 0xbeef }));
    for (const base of [0x0000, HALF]) {
      assert.equal(out[base + OFFSETS.counter] | (out[base + OFFSETS.counter + 1] << 8), 0xbeef);
      TYPE02_SENTINEL.forEach((value, i) => assert.equal(out[base + 0x3c0 + i], value));
    }
    const locked = buildLockedSave({ counter: 0xbeef });
    for (let i = 0x800; i < 0xb00; i++) assert.equal(out[i], locked[i]);
  });

  it("refuses dirty transfer areas and invalid saves", () => {
    assert.throws(() => applyUnlock(dirtyTransfer(buildLockedSave())), new PatchError("transferDirty"));
    assert.throws(() => applyUnlock(new Uint8Array(SAVE_SIZE)), new PatchError("badSave"));
  });
});

describe("removeUnlock", () => {
  it("returns an unlocked save to locked", () => {
    assert.equal(detectUnlockState(removeUnlock(buildUnlockedSave())), "locked");
  });

  it("round-trips to byte identity", () => {
    const original = buildLockedSave();
    assert.ok(bytesEqual(removeUnlock(applyUnlock(original)), original));
  });

  it("repairs partial saves", () => {
    assert.equal(detectUnlockState(removeUnlock(buildPartialSave())), "locked");
    assert.equal(detectUnlockState(removeUnlock(dirtyTransfer(buildLockedSave()))), "locked");
  });

  it("rejects invalid saves", () => {
    assert.throws(() => removeUnlock(truncate(buildLockedSave())), new PatchError("badSave"));
  });
});

describe("inspectSave", () => {
  it("reads names, slot flag and counter", () => {
    const report = inspectSave(buildLockedSave({ names: ["MARIO", "PEACH"], counter: 42 }));
    assert.equal(report.state, "locked");
    assert.equal(report.saveCounter, 42);
    assert.equal(report.profileSlotUsed, true);
    assert.deepEqual(report.playerNames, ["MARIO", "PEACH"]);
  });

  it("audits used records and flags corruption", () => {
    const clean = inspectSave(buildLockedSave());
    const used = clean.records.primary.filter((record) => record.used);
    assert.ok(used.length >= 2);
    assert.ok(used.every((record) => record.ok === true));

    const corrupt = buildLockedSave();
    corrupt[0x9a0] = 0x99;
    const flagged = inspectSave(corrupt).records.primary.find((record) => record.offset === 0x60);
    assert.equal(flagged.ok, false);
  });

  it("audits the N64 record on an unlocked save", () => {
    const record = inspectSave(buildUnlockedSave()).records.primary
      .find((entry) => entry.offset === OFFSETS.n64Record);
    assert.equal(record.used, true);
    assert.equal(record.storedSum, TRANSFER_SUM);
    assert.equal(record.ok, true);
  });

  it("returns only the state for invalid input", () => {
    assert.deepEqual(inspectSave(new Uint8Array(3)), { state: "invalid" });
  });
});

describe("readRecords", () => {
  it("skips empty slots and reports fields", () => {
    const records = readRecords(buildLockedSave(), 0);
    const profile = records.find((record) => record.offset === 0x60);
    assert.deepEqual(
      { used: profile.used, table: profile.table, addr: profile.addr, size: profile.size },
      { used: true, table: 0, addr: 0x0800, size: 0x0300 }
    );
    assert.ok(!records.some((record) => !record.used && record.addr === 0 && record.size === 0));
  });
});

/* Real cartridge dumps.

   Only files dumped straight off a cartridge belong here. An earlier version
   of this suite also compared applyUnlock(original) against a saved copy of
   applyUnlock(original) and called the result "hardware-validated" — it was
   comparing the lib against itself and could never fail. Saves downloaded from
   the internet do not count either: the one we used as a reference turned out
   to be someone else's patched save, and it carried the very asymmetry this
   suite now rejects. */
const fixturesDir = process.env.MT_FIXTURES_DIR;
const realFiles = fixturesDir && {
  // dumped before touching anything
  locked: join(fixturesDir, "Mario Tennis (USA)_2026-08-01_19-27-36.sav"),
  // dumped after using the game's own "erase N64 data" option
  postErase: join(fixturesDir, "Mario Tennis (USA)_2026-08-01_19-47-38.sav")
};
const haveReal = realFiles && Object.values(realFiles).every((path) => existsSync(path));

describe("real cartridge dumps", { skip: !haveReal && "set MT_FIXTURES_DIR to run" }, () => {
  const load = (path) => new Uint8Array(readFileSync(path));

  it("reads a real locked cartridge", () => {
    const locked = load(realFiles.locked);
    assert.equal(validateSave(locked).ok, true);
    assert.equal(detectUnlockState(locked), "locked");
  });

  it("round-trips a real save byte for byte", () => {
    const locked = load(realFiles.locked);
    assert.ok(bytesEqual(removeUnlock(applyUnlock(locked)), locked));
  });

  it("leaves both halves of a real save passing their own checksums", () => {
    // The reason the transfer block is written to both halves. Before that,
    // patching this very dump produced a save whose backup record stored
    // 0x01C9 over an empty area, and the tool flagged its own output as bad.
    const unlocked = applyUnlock(load(realFiles.locked));
    for (const base of [0x0000, HALF]) {
      const record = readRecords(unlocked, base).find((r) => r.offset === OFFSETS.n64Record);
      assert.equal(record.storedSum, TRANSFER_SUM);
      assert.equal(record.computedSum, TRANSFER_SUM);
      assert.equal(record.ok, true);
    }
  });

  it("recognises the state the game leaves after erasing N64 data", () => {
    // The game keeps the character markers but clears the block and zeroes the
    // checksum in both halves — which is why a half must never store a
    // checksum for data it does not hold.
    const postErase = load(realFiles.postErase);
    assert.equal(detectUnlockState(postErase), "partial");
    for (const base of [0x0000, HALF]) {
      const record = readRecords(postErase, base).find((r) => r.offset === OFFSETS.n64Record);
      assert.equal(record.storedSum, 0, "the game zeroes the checksum it can no longer back");
      assert.equal(record.computedSum, 0);
    }
    assert.equal(detectUnlockState(removeUnlock(postErase)), "locked");
  });
});
