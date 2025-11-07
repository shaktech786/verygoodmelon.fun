/**
 * Generate Joker Cards with DALL-E 3
 */

import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface CardConfig {
  title: string
  filename: string
  symbol: string
  primaryColor: string
  accentColor: string
}

const CARDS: CardConfig[] = [
  {
    title: 'THE STRIKER',
    filename: 'bowling-card.png',
    symbol: 'watermelon rolling towards bowling pins with motion lines',
    primaryColor: '#e63946',
    accentColor: '#1a4d2e'
  },
  {
    title: 'THE OPTIMIST',
    filename: 'hope-daily-card.png',
    symbol: 'sunrise behind a watermelon with radiating light rays',
    primaryColor: '#f6ad55',
    accentColor: '#74c69d'
  },
  {
    title: 'THE SAGE',
    filename: 'timeless-minds-card.png',
    symbol: 'wise watermelon wearing ornate glasses with subtle wisdom symbols',
    primaryColor: '#74c69d',
    accentColor: '#2d3748'
  },
  {
    title: 'THE DILEMMA',
    filename: 'hard-choices-card.png',
    symbol: 'balanced scales with watermelon slices on each side',
    primaryColor: '#9f7aea',
    accentColor: '#e63946'
  }
]

function createPrompt(card: CardConfig): string {
  return `Vintage playing card design in Balatro joker style, portrait orientation.

Title "${card.title}" at top in elegant serif font. Central symbol: ${card.symbol}, minimalist and centered.

Ornate art nouveau border with decorative flourishes in corners. Watermelon motif corner elements. Warm cream/beige textured background.

Primary color: ${card.primaryColor}, Accent color: ${card.accentColor}

Art deco meets vintage circus poster aesthetic. Elegant, mysterious, slightly whimsical. Clean central icon, ornamental decorative frame.

Style: Balatro joker card, vintage playing card, art nouveau ornaments, warm palette, professional but playful.`
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => {
        const buffer = Buffer.concat(chunks)
        fs.writeFileSync(filepath, buffer)
        resolve()
      })
      response.on('error', reject)
    }).on('error', reject)
  })
}

async function generateCard(card: CardConfig): Promise<void> {
  const prompt = createPrompt(card)

  console.log(`\n🎨 Generating "${card.title}"...`)
  console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`)

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1024x1792', // Portrait orientation (close to 3:4)
      quality: 'hd',
      n: 1,
    })

    const imageUrl = response.data[0].url
    if (!imageUrl) {
      throw new Error('No image URL in response')
    }

    const outputPath = path.join(process.cwd(), 'public', card.filename)
    await downloadImage(imageUrl, outputPath)

    console.log(`✅ Saved to: public/${card.filename}`)
    console.log(`🔗 URL: ${imageUrl}`)
  } catch (error) {
    console.error(`❌ Failed to generate "${card.title}":`, error)
    throw error
  }
}

async function generateAllCards() {
  console.log('🎴 Generating all joker cards with DALL-E 3...\n')

  for (const card of CARDS) {
    await generateCard(card)
    // Wait 1 second between requests to avoid rate limits
    if (CARDS.indexOf(card) < CARDS.length - 1) {
      console.log('\n⏳ Waiting 1 second...')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log('\n✨ All cards generated successfully!')
}

if (require.main === module) {
  generateAllCards().catch(console.error)
}
