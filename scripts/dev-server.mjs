/* ===========================================================================
   Local dev server — zero dependencies, no build step.

   Two things a plain static server gets wrong for this project, and the whole
   reason this file exists:

     1. Assets 403 locally. Images and audio are served from
        cdn.ericktakeshi.com.br, which has Cloudflare Hotlink Protection on: a
        request carrying a localhost Referer comes back 403 (error 1011), so
        every image on every page renders broken. Same-origin requests from
        www are fine, which is why this only ever bites in development. So the
        server rewrites logical AND fingerprinted cdn asset URLs to a local
        /assets/ route and serves the real files out of web/assets/.

     2. Serving dist/ means rebuilding to see a one-character change. The
        source in web/ is already runnable — native ES modules, plain CSS — so
        by default this serves web/ directly and a refresh is the whole loop.

   Usage:
     node scripts/dev-server.mjs              # serve web/ (npm run dev)
     node scripts/dev-server.mjs --dist       # serve dist/ (npm run serve)
     node scripts/dev-server.mjs --port 8080  # or PORT=8080
   =========================================================================== */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS_DIR = join(ROOT, "web", "assets");

const args = process.argv.slice(2);
const serveDist = args.includes("--dist");
const SRC = join(ROOT, serveDist ? "dist" : "web");

const portFlag = args.indexOf("--port");
const BASE_PORT = Number(portFlag !== -1 ? args[portFlag + 1] : process.env.PORT) || 5173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".sav": "application/octet-stream"
};

/** Types whose bodies carry cdn URLs worth rewriting. */
const REWRITABLE = new Set([".html", ".css", ".js", ".mjs", ".webmanifest"]);

const CDN_PREFIX = "https://cdn.ericktakeshi.com.br/assets/";

/**
 * hashed name -> logical name, inverted from asset-manifest.json.
 *
 * dist/ refers to assets by their fingerprinted names (me-gbcam.8f2309bc.png)
 * but only the logical file (me-gbcam.png) exists on disk, so --dist mode needs
 * this to find the bytes. Missing or unreadable manifest just means no
 * fingerprinted names resolve, which is exactly right when serving web/.
 */
async function loadHashedNames() {
  try {
    const manifest = JSON.parse(await readFile(join(ROOT, "asset-manifest.json"), "utf8"));
    return new Map(Object.entries(manifest).map(([logical, hashed]) => [hashed, logical]));
  } catch {
    return new Map();
  }
}

const hashedNames = await loadHashedNames();

/** Resolve `file` inside `root`, or null if it would escape it. */
function safeJoin(root, file) {
  const full = join(root, normalize(file));
  const rel = relative(root, full);
  return rel && !rel.startsWith("..") && !isAbsolute(rel) ? full : null;
}

/**
 * Map a request path to a file on disk.
 * /assets/* is answered from web/assets/ in both modes — the images and audio
 * are gitignored CDN originals and are never copied into dist/.
 */
function resolve(pathname) {
  if (pathname.startsWith("/assets/")) {
    const name = pathname.slice("/assets/".length);
    return safeJoin(ASSETS_DIR, hashedNames.get(name) ?? name);
  }
  const file = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  return safeJoin(SRC, file);
}

async function readIfFile(path) {
  if (!path) return null;
  try {
    if (!(await stat(path)).isFile()) return null;
    return await readFile(path);
  } catch {
    return null;
  }
}

function send(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": Buffer.byteLength(body),
    // Development: never let a stale file survive a refresh.
    "Cache-Control": "no-store"
  });
  res.end(body);
}

async function handle(req, res) {
  const { pathname } = new URL(req.url, "http://localhost");
  const decoded = decodeURIComponent(pathname);

  let path = resolve(decoded);
  let body = await readIfFile(path);

  // A bare directory path (/games) is the same page as /games/, and every
  // relative URL inside it depends on the trailing slash — so redirect rather
  // than serve it from the wrong base.
  if (!body && !decoded.endsWith("/") && !extname(decoded)) {
    const asDir = await readIfFile(resolve(`${decoded}/`));
    if (asDir) {
      res.writeHead(301, { Location: `${decoded}/` });
      return res.end();
    }
  }

  let status = 200;
  if (!body) {
    status = 404;
    path = join(SRC, "404.html");
    body = (await readIfFile(path)) ?? Buffer.from("404 Not Found");
  }

  const ext = extname(path);
  if (REWRITABLE.has(ext)) {
    // The one transform: point cdn asset URLs at this server instead, so
    // Hotlink Protection never sees a localhost Referer.
    body = Buffer.from(body.toString("utf8").split(CDN_PREFIX).join("/assets/"), "utf8");
  }

  send(res, status, body, TYPES[ext] ?? "application/octet-stream");
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(`  ${req.method} ${req.url} — ${err.message}`);
    if (!res.headersSent) send(res, 500, "500 Internal Server Error", "text/plain; charset=utf-8");
  });
});

/** Step past a port someone else is already on rather than just dying. */
let port = BASE_PORT;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && port < BASE_PORT + 10) {
    server.listen(++port);
    return;
  }
  console.error(err.message);
  process.exit(1);
});

server.listen(port, () => {
  const dir = relative(ROOT, SRC) || ".";
  console.log(`\n  Serving ${dir}/ on http://localhost:${port}`);
  console.log(`  Assets from web/assets/ (cdn URLs rewritten — no hotlink 403)`);
  if (!serveDist) console.log(`  Source, unbuilt: edit and refresh. Use --dist for the built output.`);
  console.log(`\n  Ctrl+C to stop.\n`);
});
