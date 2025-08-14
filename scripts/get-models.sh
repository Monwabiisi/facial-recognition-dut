#!/usr/bin/env bash
set -euo pipefail

DEST="public/models"
BASE="https://justadudewhohacks.github.io/face-api.js/models"

mkdir -p "$DEST"

files=(
  tiny_face_detector_model-weights_manifest.json
  tiny_face_detector_model-shard1.bin
  face_landmark_68_model-weights_manifest.json
  face_landmark_68_model-shard1.bin
  face_recognition_model-weights_manifest.json
  face_recognition_model-shard1.bin
)

for f in "${files[@]}"; do
  echo "↓ $f"
  curl -fsSL "$BASE/$f" -o "$DEST/$f"
done

echo "✅ Models ready in $DEST"
