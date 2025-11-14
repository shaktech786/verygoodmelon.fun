/**
 * Generate Simple Pixelated Joker Cards
 *
 * Creates minimalist, pixelated card designs matching the website logo aesthetic.
 * Each card has a clean, pixel-art style with simple icons and bold colors.
 */

const fs = require('fs');
const path = require('path');

// Card dimensions (matching Balatro aspect ratio)
const CARD_WIDTH = 1024;
const CARD_HEIGHT = 1792;
const PIXEL_SIZE = 32; // Size of each pixel block

// Color palette (from design system)
const COLORS = {
  cream: '#f5e6d3',
  darkGreen: '#1a4d2e',
  lightGreen: '#74c69d',
  coral: '#e63946',
  purple: '#7b2cbf',
  gold: '#ffd700',
  white: '#ffffff',
  black: '#1a1a1a',
};

/**
 * Create SVG card with pixelated design
 */
function createCard(config) {
  const { title, icon, bgColor, accentColor, outputPath } = config;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${COLORS.cream}" rx="64"/>

  <!-- Inner card area -->
  <rect x="64" y="64" width="${CARD_WIDTH - 128}" height="${CARD_HEIGHT - 128}" fill="${bgColor}" rx="48"/>

  <!-- Decorative border (pixelated) -->
  <rect x="96" y="96" width="32" height="32" fill="${accentColor}"/>
  <rect x="96" y="${CARD_HEIGHT - 128}" width="32" height="32" fill="${accentColor}"/>
  <rect x="${CARD_WIDTH - 128}" y="96" width="32" height="32" fill="${accentColor}"/>
  <rect x="${CARD_WIDTH - 128}" y="${CARD_HEIGHT - 128}" width="32" height="32" fill="${accentColor}"/>

  <!-- Title banner -->
  <rect x="128" y="160" width="${CARD_WIDTH - 256}" height="160" fill="${COLORS.white}" rx="16"/>
  <text x="${CARD_WIDTH / 2}" y="260"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="72"
    font-weight="800"
    fill="${COLORS.black}"
    text-anchor="middle"
    letter-spacing="-2">${title}</text>

  <!-- Icon area (pixelated) -->
  <g transform="translate(${CARD_WIDTH / 2}, ${CARD_HEIGHT / 2 + 100})">
    ${icon}
  </g>

  <!-- Bottom accent -->
  <rect x="196" y="${CARD_HEIGHT - 256}" width="${CARD_WIDTH - 392}" height="96" fill="${accentColor}" rx="48"/>
</svg>`;

  return svg;
}

/**
 * Pixelated sun/optimism icon
 */
const optimismIcon = `
  <!-- Sun with watermelon colors -->
  <circle cx="0" cy="0" r="100" fill="${COLORS.gold}"/>
  <circle cx="0" cy="0" r="64" fill="${COLORS.coral}"/>
  <!-- Rays -->
  <rect x="-8" y="-160" width="16" height="48" fill="${COLORS.gold}"/>
  <rect x="-8" y="112" width="16" height="48" fill="${COLORS.gold}"/>
  <rect x="-160" y="-8" width="48" height="16" fill="${COLORS.gold}"/>
  <rect x="112" y="-8" width="48" height="16" fill="${COLORS.gold}"/>
  <rect x="-112" y="-112" width="32" height="32" fill="${COLORS.gold}"/>
  <rect x="80" y="-112" width="32" height="32" fill="${COLORS.gold}"/>
  <rect x="-112" y="80" width="32" height="32" fill="${COLORS.gold}"/>
  <rect x="80" y="80" width="32" height="32" fill="${COLORS.gold}"/>
`;

/**
 * Pixelated book/wisdom icon
 */
const sageIcon = `
  <!-- Open book -->
  <rect x="-120" y="-80" width="240" height="160" fill="${COLORS.darkGreen}" rx="8"/>
  <rect x="-112" y="-64" width="104" height="128" fill="${COLORS.cream}"/>
  <rect x="8" y="-64" width="104" height="128" fill="${COLORS.cream}"/>
  <line x1="0" y1="-80" x2="0" y2="80" stroke="${COLORS.darkGreen}" stroke-width="8"/>
  <!-- Text lines -->
  <rect x="-96" y="-40" width="72" height="8" fill="${COLORS.darkGreen}" rx="4"/>
  <rect x="-96" y="-16" width="72" height="8" fill="${COLORS.darkGreen}" rx="4"/>
  <rect x="-96" y="8" width="72" height="8" fill="${COLORS.darkGreen}" rx="4"/>
  <rect x="24" y="-40" width="72" height="8" fill="${COLORS.darkGreen}" rx="4"/>
  <rect x="24" y="-16" width="72" height="8" fill="${COLORS.darkGreen}" rx="4"/>
  <rect x="24" y="8" width="72" height="8" fill="${COLORS.darkGreen}" rx="4"/>
`;

/**
 * Pixelated scales/balance icon
 */
const dilemmaIcon = `
  <!-- Balance scales -->
  <rect x="-8" y="-120" width="16" height="200" fill="${COLORS.purple}"/>
  <rect x="-140" y="-120" width="280" height="16" fill="${COLORS.purple}"/>
  <!-- Left scale -->
  <rect x="-140" y="-104" width="16" height="80" fill="${COLORS.purple}"/>
  <rect x="-180" y="-24" width="96" height="16" fill="${COLORS.gold}" rx="8"/>
  <!-- Right scale -->
  <rect x="124" y="-104" width="16" height="80" fill="${COLORS.purple}"/>
  <rect x="84" y="-24" width="96" height="16" fill="${COLORS.gold}" rx="8"/>
  <!-- Base -->
  <rect x="-64" y="80" width="128" height="32" fill="${COLORS.purple}" rx="16"/>
`;

/**
 * Generate all cards
 */
function generateAllCards() {
  const cards = [
    {
      title: 'THE OPTIMIST',
      icon: optimismIcon,
      bgColor: COLORS.lightGreen,
      accentColor: COLORS.gold,
      outputPath: 'public/games/hope-daily/card.png',
    },
    {
      title: 'THE SAGE',
      icon: sageIcon,
      bgColor: COLORS.darkGreen,
      accentColor: COLORS.lightGreen,
      outputPath: 'public/games/timeless-minds/card.png',
    },
    {
      title: 'THE DILEMMA',
      icon: dilemmaIcon,
      bgColor: COLORS.purple,
      accentColor: COLORS.gold,
      outputPath: 'public/games/hard-choices/card.png',
    },
  ];

  console.log('🎨 Generating pixelated minimalist cards...\n');

  cards.forEach(card => {
    const svg = createCard(card);
    const svgPath = card.outputPath.replace('.png', '.svg');

    // Ensure directory exists
    const dir = path.dirname(svgPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write SVG file
    fs.writeFileSync(svgPath, svg);
    console.log(`✅ Generated: ${svgPath}`);
  });

  console.log('\n✨ All cards generated! SVG files created.');
  console.log('📝 Note: Next.js can serve SVG files directly. Update config to use .svg instead of .png');
}

// Run if called directly
if (require.main === module) {
  generateAllCards();
}

module.exports = { generateAllCards };
