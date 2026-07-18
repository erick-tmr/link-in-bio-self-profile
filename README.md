# link-in-bio-self-profile

Personal Link in Bio profile — a static page (HTML + CSS + vanilla ES modules).

## Project layout

```
web/                source — served as-is in development
  index.html
  404.html          branded not-found page
  styles.css
  js/               native ES modules (no bundler)
    main.js         composition root: wires the modules together
    i18n/           dictionary (data) + I18n (DOM application)
    player/         playlist · audio-engine · music-player · music-dock
  assets/           images + audio — NOT in git, hosted on Cloudflare R2 (see below)
build.mjs           minify + asset-manifest fingerprint rewrite (esbuild, no bundling)
wrangler.jsonc      Cloudflare Worker static-assets config (serves dist/)
asset-manifest.json generated map: logical asset path -> content-hashed name
dist/               build output — deployed to Cloudflare (git-ignored)
```

## Build & deploy

Assets follow a "Rails philosophy": HTTP/2 makes bundling pointless, so the JS
ships as individual ES modules. The build **minifies** (JS per-file with imports
intact, plus CSS) into `dist/`, copies the static files, and rewrites logical
`cdn.ericktakeshi.com.br/assets/…` URLs to their content-hashed form using
`asset-manifest.json`.

```bash
npm install        # one-time
npm run build      # web/ -> dist/ (minified + fingerprinted asset URLs)
npm run serve      # build, then serve dist/ locally
```

Hosting is **Cloudflare Workers static assets**. On push to `main`, Cloudflare
Builds runs `npm run build` then `npx wrangler deploy` (config in
`wrangler.jsonc`), serving `dist/` at `www.ericktakeshi.com.br`.

## Assets (images + audio)

Images and audio are **not committed to git** — they live on Cloudflare R2 and
are served from `cdn.ericktakeshi.com.br` with content-hash fingerprinted,
immutable-cached filenames. Publish new/changed ones locally with:

```bash
npm run publish-assets   # hash web/assets/**, upload to R2, rewrite asset-manifest.json
```

Then commit the updated `asset-manifest.json` so the next build serves the new
hashes. Credentials come from a local `.env` (see `.env.example`).
