#!/usr/bin/env node

/**
 * Generate photorealistic portraits for historical figures using Vertex AI Imagen 3.
 * Uses service account credentials from frs-image-generator project.
 * No external dependencies - uses Node.js built-in crypto for JWT signing.
 */

import { createSign } from 'crypto'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

const OUTPUT_DIR = join(process.cwd(), '.tmp', 'simli-faces')
const FRS_ENV = '/Users/shakeelbhamani/projects/personal/frs-image-generator/.env.local'

// Faces that need AI generation (busts, closed eyes, side profiles, etc.)
const FACES_TO_GENERATE = [
  {
    id: 'socrates',
    prompt: 'A photorealistic portrait photograph of an elderly ancient Greek man resembling classical depictions of the philosopher Socrates. Broad face, distinctive snub nose, prominent brow ridge, thick curly gray beard, receding hairline with remaining curly gray hair. Weathered olive skin with deep wrinkles. Eyes open with an intelligent, questioning gaze. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture with visible pores. Professional portrait photography style.',
  },
  {
    id: 'plato',
    prompt: 'A photorealistic portrait photograph of a dignified elderly ancient Greek man resembling classical depictions of the philosopher Plato. Distinguished features with a full white flowing beard, broad forehead, deep-set wise eyes, strong jawline, aquiline nose. Olive complexion, weathered skin. Eyes open with a contemplative expression. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
  {
    id: 'aristotle',
    prompt: 'A photorealistic portrait photograph of a middle-aged ancient Greek man resembling classical depictions of the philosopher Aristotle. Neat trimmed dark beard with gray, intelligent penetrating eyes, high forehead, refined distinguished features, strong brow. Olive complexion. Eyes open with a focused analytical expression. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
  {
    id: 'buddha',
    prompt: 'A photorealistic portrait photograph of a young South Asian man resembling traditional depictions of Siddhartha Gautama. Serene peaceful face, gentle warm brown eyes clearly open, short dark hair with a small topknot bun, smooth clear skin, slight gentle smile. Wearing simple ochre/saffron robes visible at the neckline. Direct front-facing headshot composition. Soft warm studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
  {
    id: 'leonardo-da-vinci',
    prompt: 'A photorealistic portrait photograph of an elderly Italian Renaissance man resembling classical depictions of Leonardo da Vinci. Long flowing white hair past shoulders, full white beard, intelligent piercing blue-gray eyes, weathered face with deep expression lines, aquiline nose. Fair aged skin. Eyes open with a curious creative gaze. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture with visible pores. Professional portrait photography style.',
  },
  {
    id: 'vincent-van-gogh',
    prompt: 'A photorealistic portrait photograph of a man resembling the Dutch painter Vincent van Gogh based on his self-portraits. Red-auburn hair closely cropped, neatly trimmed red-ginger beard, intense blue-green eyes, prominent cheekbones, angular face, pale fair skin with freckles. Wearing a simple dark coat with white collar. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture with visible stubble detail. Professional portrait photography style.',
  },
  {
    id: 'galileo',
    prompt: 'A photorealistic portrait photograph of an elderly Italian man resembling classical depictions of the astronomer Galileo Galilei. Full gray-white beard, receding hairline, sharp intelligent eyes, strong nose, weathered Mediterranean skin. Wearing a dark Renaissance-era collar visible at neckline. Eyes open with a determined inquisitive expression. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
  {
    id: 'wolfgang-amadeus-mozart',
    prompt: 'A photorealistic portrait photograph of a young European man resembling classical depictions of Wolfgang Amadeus Mozart. Youthful face in his 30s, powdered light gray hair styled in 18th century fashion, bright intelligent eyes, refined delicate features, slightly rounded face, fair complexion. Wearing a high-collared coat visible at neckline. Eyes open with a lively confident expression. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
  {
    id: 'oscar-wilde',
    prompt: 'A photorealistic portrait photograph of a man resembling the Irish writer Oscar Wilde. Tall broad-shouldered build, long wavy dark brown hair parted in center falling past ears, clean-shaven with full lips, heavy-lidded languid eyes, strong jawline, pale fair skin. Wearing a dark Victorian suit with white cravat visible at neckline. Eyes open with a witty knowing expression. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
  {
    id: 'bruce-lee',
    prompt: 'A photorealistic portrait photograph of a fit young Chinese-American man resembling the martial artist Bruce Lee. Athletic face, sharp defined jawline, intense focused dark brown eyes, thick dark eyebrows, short dark hair neatly combed, muscular neck, light tan East Asian complexion. Clean-shaven. Eyes open with a calm intense expression. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
  {
    id: 'james-baldwin',
    prompt: 'A photorealistic portrait photograph of a middle-aged African-American man resembling the writer James Baldwin. Expressive large eyes, high cheekbones, short cropped dark hair, clean-shaven, warm dark brown skin, prominent forehead, thoughtful intense expression. Wearing a simple dark shirt collar visible at neckline. Eyes open looking directly at camera. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
  {
    id: 'cesar-chavez',
    prompt: 'A photorealistic portrait photograph of a middle-aged Mexican-American man resembling the labor leader Cesar Chavez. Dark thick black hair, broad face, warm brown eyes, prominent nose, olive-brown skin, neat dark mustache, weathered but kind features. Wearing a simple plaid shirt collar visible at neckline. Eyes open with a determined compassionate expression. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
  {
    id: 'helen-keller',
    prompt: 'A photorealistic portrait photograph of a young woman resembling Helen Keller in her 20s-30s. Gentle refined features, light brown wavy hair styled up in an Edwardian fashion, fair complexion, soft expression, wearing a high-collared white Victorian blouse. Eyes open looking toward camera with a serene peaceful expression. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
  {
    id: 'shakespeare',
    prompt: 'A photorealistic portrait photograph of a middle-aged English man resembling classical depictions of William Shakespeare. High receding forehead with remaining dark brown hair, neatly trimmed goatee and mustache, intelligent warm brown eyes, pale English complexion, wearing a white ruff collar typical of Elizabethan era. Eyes open with an observant amused expression. Direct front-facing headshot composition. Soft studio lighting against a plain dark background. Ultra-realistic skin texture. Professional portrait photography style.',
  },
]

// Load service account credentials
function getCredentials() {
  const envContent = readFileSync(FRS_ENV, 'utf-8')
  const match = envContent.match(/GOOGLE_APPLICATION_CREDENTIALS_JSON=(.+)/)
  if (!match) throw new Error('No credentials found in frs-image-generator .env.local')
  return JSON.parse(match[1])
}

// Create JWT for Google OAuth
function createJwt(credentials) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(credentials.private_key.replace(/\\n/g, '\n'), 'base64url')

  return `${signatureInput}.${signature}`
}

// Exchange JWT for access token
async function getAccessToken(credentials) {
  const jwt = createJwt(credentials)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Generate image using Vertex AI Imagen 3
async function generateImage(accessToken, prompt, project, location = 'us-central1') {
  const model = 'imagen-3.0-generate-001'
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`

  const requestBody = {
    instances: [
      {
        prompt,
      },
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: '1:1',
      negativePrompt: 'blurry, low quality, distorted, deformed, painting style, artistic, cartoon, anime, illustration, watermark, text, logo, side profile, looking away',
      safetySetting: 'block_few',
      addWatermark: false,
    },
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Imagen API error ${response.status}: ${error}`)
  }

  const data = await response.json()

  if (!data.predictions || data.predictions.length === 0) {
    throw new Error('No predictions returned')
  }

  const prediction = data.predictions[0]
  const base64Image =
    prediction.bytesBase64Encoded ||
    prediction.structValue?.fields?.bytesBase64Encoded?.stringValue

  if (!base64Image) {
    throw new Error('No image data in response')
  }

  return Buffer.from(base64Image, 'base64')
}

async function main() {
  console.log('=== Generate Photorealistic Portraits with Vertex AI Imagen 3 ===\n')

  const credentials = getCredentials()
  const project = credentials.project_id
  console.log(`Project: ${project}`)
  console.log(`Service account: ${credentials.client_email}\n`)

  console.log('Getting access token...')
  const accessToken = await getAccessToken(credentials)
  console.log('✅ Access token obtained\n')

  let generated = 0
  let failed = 0

  for (const face of FACES_TO_GENERATE) {
    const outputPath = join(OUTPUT_DIR, `${face.id}.png`)

    // Check if already exists and is from a previous good generation
    if (existsSync(outputPath)) {
      // Check file size - if > 100KB, it's probably already a good generated image
      const stats = readFileSync(outputPath)
      if (stats.length > 100_000) {
        console.log(`⏭️  ${face.id} — already has a good image (${(stats.length / 1024).toFixed(0)}KB)`)
        continue
      }
    }

    console.log(`🎨 Generating: ${face.id}...`)
    console.log(`   Prompt: ${face.prompt.substring(0, 80)}...`)

    try {
      const imageBuffer = await generateImage(accessToken, face.prompt, project)
      writeFileSync(outputPath, imageBuffer)
      console.log(`   ✅ Generated: ${(imageBuffer.length / 1024).toFixed(0)}KB`)
      generated++

      // Rate limit between generations
      await new Promise((r) => setTimeout(r, 2000))
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`)
      failed++
    }
  }

  console.log(`\n=== Results ===`)
  console.log(`Generated: ${generated}`)
  console.log(`Failed:    ${failed}`)
  console.log(`\nOutput: ${OUTPUT_DIR}`)
}

main().catch(console.error)
