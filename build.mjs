/* ===========================================================================
   Asset build — "Rails philosophy": no bundling (HTTP/2 multiplexes the module
   tree just fine), only a minification transform. Source lives in web/; the
   deployable output is written to dist/.

   Steps:
     1. JS  — minify every .js file under web/js individually, preserving the
              folder tree and the relative import paths (bundle: false).
     2. CSS — minify web/styles.css.
     3. HTML— copy web/index.html + web/404.html verbatim.
     4. Root metadata — copy web/favicon.ico + web/site.webmanifest verbatim so
              they are served from the site root (/favicon.ico, /site.webmanifest).
     5. Fingerprint — rewrite logical cdn asset URLs to their content-hashed
              names using asset-manifest.json (see scripts/publish-assets.mjs).

   web/assets/ is intentionally excluded: those images/audio live on R2/CDN and
   are published out-of-band via scripts/publish-assets.mjs.
   =========================================================================== */
import { build } from "esbuild";
import { rm, mkdir, cp, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "web");
const OUT = join(ROOT, "dist");

/** Recursively collect every .js file under `dir`. */
async function jsEntryPoints(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const dirent of dirents) {
    const full = join(dir, dirent.name);
    if (dirent.isDirectory()) files.push(...(await jsEntryPoints(full)));
    else if (dirent.name.endsWith(".js")) files.push(full);
  }
  return files;
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // 1. JS modules — minify per file, keep the tree and import specifiers intact.
  const entryPoints = await jsEntryPoints(join(SRC, "js"));
  await build({
    entryPoints,
    outdir: join(OUT, "js"),
    outbase: join(SRC, "js"),
    bundle: false,
    minify: true,
    format: "esm",
    target: "es2020",
    logLevel: "info"
  });

  // 2. CSS — minify.
  await build({
    entryPoints: [join(SRC, "styles.css")],
    outfile: join(OUT, "styles.css"),
    minify: true,
    loader: { ".css": "css" },
    logLevel: "info"
  });

  // 3. index.html + 404.html — copy verbatim.
  await cp(join(SRC, "index.html"), join(OUT, "index.html"));
  await cp(join(SRC, "404.html"), join(OUT, "404.html"));

  // 4. Root metadata files (favicon + manifest) — copy verbatim to dist root.
  //    The heavier PNG icons live on the CDN under /assets/ (synced separately).
  for (const file of ["favicon.ico", "site.webmanifest"]) {
    await cp(join(SRC, file), join(OUT, file));
  }

  // 5. Fingerprint — swap logical cdn asset URLs for their content-hashed names.
  await fingerprintDist();

  console.log(
    `Build complete: ${entryPoints.length} JS modules + CSS + HTML + 404 + favicon.ico + site.webmanifest -> dist/`
  );
}

// Logical asset URLs in source look like:
//   https://cdn.ericktakeshi.com.br/assets/hoenn/01-opening-movie.mp3
// The capture group is the manifest key (the path after /assets/).
const CDN_ASSET_RE = /https:\/\/cdn\.ericktakeshi\.com\.br\/assets\/([^"')\s]+)/g;

/**
 * Rewrite every logical cdn asset URL in the built output to its hashed form,
 * using asset-manifest.json. No manifest yet (or no cdn URLs in source) => no-op,
 * so this is safe to run before the R2 migration is wired up. Any cdn asset URL
 * with no manifest entry fails the build — that means an unpublished asset.
 */
async function fingerprintDist() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(ROOT, "asset-manifest.json"), "utf8"));
  } catch {
    console.log("No asset-manifest.json — skipping fingerprint rewrite.");
    return;
  }

  const targets = [
    join(OUT, "index.html"),
    join(OUT, "404.html"),
    join(OUT, "styles.css"),
    join(OUT, "site.webmanifest"),
    ...(await jsEntryPoints(join(OUT, "js")))
  ];

  const missing = new Set();
  let rewritten = 0;

  for (const file of targets) {
    let text;
    try {
      text = await readFile(file, "utf8");
    } catch {
      continue;
    }
    let changed = false;
    const next = text.replace(CDN_ASSET_RE, (whole, logical) => {
      const hashed = manifest[logical];
      if (!hashed) {
        missing.add(logical);
        return whole;
      }
      changed = true;
      rewritten++;
      return `https://cdn.ericktakeshi.com.br/assets/${hashed}`;
    });
    if (changed) await writeFile(file, next);
  }

  if (missing.size) {
    console.error("Assets referenced but absent from asset-manifest.json (run `npm run publish-assets`):");
    for (const key of [...missing].sort()) console.error(`  - ${key}`);
    process.exit(1);
  }

  console.log(`Fingerprint: rewrote ${rewritten} asset URL(s) from asset-manifest.json.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
