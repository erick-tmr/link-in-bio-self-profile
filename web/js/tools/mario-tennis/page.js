/* ===========================================================================
   Mario Tennis save patcher · entry point.

   Composition root for /tools/mario-tennis-save-patcher/: merges the tool's
   copy into the site dictionary, starts the shared chrome, and wires the
   patcher to its UI.

   applyPreferred() runs last on purpose — I18n.t() returns undefined until the
   first apply(), and PatcherUI resolves every string through it.
   =========================================================================== */
import { DICT, DEFAULT_LANG } from "../../i18n/dictionary.js";
import { bootSite } from "../../site.js";
import { PATCHER_DICT } from "./patcher-copy.js";
import { SavePatcher } from "./save-patcher.js";
import { PatcherUI } from "./patcher-ui.js";

const dict = {
  en: { ...DICT.en, ...PATCHER_DICT.en },
  pt: { ...DICT.pt, ...PATCHER_DICT.pt }
};

const i18n = bootSite({ dict, defaultLang: DEFAULT_LANG });
new PatcherUI({ patcher: new SavePatcher(), i18n });
i18n.applyPreferred();
