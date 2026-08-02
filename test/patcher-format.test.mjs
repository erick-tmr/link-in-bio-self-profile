/* ===========================================================================
   Presentation helpers for the Mario Tennis save patcher.

   These are the parts a browser makes expensive to check: hex column padding,
   the placeholder for records that cannot be audited, the badSave alias, and
   filename derivation. Fed with real inspectSave() output so the row shapes
   are the ones the page will actually render.
   =========================================================================== */
import test from "node:test";
import assert from "node:assert/strict";

import {
  hex,
  auditRows,
  auditSummary,
  checksumLabel,
  stateView,
  machineView,
  errorKeys,
  patchKeys,
  outputFileName,
  interpolate,
  playerLabel
} from "../web/js/tools/mario-tennis/patcher-format.js";
import { inspectSave } from "../web/js/tools/mario-tennis/save-format.js";
import { buildLockedSave, buildUnlockedSave } from "./helpers/build-save.mjs";

const NO_VALUE = "-";

test("hex", async (t) => {
  await t.test("pads to the requested width and uppercases", () => {
    assert.equal(hex(0x60, 3), "0x060");
    assert.equal(hex(0x800, 4), "0x0800");
    assert.equal(hex(0x300, 3), "0x300");
    assert.equal(hex(0x1c9, 4), "0x01C9");
    assert.equal(hex(0, 4), "0x0000");
  });

  await t.test("does not truncate values wider than the pad", () => {
    assert.equal(hex(0xabcde, 4), "0xABCDE");
  });
});

test("auditRows", async (t) => {
  const locked = inspectSave(buildLockedSave());

  await t.test("emits primary rows before backup rows", () => {
    const halves = auditRows(locked).map((r) => r.half);
    assert.deepEqual([...new Set(halves)], ["PRI", "BAK"]);
    assert.equal(halves.lastIndexOf("PRI") < halves.indexOf("BAK"), true);
  });

  await t.test("formats every cell at its column width", () => {
    const row = auditRows(locked)[0];
    assert.deepEqual(row, {
      half: "PRI",
      rec: "0x060",
      addr: "0x0800",
      size: "0x300",
      stored: row.stored,
      computed: row.computed,
      flag: "ok"
    });
    assert.match(row.stored, /^0x[0-9A-F]{4}$/);
    assert.match(row.computed, /^0x[0-9A-F]{4}$/);
  });

  await t.test("renders unauditable records as a dash, not a failure", () => {
    // The locked fixture's 0x110 record is unused, so the lib reports ok: null.
    const unauditable = auditRows(locked).filter((r) => r.flag === "none");
    assert.ok(unauditable.length > 0, "expected at least one unauditable record");
    for (const row of unauditable) assert.equal(row.computed, NO_VALUE);
  });

  await t.test("flags a record whose stored checksum no longer matches", () => {
    const corrupt = buildLockedSave();
    corrupt[0x9a0] = 0x99; // inside the profile block the 0x60 record covers
    const rows = auditRows(inspectSave(corrupt));
    assert.equal(rows.find((r) => r.half === "PRI" && r.rec === "0x060").flag, "bad");
    assert.equal(rows.find((r) => r.half === "BAK" && r.rec === "0x060").flag, "ok");
  });

  await t.test("returns nothing for a missing or invalid report", () => {
    assert.deepEqual(auditRows(null), []);
    assert.deepEqual(auditRows({ state: "invalid" }), []);
  });
});

test("auditSummary", async (t) => {
  await t.test("counts only the records that carry a verdict", () => {
    const rows = auditRows(inspectSave(buildLockedSave()));
    assert.deepEqual(auditSummary(rows), { total: 6, audited: 4, bad: 0 });
    assert.ok(
      auditSummary(rows).audited < rows.length,
      "the two unused transfer records have no verdict"
    );
  });

  await t.test("an unlocked save legitimately shows one mismatch in the backup half", () => {
    // Not a defect and not something this tool introduces: the unlock writes
    // the 0x200 transfer block into the primary half only, which is what the
    // game (and a real Transfer Pak session) does. The backup half still gets
    // the record marked used with the canonical 0x01C9 checksum, so its stored
    // sum describes data that only exists in the primary half. Every genuinely
    // unlocked cartridge audits exactly this way, so the panel says so.
    const rows = auditRows(inspectSave(buildUnlockedSave()));
    assert.deepEqual(auditSummary(rows), { total: 6, audited: 6, bad: 1 });

    const mismatch = rows.find((r) => r.flag === "bad");
    assert.equal(mismatch.half, "BAK");
    assert.equal(mismatch.rec, "0x110");
    assert.equal(mismatch.stored, "0x01C9");
    assert.equal(mismatch.computed, "0x0000");
  });
});

test("checksumLabel", async (t) => {
  await t.test("reports all-clear in green", () => {
    assert.deepEqual(checksumLabel({ total: 6, audited: 4, bad: 0 }), {
      key: "mtChkAllOk",
      vars: {},
      tone: "green"
    });
  });

  await t.test("reports the failure count in red", () => {
    assert.deepEqual(checksumLabel({ total: 6, audited: 4, bad: 2 }), {
      key: "mtChkBad",
      vars: { n: 2 },
      tone: "red"
    });
  });

  await t.test("falls back to a dash when nothing could be audited", () => {
    const label = checksumLabel({ total: 2, audited: 0, bad: 0 });
    assert.equal(label.key, null);
    assert.equal(label.text, NO_VALUE);
    assert.equal(label.tone, "muted");
  });
});

test("stateView maps each state to its label, note and tone", () => {
  assert.deepEqual(stateView("locked"), {
    labelKey: "mtStateLocked",
    noteKey: "mtNoteLocked",
    tone: "red"
  });
  assert.deepEqual(stateView("unlocked"), {
    labelKey: "mtStateUnlocked",
    noteKey: "mtNoteUnlocked",
    tone: "green"
  });
  assert.deepEqual(stateView("partial"), {
    labelKey: "mtStatePartial",
    noteKey: "mtNotePartial",
    tone: "lime"
  });
});

test("machineView maps each phase to a LED tone and status word", () => {
  assert.deepEqual(machineView("idle"), { tone: "idle", statusKey: "mtStatusIdle" });
  assert.deepEqual(machineView("loaded"), { tone: "loaded", statusKey: "mtStatusLoaded" });
  assert.deepEqual(machineView("patched"), { tone: "patched", statusKey: "mtStatusPatched" });
  assert.deepEqual(machineView("error"), { tone: "error", statusKey: "mtStatusError" });
  assert.deepEqual(machineView("nonsense"), { tone: "idle", statusKey: "mtStatusIdle" });
});

test("errorKeys", async (t) => {
  await t.test("covers every code the patcher can produce", () => {
    const codes = ["badSize", "badMagic", "badDirectory", "read", "transferDirty", "lib", "unknown"];
    for (const code of codes) {
      const keys = errorKeys(code);
      assert.ok(keys.titleKey.startsWith("mtErr"), `${code} -> ${keys.titleKey}`);
      assert.equal(keys.bodyKey, keys.titleKey + "Msg");
    }
  });

  await t.test("aliases badSave onto the corrupted-structure message", () => {
    assert.deepEqual(errorKeys("badSave"), errorKeys("badDirectory"));
  });

  await t.test("falls back to the generic message for an unknown code", () => {
    assert.deepEqual(errorKeys("meteor-strike"), errorKeys("unknown"));
  });

  await t.test("returns null when there is no error", () => {
    assert.equal(errorKeys(null), null);
  });
});

test("patchKeys distinguishes unlock from restore", () => {
  assert.deepEqual(patchKeys("unlocked"), { titleKey: "mtOkUnlocked", bodyKey: "mtOkUnlockedMsg" });
  assert.deepEqual(patchKeys("restored"), { titleKey: "mtOkRestored", bodyKey: "mtOkRestoredMsg" });
});

test("outputFileName", async (t) => {
  await t.test("appends the outcome to the base name", () => {
    assert.equal(outputFileName("save.sav", "unlocked"), "save-unlocked.sav");
    assert.equal(outputFileName("save.sav", "restored"), "save-restored.sav");
  });

  await t.test("strips only a trailing .sav, case-insensitively", () => {
    assert.equal(outputFileName("MY.SAVE.sav", "unlocked"), "MY.SAVE-unlocked.sav");
    assert.equal(outputFileName("POKE.SAV", "unlocked"), "POKE-unlocked.sav");
    assert.equal(outputFileName("save.sav.bak", "unlocked"), "save.sav.bak-unlocked.sav");
  });

  await t.test("handles a name with no extension", () => {
    assert.equal(outputFileName("noext", "unlocked"), "noext-unlocked.sav");
  });

  await t.test("falls back when the name is empty or missing", () => {
    assert.equal(outputFileName("", "unlocked"), "mario-tennis-unlocked.sav");
    assert.equal(outputFileName(null, "restored"), "mario-tennis-restored.sav");
    assert.equal(outputFileName(".sav", "unlocked"), "mario-tennis-unlocked.sav");
  });
});

test("interpolate", async (t) => {
  await t.test("substitutes named placeholders", () => {
    assert.equal(interpolate("{n} BAD", { n: 3 }), "3 BAD");
    assert.equal(interpolate("{audited} / {total}", { audited: 4, total: 6 }), "4 / 6");
  });

  await t.test("leaves unknown placeholders alone rather than blanking them", () => {
    assert.equal(interpolate("{n} of {total}", { n: 1 }), "1 of {total}");
  });

  await t.test("tolerates a missing template", () => {
    assert.equal(interpolate(undefined, {}), "");
  });
});

test("playerLabel", async (t) => {
  await t.test("joins the profile names", () => {
    assert.equal(playerLabel(inspectSave(buildLockedSave())), "ERICK · TESTER");
  });

  await t.test("drops empty slots", () => {
    assert.equal(playerLabel(inspectSave(buildLockedSave({ names: ["SOLO", ""] }))), "SOLO");
  });

  await t.test("falls back to a dash with no names at all", () => {
    assert.equal(playerLabel(inspectSave(buildLockedSave({ names: ["", ""] }))), NO_VALUE);
    assert.equal(playerLabel(null), NO_VALUE);
  });
});
