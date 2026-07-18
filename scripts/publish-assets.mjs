/* ===========================================================================
   Publish assets to Cloudflare R2 with content-hash fingerprinted names.

   Runs LOCALLY — web/assets/ is gitignored and lives only on your machine (and
   R2), so this is the one place that can hash the real bytes. The Cloudflare
   Pages CI build never runs this; it only reads the committed asset-manifest.json
   and rewrites logical asset URLs to their hashed form (see build.mjs).

   What it does, for every file under web/assets/:
     1. sha256 the bytes, take the first 8 hex chars.
     2. Insert the hash before the extension:
          me-gbcam.png                  -> me-gbcam.8f3a1c2b.png
          hoenn/01-opening-movie.mp3    -> hoenn/01-opening-movie.4d5e6f7a.mp3
     3. Upload to s3://<bucket>/assets/<hashed> on R2, immutable 1-year cache,
        correct Content-Type. Skips objects already present (keys are
        content-addressed, so an existing key means identical bytes).
     4. Write asset-manifest.json (logical -> hashed) at the repo root. COMMIT it.

   Config comes from the repo-root .env file (gitignored) or real env vars
   (which take precedence). See .env.example. Required: R2_ACCOUNT_ID. Auth is
   either R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY, or a local aws profile named
   by R2_PROFILE (default: r2-cdn). The AWS CLI must be installed.

   Usage:
     npm run publish-assets            # reads .env
   =========================================================================== */
import { createHash } from "node:crypto";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS_DIR = join(ROOT, "web", "assets");
const MANIFEST = join(ROOT, "asset-manifest.json");

/** Load KEY=VALUE lines from a .env file into process.env (real env wins). */
function loadEnv(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return; // no .env — rely on real env vars
  }
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue; // blank lines and # comments
    const key = match[1];
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(join(ROOT, ".env"));

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const BUCKET = process.env.R2_BUCKET || "ericktakeshi-cdn";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const PROFILE = process.env.R2_PROFILE || "r2-cdn";
const PREFIX = "assets";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const CONTENT_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".json": "application/json"
};

if (!ACCOUNT_ID) {
  console.error("Missing R2_ACCOUNT_ID (your Cloudflare account id).");
  console.error("Set it in .env (copy .env.example) or the environment, then re-run.");
  process.exit(1);
}

const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Global aws flags + the env the aws child process runs with. Auth is either
// explicit R2 keys (passed via env, no profile) or a named aws profile.
const AWS_GLOBAL = ["--endpoint-url", ENDPOINT, "--region", "auto"];
const AWS_ENV = { ...process.env };
if (ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
  AWS_ENV.AWS_ACCESS_KEY_ID = ACCESS_KEY_ID;
  AWS_ENV.AWS_SECRET_ACCESS_KEY = SECRET_ACCESS_KEY;
  AWS_ENV.AWS_DEFAULT_REGION = "auto";
  AWS_ENV.AWS_REGION = "auto";
  delete AWS_ENV.AWS_PROFILE; // don't let a stray profile override the keys
} else {
  AWS_GLOBAL.push("--profile", PROFILE);
}

const runAws = (args) => execFileAsync("aws", [...args, ...AWS_GLOBAL], { env: AWS_ENV });

/** Recursively collect every file under `dir` as an absolute path. */
async function walk(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const dirent of dirents) {
    const full = join(dir, dirent.name);
    if (dirent.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

/** logical "hoenn/01-x.mp3" + hash -> "hoenn/01-x.<hash>.mp3" */
function hashedName(logical, hash) {
  const ext = extname(logical);
  const base = ext ? logical.slice(0, -ext.length) : logical;
  return `${base}.${hash}${ext}`;
}

/** True if the object key already exists in the bucket. */
async function exists(key) {
  try {
    await runAws(["s3api", "head-object", "--bucket", BUCKET, "--key", key]);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let absFiles;
  try {
    absFiles = await walk(ASSETS_DIR);
  } catch {
    console.error(`No assets found at ${ASSETS_DIR}.`);
    console.error("Reconcile the local tree from the current origin first, e.g.:");
    console.error("  aws s3 sync s3://www.ericktakeshi.com.br/assets ./web/assets --profile self-site-assets --region sa-east-1");
    process.exit(1);
  }

  const manifest = {};
  let uploaded = 0;
  let skipped = 0;

  for (const abs of absFiles.sort()) {
    const logical = relative(ASSETS_DIR, abs).split("\\").join("/");
    const ext = extname(logical).toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      console.warn(`  ! unknown extension for ${logical} — skipping (add it to CONTENT_TYPES to publish).`);
      continue;
    }

    const buf = await readFile(abs);
    const hash = createHash("sha256").update(buf).digest("hex").slice(0, 8);
    const hashed = hashedName(logical, hash);
    const key = `${PREFIX}/${hashed}`;
    manifest[logical] = hashed;

    if (await exists(key)) {
      skipped++;
      continue;
    }

    await runAws([
      "s3", "cp", abs, `s3://${BUCKET}/${key}`,
      "--cache-control", CACHE_CONTROL,
      "--content-type", contentType,
      "--only-show-errors"
    ]);
    uploaded++;
    console.log(`  ↑ ${logical}  →  ${hashed}`);
  }

  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  await writeFile(MANIFEST, JSON.stringify(sorted, null, 2) + "\n");

  console.log(
    `\nPublished to r2://${BUCKET}/${PREFIX}/  —  ${uploaded} uploaded, ${skipped} already present, ` +
      `${Object.keys(sorted).length} in manifest.\nWrote asset-manifest.json — commit it so the Pages build picks up the new hashes.`
  );
}

main().catch((err) => {
  console.error(err.stderr || err.message || err);
  process.exit(1);
});
