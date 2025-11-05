#!/bin/bash

# Convert reference images from JPG to PNG and copy to avatars folder

cd "$(dirname "$0")/.." || exit 1

REFERENCE_DIR="public/games/timeless-minds/reference-images"
AVATARS_DIR="public/games/timeless-minds/avatars"

echo "Converting reference images to PNG format..."
echo ""

converted=0
for img in "$REFERENCE_DIR"/*.jpg; do
  if [ -f "$img" ]; then
    # Extract filename without -ref.jpg suffix
    filename=$(basename "$img" -ref.jpg)

    echo "Converting: $filename"

    # Convert JPG to PNG using sips (macOS built-in)
    sips -s format png "$img" --out "$AVATARS_DIR/${filename}.png" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
      echo "  ✓ Created: $AVATARS_DIR/${filename}.png"
      ((converted++))
    else
      echo "  ✗ Failed to convert: $filename"
    fi
  fi
done

echo ""
echo "Conversion complete!"
echo "Converted $converted images to PNG format"
echo ""
echo "Avatars available in: $AVATARS_DIR"
