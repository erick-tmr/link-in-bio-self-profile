# link-in-bio-self-profile
Personal Link in Bio profile

## Assets

The media files (images, audio) are **not** stored in git. They live in the S3
bucket under the `assets/` prefix and are referenced from the page by absolute
URLs (`https://www.ericktakeshi.com.br/assets/...`), so they load from S3 both in
production and during local development.

The sync script expects an AWS CLI profile named `self-site-assets` to be
configured locally (`aws configure --profile self-site-assets`), with
credentials scoped to create/update/delete objects under the bucket's `assets/`
prefix.

- **Add or update an asset:** drop the file into `web/assets/` locally, run
  `./scripts/sync-assets.sh`, then commit any HTML/CSS reference change. To
  change an existing asset, rename it (assets are served with a 1-year cache, so
  overwriting a same-named file would stay cached on clients that already loaded
  it). Pass `--delete` (`./scripts/sync-assets.sh --delete`) to also prune
  objects that no longer exist locally.
- **Fresh clone:** there is no `web/assets/` directory. The live site and local
  dev still render because the references point at S3 — you only need the files
  locally if you intend to (re)upload them.

The deploy workflow (`.github/workflows/deploy.yml`) syncs `web/` to the bucket
but excludes `assets/*`, so it never uploads or deletes anything under the
assets prefix.

## Deployment

On every push to `main`, `.github/workflows/deploy.yml`:

1. Syncs `web/` (excluding `assets/*`) to the S3 bucket
   (`s3://www.ericktakeshi.com.br`) — AWS auth is keyless via GitHub OIDC role
   assumption.
2. Purges the Cloudflare cache so updated `index.html` / `app.js` / `styles.css`
   go live immediately. Cloudflare fronts the bucket and caches static files for
   hours, so without this a fresh deploy serves stale JS/CSS.

### Required CI configuration

Cloudflare has no GitHub-OIDC trust, so the purge step uses a stored token,
scoped as tightly as possible. Set these in **Settings → Secrets and variables →
Actions**:

| Name | Kind | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | API token scoped to **Cache Purge** on the `ericktakeshi.com.br` zone only |
| `CLOUDFLARE_ZONE_ID` | Variable | Zone ID for `ericktakeshi.com.br` (an identifier, not sensitive) |
