#!/bin/bash

# Optimize avatar images to reduce file size for Vercel deployment
# Target: 512x512px, compressed PNG

AVATARS_DIR="public/games/timeless-minds/avatars"

echo "🔄 Optimizing avatar images..."
echo ""

total=0
optimized=0

for img in "$AVATARS_DIR"/*.png; do
  if [ -f "$img" ]; then
    filename=$(basename "$img")
    original_size=$(ls -lh "$img" | awk '{print $5}')

    # Resize to 512x512 (maintains aspect ratio, fits within 512x512)
    sips -Z 512 "$img" > /dev/null 2>&1

    new_size=$(ls -lh "$img" | awk '{print $5}')

    echo "✓ $filename: $original_size → $new_size"

    total=$((total + 1))
    optimized=$((optimized + 1))
  fi
done

echo ""
echo "✅ Optimized $optimized/$total images to 512x512px"
