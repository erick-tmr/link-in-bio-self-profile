/* ===========================================================================
   Asset build — "Rails philosophy": no bundling (HTTP/2 multiplexes the module
   tree just fine), only a minification transform. Source lives in web/; the
   deployable output is written to dist/.

   Steps:
     1. JS  — minify every .js file under web/js individually, preserving the
              folder tree and the relative import paths (bundle: false).
     2. CSS — minify web/styles.css.
     3. HTML— copy web/index.html verbatim.

   web/assets/ is intentionally excluded: those images/audio live on S3/CDN and
   are published out-of-band via scripts/sync-assets.sh.
   =========================================================================== */
import { build } from "esbuild";
import { rm, mkdir, cp, readdir } from "node:fs/promises";
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

  // 3. index.html — copy verbatim.
  await cp(join(SRC, "index.html"), join(OUT, "index.html"));

  console.log(`Build complete: ${entryPoints.length} JS modules + CSS + HTML -> dist/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
