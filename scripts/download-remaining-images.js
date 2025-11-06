const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const REFERENCE_DIR = path.join(__dirname, '../public/games/timeless-minds/reference-images');

// Alternative sources - using direct Wikipedia Commons URLs without /thumb/
const REFERENCE_IMAGES = {
  'buddha': 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Standing_Buddha_Guimet_2418.jpg',
  'leonardo-da-vinci': 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Francesco_Melzi_-_Portrait_of_Leonardo.png',
  'harriet-tubman': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Harriet_Tubman%2C_by_Squyer%2C_NPG%2C_c1885.jpg',
  'frederick-douglass': 'https://upload.wikimedia.org/wikipedia/commons/6/64/Frederick_Douglass_portrait.jpg',
  'virginia-woolf': 'https://upload.wikimedia.org/wikipedia/commons/0/0b/George_Charles_Beresford_-_Virginia_Woolf_in_1902.jpg',
  'eleanor-roosevelt': 'https://upload.wikimedia.org/wikipedia/commons/7/73/Eleanor_Roosevelt_portrait_1933.jpg',
  'malcolm-x': 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Malcolm_X_NYWTS_2a.jpg',
  'rosa-parks': 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Rosaparks.jpg',
  'mother-teresa': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Mother_Teresa_1.jpg',
  'maya-angelou': 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Angelou_at_Clinton_inauguration_%28cropped_2%29.jpg',
  'anne-frank': 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Anne_Frank_in_1940.jpg',
  'ruth-bader-ginsburg': 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Ruth_Bader_Ginsburg_official_SCOTUS_portrait_crop.jpg',
  'cesar-chavez': 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Cesar_chavez_crop2.jpg',
  'bob-marley': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Bob-Marley-in-Concert_Zurich_05-30-80.jpg',
};

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };

    protocol.get(url, options, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        if (response.headers.location) {
          return downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('📥 Downloading remaining reference images...\n');

  let success = 0;
  let failed = 0;

  for (const [id, url] of Object.entries(REFERENCE_IMAGES)) {
    const filepath = path.join(REFERENCE_DIR, `${id}-ref.jpg`);

    // Skip if already exists and is valid
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      if (stats.size > 10000) {
        console.log(`⏭️  Skipped: ${id} (already exists, ${Math.round(stats.size / 1024)}KB)`);
        success++;
        continue;
      }
    }

    try {
      await downloadImage(url, filepath);
      const stats = fs.statSync(filepath);
      if (stats.size > 10000) {
        console.log(`✓ Downloaded: ${id} (${Math.round(stats.size / 1024)}KB)`);
        success++;
      } else {
        console.log(`✗ Failed: ${id} (file too small: ${stats.size} bytes)`);
        failed++;
      }
    } catch (error) {
      console.log(`✗ Failed: ${id} (${error.message})`);
      failed++;
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Complete: ${success} succeeded, ${failed} failed`);
}

main().catch(console.error);
