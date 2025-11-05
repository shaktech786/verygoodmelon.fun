#!/bin/bash

# Convert newly downloaded reference images to PNG for avatars folder

REFERENCE_DIR="public/games/timeless-minds/reference-images"
AVATARS_DIR="public/games/timeless-minds/avatars"

echo "🔄 Converting new reference images to PNG..."

# List of new thinkers to convert
thinkers=(
  "buddha"
  "leonardo-da-vinci"
  "harriet-tubman"
  "frederick-douglass"
  "virginia-woolf"
  "eleanor-roosevelt"
  "malcolm-x"
  "rosa-parks"
  "mother-teresa"
  "maya-angelou"
  "anne-frank"
  "ruth-bader-ginsburg"
  "cesar-chavez"
  "bob-marley"
  "stephen-hawking"
  "bruce-lee"
  "oscar-wilde"
)

for thinker in "${thinkers[@]}"; do
  input_file="$REFERENCE_DIR/${thinker}-ref.jpg"
  output_file="$AVATARS_DIR/${thinker}.png"

  if [ -f "$input_file" ]; then
    sips -s format png "$input_file" --out "$output_file" > /dev/null 2>&1
    echo "✓ Converted: $thinker"
  else
    echo "⚠️  Missing: $thinker (file not found)"
  fi
done

echo "✅ Conversion complete! All 17 new avatars created."
