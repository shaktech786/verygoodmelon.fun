#!/bin/bash

# Download missing reference images from Wikipedia with proper headers

REFERENCE_DIR="public/games/timeless-minds/reference-images"

echo "📥 Downloading missing reference images from Wikipedia (with proper headers)..."

# Clean up failed downloads first
rm -f "$REFERENCE_DIR/buddha-ref.jpg"
rm -f "$REFERENCE_DIR/leonardo-da-vinci-ref.jpg"
rm -f "$REFERENCE_DIR/harriet-tubman-ref.jpg"
rm -f "$REFERENCE_DIR/frederick-douglass-ref.jpg"
rm -f "$REFERENCE_DIR/virginia-woolf-ref.jpg"
rm -f "$REFERENCE_DIR/eleanor-roosevelt-ref.jpg"
rm -f "$REFERENCE_DIR/malcolm-x-ref.jpg"
rm -f "$REFERENCE_DIR/rosa-parks-ref.jpg"
rm -f "$REFERENCE_DIR/mother-teresa-ref.jpg"
rm -f "$REFERENCE_DIR/maya-angelou-ref.jpg"
rm -f "$REFERENCE_DIR/anne-frank-ref.jpg"
rm -f "$REFERENCE_DIR/ruth-bader-ginsburg-ref.jpg"
rm -f "$REFERENCE_DIR/cesar-chavez-ref.jpg"
rm -f "$REFERENCE_DIR/bob-marley-ref.jpg"
rm -f "$REFERENCE_DIR/stephen-hawking-ref.jpg"
rm -f "$REFERENCE_DIR/oscar-wilde-ref.jpg"

# Use wget instead of curl (better for Wikipedia downloads)
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Buddha
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/buddha-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Standing_Buddha_Guimet_2418.jpg/800px-Standing_Buddha_Guimet_2418.jpg"
echo "✓ Downloaded: buddha"

# Leonardo da Vinci
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/leonardo-da-vinci-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Francesco_Melzi_-_Portrait_of_Leonardo.png/800px-Francesco_Melzi_-_Portrait_of_Leonardo.png"
echo "✓ Downloaded: leonardo-da-vinci"

# Harriet Tubman
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/harriet-tubman-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/0/05/Harriet_Tubman%2C_by_Squyer%2C_NPG%2C_c1885.jpg"
echo "✓ Downloaded: harriet-tubman"

# Frederick Douglass
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/frederick-douglass-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/6/64/Frederick_Douglass_portrait.jpg"
echo "✓ Downloaded: frederick-douglass"

# Virginia Woolf
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/virginia-woolf-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/0/0b/George_Charles_Beresford_-_Virginia_Woolf_in_1902.jpg"
echo "✓ Downloaded: virginia-woolf"

# Eleanor Roosevelt
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/eleanor-roosevelt-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/7/73/Eleanor_Roosevelt_portrait_1933.jpg"
echo "✓ Downloaded: eleanor-roosevelt"

# Malcolm X
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/malcolm-x-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/8/8e/Malcolm_X_NYWTS_2a.jpg"
echo "✓ Downloaded: malcolm-x"

# Rosa Parks
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/rosa-parks-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/c/c4/Rosaparks.jpg"
echo "✓ Downloaded: rosa-parks"

# Mother Teresa
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/mother-teresa-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/9/98/Mother_Teresa_1.jpg"
echo "✓ Downloaded: mother-teresa"

# Maya Angelou
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/maya-angelou-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/f/f3/Angelou_at_Clinton_inauguration_%28cropped_2%29.jpg"
echo "✓ Downloaded: maya-angelou"

# Anne Frank
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/anne-frank-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/3/3f/Anne_Frank_in_1940.jpg"
echo "✓ Downloaded: anne-frank"

# Ruth Bader Ginsburg
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/ruth-bader-ginsburg-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/3/3f/Ruth_Bader_Ginsburg_official_SCOTUS_portrait_crop.jpg"
echo "✓ Downloaded: ruth-bader-ginsburg"

# Cesar Chavez
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/cesar-chavez-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/c/c2/Cesar_chavez_crop2.jpg"
echo "✓ Downloaded: cesar-chavez"

# Bob Marley
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/bob-marley-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/5/5e/Bob-Marley-in-Concert_Zurich_05-30-80.jpg"
echo "✓ Downloaded: bob-marley"

# Stephen Hawking
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/stephen-hawking-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/e/eb/Stephen_Hawking.StarChild.jpg"
echo "✓ Downloaded: stephen-hawking"

# Oscar Wilde
wget -q --user-agent="$USER_AGENT" -O "$REFERENCE_DIR/oscar-wilde-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/a/a7/Oscar_Wilde_Sarony.jpg"
echo "✓ Downloaded: oscar-wilde"

echo "✅ All reference images downloaded!"
