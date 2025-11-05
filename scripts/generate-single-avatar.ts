#!/usr/bin/env node
/**
 * Generate a single avatar for testing
 * Usage: npx tsx scripts/generate-single-avatar.ts <thinker-id>
 */

import Replicate from 'replicate'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import http from 'http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
})

const thinkerId = process.argv[2]

if (!thinkerId) {
  console.error('❌ Usage: npx tsx scripts/generate-single-avatar.ts <thinker-id>')
  process.exit(1)
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }

    protocol.get(url, options, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        if (response.headers.location) {
          downloadImage(response.headers.location, filepath).then(resolve).catch(reject)
          return
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
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

async function imageToBase64(filepath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(filepath)
  return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
}

async function main() {
  console.log(`\n🎨 Generating avatar for: ${thinkerId}\n`)

  // Import thinkers
  const { getThinkerById } = await import('../lib/games/timeless-minds/thinkers.js')
  const thinker = getThinkerById(thinkerId)

  if (!thinker) {
    console.error(`❌ Thinker not found: ${thinkerId}`)
    process.exit(1)
  }

  const DIRS = {
    reference: path.join(__dirname, '../public/games/timeless-minds/reference-images'),
    avatarsFinal: path.join(__dirname, '../public/games/timeless-minds/avatars'),
  }

  // Ensure directories exist
  Object.values(DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })

  const refImagePath = path.join(DIRS.reference, `${thinkerId}-ref.jpg`)
  const finalAvatarPath = path.join(DIRS.avatarsFinal, `${thinkerId}.png`)

  console.log(`📋 Thinker: ${thinker.name}`)
  console.log(`📝 Prompt: ${thinker.avatarPrompt}\n`)

  // Check if reference image exists
  if (!fs.existsSync(refImagePath)) {
    console.log(`⚠️  No reference image found at: ${refImagePath}`)
    console.log(`Please download a reference image and save it there, then run again.`)
    process.exit(1)
  }

  // Step 1: Generate base image with Flux 1.1 Pro
  console.log(`🖼️  Generating base image with Flux 1.1 Pro...`)
  const baseOutput = await replicate.run(
    'black-forest-labs/flux-1.1-pro',
    {
      input: {
        prompt: thinker.avatarPrompt,
        aspect_ratio: '1:1',
        output_format: 'png',
        output_quality: 100,
        safety_tolerance: 2,
      }
    }
  ) as any

  const baseImageUrl = baseOutput?.output || baseOutput
  console.log(`✓ Base image generated: ${baseImageUrl}`)

  // Step 2: Apply face swap
  console.log(`\n🔄 Applying face swap...`)
  const referenceBase64 = await imageToBase64(refImagePath)

  const faceSwapOutput = await replicate.run(
    'easel/advanced-face-swap',
    {
      input: {
        face_image: referenceBase64,
        target_image: baseImageUrl,
      }
    }
  ) as any

  const finalImageUrl = faceSwapOutput?.output || faceSwapOutput
  console.log(`✓ Face swap completed: ${finalImageUrl}`)

  // Step 3: Download final avatar
  console.log(`\n💾 Saving final avatar...`)
  await downloadImage(finalImageUrl, finalAvatarPath)

  console.log(`\n✅ Avatar complete!`)
  console.log(`📁 Saved to: ${finalAvatarPath}`)
}

main().catch(console.error)
