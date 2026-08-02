/* ===========================================================================
   Erick Takeshi — personal page · entry point.

   Composition root for "/": supplies the site dictionary and starts the shared
   chrome. The wiring itself lives in js/site.js, which every page shares.
   =========================================================================== */
import { DICT, DEFAULT_LANG } from "./i18n/dictionary.js";
import { bootSite } from "./site.js";

bootSite({ dict: DICT, defaultLang: DEFAULT_LANG }).applyPreferred();
