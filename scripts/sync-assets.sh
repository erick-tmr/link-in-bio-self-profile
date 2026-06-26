#!/usr/bin/env bash
set -euo pipefail

# Syncs local web/assets/ up to the S3 bucket's assets/ prefix.
# Assets are NOT stored in git; this is how we publish new/changed ones.
# Pass --delete to also prune bucket objects that no longer exist locally.
#
#   ./scripts/sync-assets.sh            # upload new/changed assets
#   ./scripts/sync-assets.sh --delete   # also remove assets deleted locally
#
# Requires the 'self-site-assets' AWS profile to be configured locally
# (aws configure --profile self-site-assets) with credentials scoped to
# the assets/ prefix of the bucket.

aws s3 sync web/assets s3://www.ericktakeshi.com.br/assets \
  --profile self-site-assets \
  --region sa-east-1 \
  --cache-control 'public, max-age=31536000' \
  "$@"
