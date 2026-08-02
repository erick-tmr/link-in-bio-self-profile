/* ===========================================================================
   i18n key integrity across every page.

   Hand-porting ~90 keys in two languages is exactly where a typo hides: a
   mistyped data-i18n silently renders the English fallback forever, and a key
   present in one language only silently blanks the node in the other. Both are
   invisible in a quick browser pass, so they are asserted here instead.
   =========================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { DICT } from "../web/js/i18n/dictionary.js";
import { PATCHER_DICT } from "../web/js/tools/mario-tennis/patcher-copy.js";

const WEB = new URL("../web/", import.meta.url).pathname;

/** Every .html file under web/, the way build.mjs discovers them. */
async function pages(dir = WEB) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "assets") out.push(...(await pages(full)));
    } else if (entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

/** Keys the tool page can resolve: the site dictionary plus the tool's own. */
const merged = {
  en: { ...DICT.en, ...PATCHER_DICT.en },
  pt: { ...DICT.pt, ...PATCHER_DICT.pt }
};

test("every language defines the same keys", async (t) => {
  await t.test("site dictionary", () => {
    assert.deepEqual(Object.keys(DICT.en).sort(), Object.keys(DICT.pt).sort());
  });

  await t.test("save patcher dictionary", () => {
    assert.deepEqual(Object.keys(PATCHER_DICT.en).sort(), Object.keys(PATCHER_DICT.pt).sort());
  });

  await t.test("no tool key shadows a site key", () => {
    const clashes = Object.keys(PATCHER_DICT.en).filter((k) => k in DICT.en);
    assert.deepEqual(clashes, []);
  });

  await t.test("every tool key is namespaced", () => {
    const unprefixed = Object.keys(PATCHER_DICT.en).filter((k) => !k.startsWith("mt"));
    assert.deepEqual(unprefixed, []);
  });
});

test("every data-i18n key in the markup resolves", async (t) => {
  const files = await pages();
  assert.ok(files.length >= 3, "expected the home page, the tools hub and the patcher");

  for (const file of files) {
    const html = await readFile(file, "utf8");
    const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
    if (!keys.length) continue;

    await t.test(file.slice(WEB.length), () => {
      for (const key of keys) {
        for (const lang of ["en", "pt"]) {
          assert.ok(merged[lang][key], `${lang} is missing "${key}"`);
        }
      }
    });
  }
});

test("dynamic keys the UI resolves at runtime all exist", () => {
  // patcher-format.js returns these as bare strings, so nothing else would
  // catch a rename until the page rendered an empty span.
  const runtime = [
    "mtChkAllOk",
    "mtChkBad",
    "mtAuditCount",
    "mtStateLocked",
    "mtStateUnlocked",
    "mtStatePartial",
    "mtNoteLocked",
    "mtNoteUnlocked",
    "mtNotePartial",
    "mtStatusIdle",
    "mtStatusLoaded",
    "mtStatusPatched",
    "mtStatusError",
    "mtOkUnlocked",
    "mtOkUnlockedMsg",
    "mtOkRestored",
    "mtOkRestoredMsg",
    "mtHintIdle",
    "mtHintLocked",
    "mtHintUnlocked",
    "musicNowPlaying",
    "musicPaused"
  ];
  for (const key of runtime) {
    for (const lang of ["en", "pt"]) {
      assert.ok(merged[lang][key], `${lang} is missing runtime key "${key}"`);
    }
  }
});

test("every error code maps to a title and a body", async () => {
  const { errorKeys } = await import("../web/js/tools/mario-tennis/patcher-format.js");
  const codes = ["badSize", "badMagic", "badDirectory", "badSave", "read", "transferDirty", "lib", "unknown"];
  for (const code of codes) {
    const { titleKey, bodyKey } = errorKeys(code);
    for (const lang of ["en", "pt"]) {
      assert.ok(merged[lang][titleKey], `${lang} is missing "${titleKey}" (${code})`);
      assert.ok(merged[lang][bodyKey], `${lang} is missing "${bodyKey}" (${code})`);
    }
  }
});
