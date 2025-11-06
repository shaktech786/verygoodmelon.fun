#!/usr/bin/env node
/**
 * Generate missing avatars using Flux 1.1 Pro
 *
 * Generates avatars for thinkers without existing images
 * Uses the avatarPrompt from thinkers.ts
 */

import Replicate from 'replicate'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import http from 'http'
import { config } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') })

if (!process.env.REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN not found in environment')
  process.exit(1)
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
})

const AVATARS_DIR = path.join(__dirname, '../public/games/timeless-minds/avatars')

// Missing thinkers with their avatar prompts
const MISSING_THINKERS = [
  {
    id: 'buddha',
    prompt: 'Professional portrait based on classical Buddhist statuary and Gandhara art. South Asian man age 30-40, serene peaceful expression, traditional Buddhist robes, topknot hairstyle, gentle compassionate features. Based on historical Buddhist artistic tradition.'
  },
  {
    id: 'leonardo-da-vinci',
    prompt: "Professional portrait based on Leonardo da Vinci's famous red chalk self-portrait (1512). Elderly man age 60, long flowing white/gray beard, long hair, intense intelligent gaze, wearing Renaissance-era clothing. Exact likeness to his self-portrait drawing."
  },
  {
    id: 'harriet-tubman',
    prompt: 'Professional portrait based on famous 1868-1869 photograph. Black WOMAN age 40s-50s, serious determined expression, wearing Victorian-era dress with white collar, hair pulled back, strong dignified bearing. Exact likeness to historical photograph.'
  },
  {
    id: 'frederick-douglass',
    prompt: 'Professional portrait based on famous 1840s-1870s photographs. Black man age 30-50, distinctive well-groomed afro hairstyle (his signature look), strong commanding presence, wearing formal Victorian attire with bow tie or cravat. Exact likeness to his many famous photographs.'
  },
  {
    id: 'virginia-woolf',
    prompt: 'Professional portrait based on George Charles Beresford 1902 photograph. WOMAN age 40s, distinctive angular features, dark hair styled in 1920s-30s wave, thoughtful melancholic expression, wearing elegant but simple dress with brooch. Exact likeness to historical photographs.'
  },
  {
    id: 'eleanor-roosevelt',
    prompt: 'Professional portrait based on famous 1940s-50s photographs. WOMAN age 60s, gentle warm smile, styled hair in 1940s fashion, wearing tailored suit or dress, pearls (her signature), dignified kind expression. Exact likeness to historical photographs.'
  },
  {
    id: 'malcolm-x',
    prompt: 'Professional portrait based on famous 1960s photographs. Black man age 38-39, short hair, distinctive thick horn-rimmed glasses, powerful intense expression, pointed finger (his signature gesture), wearing dark suit and tie. Exact likeness to iconic 1960s photographs.'
  },
  {
    id: 'rosa-parks',
    prompt: 'Professional portrait based on 1955 Montgomery arrest photograph and later photos. Black WOMAN age 40-50s, calm dignified expression, wearing 1950s-style dress and glasses, serious but peaceful demeanor. Exact likeness to famous arrest photograph and civil rights era photos.'
  },
  {
    id: 'mother-teresa',
    prompt: 'Professional portrait based on famous 1980s photographs. Elderly WOMAN age 70+, distinctive white and blue-striped Missionaries of Charity habit (her signature), deeply lined weathered face, gentle compassionate smile, small frame. Exact likeness to iconic photographs.'
  },
  {
    id: 'maya-angelou',
    prompt: 'Professional portrait based on famous 1970s-2000s photographs. Black WOMAN age 50-70, warm radiant smile, elegant colorful clothing and head wraps (her signature style), dignified regal bearing, expressive face. Exact likeness to her many public appearance photographs.'
  },
  {
    id: 'anne-frank',
    prompt: 'Professional portrait based on her famous 1941 school photograph. Young Jewish girl age 12-13, dark hair, bright intelligent eyes, gentle sweet smile, wearing 1940s school clothing. Exact likeness to her well-known school photograph.'
  },
  {
    id: 'ruth-bader-ginsburg',
    prompt: 'Professional portrait based on famous Supreme Court photographs. WOMAN age 60-80s, small frame, wearing her signature judicial collar/jabot over black robes, large glasses, serious thoughtful expression. Exact likeness to her Supreme Court Justice photographs.'
  },
  {
    id: 'cesar-chavez',
    prompt: 'Professional portrait based on 1960s-70s photographs during United Farm Workers movement. Latino man age 40-50s, dark hair, serious determined expression, wearing casual work shirt, often shown with UFW flag or in the fields. Exact likeness to civil rights era photographs.'
  },
  {
    id: 'bob-marley',
    prompt: 'Professional portrait based on famous 1970s photographs by Adrian Boot and others. Black man age 30s, signature long dreadlocks, warm peaceful smile, often holding guitar, wearing casual clothing, Rastafarian colors. Exact likeness to his iconic 1970s concert and portrait photographs.'
  },
]

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        if (response.headers.location) {
          downloadImage(response.headers.location, filepath).then(resolve).catch(reject)
          return
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed: ${response.statusCode}`))
        return
      }

      const fileStream = fs.createWriteStream(filepath)
      response.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })

      fileStream.on('error', reject)
    }).on('error', reject)
  })
}

async function generateAvatar(id: string, prompt: string): Promise<void> {
  const finalPath = path.join(AVATARS_DIR, `${id}.png`)

  // Skip if already exists
  if (fs.existsSync(finalPath)) {
    const stats = fs.statSync(finalPath)
    if (stats.size > 10000) {
      console.log(`  ⏭️  ${id} - already exists (${Math.round(stats.size / 1024)}KB)`)
      return
    }
  }

  console.log(`  🎨 Generating: ${id}...`)

  try {
    // Generate with Flux 1.1 Pro using predictions API
    const prediction = await replicate.predictions.create({
      version: 'black-forest-labs/flux-1.1-pro',
      input: {
        prompt: prompt,
        aspect_ratio: '1:1',
        output_format: 'png',
        output_quality: 100,
        safety_tolerance: 2,
      }
    })

    // Wait for completion
    console.log(`  ⏳ Waiting for generation to complete...`)
    const completed = await replicate.wait(prediction)

    if (completed.status !== 'succeeded') {
      throw new Error(`Generation failed: ${completed.status}`)
    }

    // Extract URL from output
    const output = completed.output
    let imageUrl: string | null = null

    if (typeof output === 'string') {
      imageUrl = output
    } else if (Array.isArray(output) && typeof output[0] === 'string') {
      imageUrl = output[0]
    } else {
      console.log(`  📋 Output: ${JSON.stringify(output, null, 2)}`)
      throw new Error(`Could not extract image URL from output`)
    }

    // Download image
    await downloadImage(imageUrl, finalPath)

    // Optimize to 512x512
    const { execSync } = await import('child_process')
    execSync(`sips -Z 512 "${finalPath}"`, { stdio: 'pipe' })

    const stats = fs.statSync(finalPath)
    console.log(`  ✓ ${id} - generated (${Math.round(stats.size / 1024)}KB)`)

  } catch (error) {
    console.error(`  ✗ ${id} - failed:`, error)
  }
}

async function main() {
  console.log('🎨 Generating missing avatars with Flux 1.1 Pro\n')
  console.log(`Missing: ${MISSING_THINKERS.length} thinkers\n`)

  let completed = 0
  let failed = 0

  for (const thinker of MISSING_THINKERS) {
    try {
      await generateAvatar(thinker.id, thinker.prompt)
      completed++
    } catch (error) {
      console.error(`Failed: ${thinker.id}`, error)
      failed++
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 Generation complete!')
  console.log(`✅ Completed: ${completed}`)
  console.log(`✗ Failed: ${failed}`)
  console.log('='.repeat(60))
}

main().catch(console.error)
