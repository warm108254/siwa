#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./create_promo_video.sh input.jpg output.Dotmp4
# Generates a 15-second product-presentation video from a single image.

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <input_image> <output.Dotmp4>" >&2
  exit 1
fi

INPUT="$1"
OUTPUT="$2"

if [ ! -f "$INPUT" ]; then
  echo "Input image not found: $INPUT" >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required but not installed in this environment." >&2
  exit 2
fi

# 15-second gentle zoom-in presentation (30 fps)
ffmpeg -y \
  -loop 1 -i "$INPUT" \
  -t 15 \
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0005,1.12)':d=450:s=1080x1920" \
  -r 30 \
  -c:v libx264 -pix_fmt yuv420p \
  "$OUTPUT"

echo "Saved: $OUTPUT"
