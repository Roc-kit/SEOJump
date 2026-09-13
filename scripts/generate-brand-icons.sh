#!/usr/bin/env bash
set -euo pipefail

EXT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$(cd "$EXT_ROOT/.." && pwd)"
SOURCE="$EXT_ROOT/assets/brand-icon.png"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# The source PNG intentionally keeps the original transparent canvas. Trim that
# outer canvas for favicon/icon output, then add a small transparent safety pad
# so the rounded-square mark stays large without touching browser UI edges.
TRIMMED="$TMP_DIR/brand-icon-trimmed.png"
PADDED="$TMP_DIR/brand-icon-padded.png"

magick "$SOURCE" -trim +repage "$TRIMMED"

dimensions="$(magick identify -format '%w %h' "$TRIMMED")"
read -r width height <<< "$dimensions"
if (( width > height )); then
  max_side=$width
else
  max_side=$height
fi
canvas=$(( (max_side * 108 + 99) / 100 ))

magick "$TRIMMED" \
  -background none \
  -gravity center \
  -extent "${canvas}x${canvas}" \
  "$PADDED"

magick -background none "$PADDED" -filter Lanczos -resize 1024x1024 "$EXT_ROOT/icons/icon1024.png"

for size in 16 32 48 128; do
  magick -background none "$PADDED" -filter Lanczos -resize "${size}x${size}" "$EXT_ROOT/icons/icon${size}.png"
done

magick -background none "$PADDED" -filter Lanczos -resize 64x64 "$PROJECT_ROOT/SEOJumpSite/public/favicon.png"
magick -background none "$PADDED" -filter Lanczos -resize 180x180 "$PROJECT_ROOT/SEOJumpSite/public/apple-touch-icon.png"
