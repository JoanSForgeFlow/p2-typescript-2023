#!/usr/bin/env bash
# Rebuilds the site with fresh PokeAPI data and copies it into the QuickDex
# repository, which Vercel deploys on push. Usage:
#   bash scripts/deploy.sh [path-to-QuickDex]
# Then review and push from QuickDex:
#   git -C ../QuickDex add -A && git -C ../QuickDex commit -m "[DEPLOY] ..." && git -C ../QuickDex push
set -euo pipefail

cd "$(dirname "$0")/.."
TARGET="${1:-../QuickDex}"

if [ ! -d "$TARGET/.git" ]; then
  echo "QuickDex repository not found at $TARGET" >&2
  exit 1
fi

bun run build:client
bun main.ts

rsync -a index.html offline.html sitemap.xml robots.txt manifest.webmanifest sw.js "$TARGET/"
rsync -a [0-9][0-9][0-9][0-9]_details.html "$TARGET/"
rsync -a --delete css/ "$TARGET/css/"
rsync -a --delete js/ "$TARGET/js/"
rsync -a --delete icons/ "$TARGET/icons/"
rsync -a --delete data/ "$TARGET/data/"

echo
echo "Copied to $TARGET:"
git -C "$TARGET" status --short | awk '{print $2}' | sed -E 's#^[0-9]{4}_details\.html$#*_details.html#; s#^data/pokemon/.*#data/pokemon/*.json#' | sort | uniq -c
