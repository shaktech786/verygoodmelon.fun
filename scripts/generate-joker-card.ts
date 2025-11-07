/**
 * AI Joker Card Image Generator
 * Balatro-inspired card template for game thumbnails
 *
 * Usage:
 * npx tsx scripts/generate-joker-card.ts "The Striker" "bowling" "watermelon bowling pins strike"
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import * as fs from 'fs'
import * as path from 'path'

interface JokerCardConfig {
  title: string           // e.g., "The Striker"
  gameSlug: string        // e.g., "bowling"
  symbolDescription: string // e.g., "watermelon bowling pins"
  primaryColor?: string   // Optional primary color (default: watermelon red)
  accentColor?: string    // Optional accent color (default: watermelon green)
}

const CARD_PROMPT_TEMPLATE = `Create a minimalist, game-inspired joker card design in the style of Balatro playing cards.

CARD TITLE: "{TITLE}"
MAIN SYMBOL: {SYMBOL}
PRIMARY COLOR: {PRIMARY_COLOR}
ACCENT COLOR: {ACCENT_COLOR}

DESIGN REQUIREMENTS:
- Portrait orientation (3:4 ratio, 600x800px ideal)
- Ornate vintage playing card border with art nouveau flourishes
- Central icon/symbol that represents the game concept (simple, iconic, centered)
- Card title at top in elegant serif typography
- Decorative corner elements with watermelon motifs
- Rich, warm background with subtle texture
- Art deco meets vintage circus poster aesthetic
- Minimalist but playful - not overly detailed

STYLE NOTES:
- Think Balatro joker cards: elegant, mysterious, slightly whimsical
- Use decorative borders and frames inspired by vintage playing cards
- Keep central symbol clean and recognizable
- Warm color palette with cream/beige backgrounds
- Art nouveau ornamental elements in corners and borders
- Professional but fun - suitable for a game thumbnail

MUST AVOID:
- Realistic photos or photorealism
- Modern flat design (needs decorative flourishes)
- Cluttered or overly busy compositions
- Dark or moody colors (keep it warm and inviting)
- Text-heavy designs (title only)

Generate a single high-quality card image that could be a collectible joker card from Balatro.`

async function generateJokerCard(config: JokerCardConfig): Promise<string> {
  const primaryColor = config.primaryColor || '#e63946' // watermelon red
  const accentColor = config.accentColor || '#1a4d2e'  // watermelon green

  const prompt = CARD_PROMPT_TEMPLATE
    .replace('{TITLE}', config.title)
    .replace('{SYMBOL}', config.symbolDescription)
    .replace('{PRIMARY_COLOR}', primaryColor)
    .replace('{ACCENT_COLOR}', accentColor)

  console.log(`\n🎨 Card: "${config.title}" (${config.gameSlug})`)
  console.log(`📝 Symbol: ${config.symbolDescription}`)
  console.log(`🎨 Colors: ${primaryColor} / ${accentColor}`)
  console.log('\n📋 AI Image Generation Prompt:')
  console.log('━'.repeat(80))
  console.log(prompt)
  console.log('━'.repeat(80))
  console.log(`\n💾 Save as: public/${config.gameSlug}-card.png`)
  console.log(`📏 Recommended size: 600x800px (3:4 ratio)`)

  return prompt
}

// Card configurations for existing games
const GAME_CARDS: JokerCardConfig[] = [
  {
    title: 'THE STRIKER',
    gameSlug: 'bowling',
    symbolDescription: 'watermelon rolling towards bowling pins, motion lines suggesting a perfect strike',
    primaryColor: '#e63946',
    accentColor: '#1a4d2e'
  },
  {
    title: 'THE OPTIMIST',
    gameSlug: 'hope-daily',
    symbolDescription: 'sunrise behind a watermelon, radiating hope and positivity with light rays',
    primaryColor: '#f6ad55',
    accentColor: '#74c69d'
  },
  {
    title: 'THE SAGE',
    gameSlug: 'timeless-minds',
    symbolDescription: 'wise watermelon with ornate glasses and a gentle knowing expression, surrounded by wisdom symbols',
    primaryColor: '#74c69d',
    accentColor: '#2d3748'
  },
  {
    title: 'THE DILEMMA',
    gameSlug: 'hard-choices',
    symbolDescription: 'balanced scales with watermelon slices on each side, representing difficult choices and moral decisions',
    primaryColor: '#9f7aea',
    accentColor: '#e63946'
  }
]

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    // Generate all cards
    console.log('🎴 Generating all joker cards...\n')
    for (const card of GAME_CARDS) {
      generateJokerCard(card).catch(console.error)
      console.log('\n')
    }
  } else if (args.length >= 3) {
    // Generate custom card
    const [title, gameSlug, symbolDescription] = args
    generateJokerCard({
      title,
      gameSlug,
      symbolDescription
    }).catch(console.error)
  } else {
    console.log('Usage:')
    console.log('  Generate all cards:')
    console.log('    npx tsx scripts/generate-joker-card.ts')
    console.log('\n  Generate custom card:')
    console.log('    npx tsx scripts/generate-joker-card.ts "Title" "slug" "symbol description"')
    process.exit(1)
  }
}

export { generateJokerCard, GAME_CARDS, CARD_PROMPT_TEMPLATE }
