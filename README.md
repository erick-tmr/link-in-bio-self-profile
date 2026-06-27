# link-in-bio-self-profile

Personal Link in Bio profile — a static page (HTML + CSS + vanilla ES modules).

## Project layout

```
web/                source — served as-is in development
  index.html
  styles.css
  js/               native ES modules (no bundler)
    main.js         composition root: wires the modules together
    i18n/           dictionary (data) + I18n (DOM application)
    player/         playlist · audio-engine · music-player · music-dock
  assets/           images + audio — NOT in git, hosted on S3 (see below)
build.mjs           minify-only asset build (esbuild, no bundling)
dist/               build output — deployed to S3 (git-ignored)
```

## Build & deploy

Assets follow a "Rails philosophy": HTTP/2 makes bundling pointless, so the JS
ships as individual ES modules. The build only **minifies** (JS per-file with
imports intact, plus CSS) into `dist/` — no bundling, no fingerprinting.

```bash
npm install        # one-time
npm run build      # web/ -> dist/ (minified)
npm run serve      # build, then serve dist/ locally
```

Deployment is automatic on push to `main` (`.github/workflows/deploy.yml`):
build → `aws s3 sync ./dist` (compiled output only) → Cloudflare cache purge.

## Assets (images + audio)

Large assets live in S3 (`s3://www.ericktakeshi.com.br/assets/`) and are served
from the CDN, not committed to git. Publish new/changed ones with:

```bash
./scripts/sync-assets.sh            # upload new/changed assets
./scripts/sync-assets.sh --delete   # also prune assets removed locally
```
