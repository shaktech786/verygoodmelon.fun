#!/bin/bash

# Download missing reference images from Wikipedia

REFERENCE_DIR="public/games/timeless-minds/reference-images"

echo "📥 Downloading missing reference images from Wikipedia..."

# Buddha
curl -L -o "$REFERENCE_DIR/buddha-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Standing_Buddha_Guimet_2418.jpg/800px-Standing_Buddha_Guimet_2418.jpg"
echo "✓ Downloaded: buddha"

# Leonardo da Vinci
curl -L -o "$REFERENCE_DIR/leonardo-da-vinci-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Francesco_Melzi_-_Portrait_of_Leonardo.png/800px-Francesco_Melzi_-_Portrait_of_Leonardo.png"
echo "✓ Downloaded: leonardo-da-vinci"

# Harriet Tubman
curl -L -o "$REFERENCE_DIR/harriet-tubman-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Harriet_Tubman%2C_by_Squyer%2C_NPG%2C_c1885.jpg/800px-Harriet_Tubman%2C_by_Squyer%2C_NPG%2C_c1885.jpg"
echo "✓ Downloaded: harriet-tubman"

# Frederick Douglass
curl -L -o "$REFERENCE_DIR/frederick-douglass-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Frederick_Douglass_portrait.jpg/800px-Frederick_Douglass_portrait.jpg"
echo "✓ Downloaded: frederick-douglass"

# Virginia Woolf
curl -L -o "$REFERENCE_DIR/virginia-woolf-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/George_Charles_Beresford_-_Virginia_Woolf_in_1902.jpg/800px-George_Charles_Beresford_-_Virginia_Woolf_in_1902.jpg"
echo "✓ Downloaded: virginia-woolf"

# Eleanor Roosevelt
curl -L -o "$REFERENCE_DIR/eleanor-roosevelt-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Eleanor_Roosevelt_portrait_1933.jpg/800px-Eleanor_Roosevelt_portrait_1933.jpg"
echo "✓ Downloaded: eleanor-roosevelt"

# Malcolm X
curl -L -o "$REFERENCE_DIR/malcolm-x-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Malcolm_X_NYWTS_2a.jpg/800px-Malcolm_X_NYWTS_2a.jpg"
echo "✓ Downloaded: malcolm-x"

# Rosa Parks
curl -L -o "$REFERENCE_DIR/rosa-parks-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Rosaparks.jpg/800px-Rosaparks.jpg"
echo "✓ Downloaded: rosa-parks"

# Mother Teresa
curl -L -o "$REFERENCE_DIR/mother-teresa-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Mother_Teresa_1.jpg/800px-Mother_Teresa_1.jpg"
echo "✓ Downloaded: mother-teresa"

# Maya Angelou
curl -L -o "$REFERENCE_DIR/maya-angelou-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Angelou_at_Clinton_inauguration_%28cropped_2%29.jpg/800px-Angelou_at_Clinton_inauguration_%28cropped_2%29.jpg"
echo "✓ Downloaded: maya-angelou"

# Anne Frank
curl -L -o "$REFERENCE_DIR/anne-frank-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Anne_Frank_in_1940.jpg/800px-Anne_Frank_in_1940.jpg"
echo "✓ Downloaded: anne-frank"

# Ruth Bader Ginsburg
curl -L -o "$REFERENCE_DIR/ruth-bader-ginsburg-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Ruth_Bader_Ginsburg_official_SCOTUS_portrait_crop.jpg/800px-Ruth_Bader_Ginsburg_official_SCOTUS_portrait_crop.jpg"
echo "✓ Downloaded: ruth-bader-ginsburg"

# Cesar Chavez
curl -L -o "$REFERENCE_DIR/cesar-chavez-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Cesar_chavez_crop2.jpg/800px-Cesar_chavez_crop2.jpg"
echo "✓ Downloaded: cesar-chavez"

# Bob Marley
curl -L -o "$REFERENCE_DIR/bob-marley-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bob-Marley-in-Concert_Zurich_05-30-80.jpg/800px-Bob-Marley-in-Concert_Zurich_05-30-80.jpg"
echo "✓ Downloaded: bob-marley"

# Stephen Hawking (need to find URL)
curl -L -o "$REFERENCE_DIR/stephen-hawking-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Stephen_Hawking.StarChild.jpg/800px-Stephen_Hawking.StarChild.jpg"
echo "✓ Downloaded: stephen-hawking"

# Bruce Lee
curl -L -o "$REFERENCE_DIR/bruce-lee-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Bruce_Lee_1973.jpg/800px-Bruce_Lee_1973.jpg"
echo "✓ Downloaded: bruce-lee"

# Oscar Wilde
curl -L -o "$REFERENCE_DIR/oscar-wilde-ref.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Oscar_Wilde_Sarony.jpg/800px-Oscar_Wilde_Sarony.jpg"
echo "✓ Downloaded: oscar-wilde"

echo "✅ All reference images downloaded!"
