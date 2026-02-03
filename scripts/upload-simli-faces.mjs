#!/usr/bin/env node

/**
 * Upload Avatar PNGs to Simli's generateFaceID API
 *
 * This script:
 * 1. Reads all prepared face PNGs from .tmp/simli-faces/
 *    (already 512x512+ from download-best-faces.mjs and generate-faces.mjs)
 * 2. Uploads each to Simli's API to generate a face ID
 * 3. Waits for queue to clear between batches (free tier has queue limit)
 * 4. Saves the thinker-to-faceId mapping to data/simli-face-ids.json
 *
 * Usage: node scripts/upload-simli-faces.mjs
 *
 * Requires: NEXT_PUBLIC_SIMLI_API_KEY in .env.local
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join, basename, extname } from 'path'
import { config } from 'dotenv'

// Load env
config({ path: '.env.local' })

const SIMLI_API_KEY = process.env.NEXT_PUBLIC_SIMLI_API_KEY
const SIMLI_API_URL = 'https://api.simli.ai'
const FACES_DIR = join(process.cwd(), '.tmp', 'simli-faces')
const OUTPUT_FILE = join(process.cwd(), 'data', 'simli-face-ids.json')

// Free tier: limited concurrent queue, upload in batches
const BATCH_SIZE = 3
const DELAY_BETWEEN_UPLOADS_MS = 5000
const DELAY_BETWEEN_BATCHES_MS = 120000 // 120s between batches to let queue process
const MAX_RETRIES = 5
const QUEUE_FULL_WAIT_MS = 60000 // 60s wait when queue is full

if (!SIMLI_API_KEY) {
  console.error('Error: NEXT_PUBLIC_SIMLI_API_KEY not found in .env.local')
  process.exit(1)
}

// Load existing mappings to avoid re-uploading
let existingMappings = {}
try {
  existingMappings = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
} catch {
  // No existing file
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function uploadFace(imagePath, faceName) {
  const imageBuffer = readFileSync(imagePath)
  const blob = new Blob([imageBuffer], { type: 'image/png' })

  const formData = new FormData()
  formData.append('image', blob, `${faceName}.png`)

  const url = `${SIMLI_API_URL}/generateFaceID?face_name=${encodeURIComponent(faceName)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': SIMLI_API_KEY,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    const status = response.status

    // Queue full — return special marker
    if (status === 400 && errorText.includes('Max concurrent')) {
      return { _queueFull: true }
    }

    throw new Error(`API error ${status}: ${errorText}`)
  }

  const data = await response.json()
  return data
}

async function checkStatus(faceId) {
  try {
    const response = await fetch(`${SIMLI_API_URL}/getRequestStatus?face_id=${faceId}`, {
      method: 'POST',
      headers: {
        'api-key': SIMLI_API_KEY,
      },
    })

    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

async function waitForQueueToClear() {
  console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s for queue to process...`)
  await sleep(DELAY_BETWEEN_BATCHES_MS)
}

function extractFaceId(response) {
  // Simli returns different response formats:
  // - { faceId: "..." } or { face_id: "..." } — direct face ID
  // - { character_uid: "..." } — queued for processing, this IS the face ID
  // - { id: "..." } — alternative format
  return (
    response.faceId ||
    response.face_id ||
    response.character_uid ||
    response.id ||
    null
  )
}

async function main() {
  console.log('=== Simli Face Upload Script ===\n')
  console.log(`API Key: ${SIMLI_API_KEY?.substring(0, 8)}...`)
  console.log(`Faces dir: ${FACES_DIR}`)
  console.log(`Output file: ${OUTPUT_FILE}`)
  console.log(`Batch size: ${BATCH_SIZE}, delay: ${DELAY_BETWEEN_UPLOADS_MS}ms\n`)

  if (!existsSync(FACES_DIR)) {
    console.error(
      `Error: ${FACES_DIR} does not exist. Run download-best-faces.mjs and generate-faces.mjs first.`
    )
    process.exit(1)
  }

  // Get all PNG files from prepared faces directory
  const files = readdirSync(FACES_DIR)
    .filter((f) => extname(f).toLowerCase() === '.png')
    .sort()

  console.log(`Found ${files.length} face images\n`)

  const results = { ...existingMappings }
  let uploaded = 0
  let skipped = 0
  let failed = 0
  let batchCount = 0
  const recentFaceIds = [] // Track for queue checking

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const thinkerId = basename(file, '.png')
    const facePath = join(FACES_DIR, file)

    // Skip if already uploaded
    if (results[thinkerId]) {
      console.log(`⏭️  ${thinkerId} — already uploaded (${results[thinkerId].substring(0, 12)}...)`)
      skipped++
      continue
    }

    // Check file size
    const fileSize = readFileSync(facePath).length
    if (fileSize > 5 * 1024 * 1024) {
      console.log(`⚠️  ${thinkerId} — file too large (${(fileSize / 1024 / 1024).toFixed(1)}MB), skipping`)
      failed++
      continue
    }

    console.log(`📸 [${i + 1}/${files.length}] ${thinkerId} (${(fileSize / 1024).toFixed(0)}KB)`)

    let success = false
    let errorRetries = 0
    const MAX_QUEUE_WAITS = 30 // Up to 30 minutes of queue waiting

    for (let queueWaits = 0; errorRetries < MAX_RETRIES && queueWaits < MAX_QUEUE_WAITS; ) {
      try {
        const response = await uploadFace(facePath, thinkerId)

        if (response._queueFull) {
          queueWaits++
          console.log(`  ⏳ Queue full — waiting ${QUEUE_FULL_WAIT_MS / 1000}s... (${queueWaits}/${MAX_QUEUE_WAITS})`)
          await sleep(QUEUE_FULL_WAIT_MS)
          continue // Queue full doesn't count as an error retry
        }

        const faceId = extractFaceId(response)
        if (faceId) {
          results[thinkerId] = faceId
          console.log(`  ✅ Face ID: ${faceId}`)
          uploaded++
          recentFaceIds.push(faceId)
          success = true
        } else {
          console.log(`  ⚠️ Unexpected response:`, JSON.stringify(response))
          failed++
          success = true // Don't retry unknown responses
        }
        break
      } catch (err) {
        errorRetries++
        if (errorRetries < MAX_RETRIES) {
          console.log(`  ⚠️ Retry ${errorRetries}/${MAX_RETRIES}: ${err.message}`)
          await sleep(5000)
        } else {
          console.error(`  ❌ Failed after ${MAX_RETRIES} retries: ${err.message}`)
          failed++
          success = true // Move on
        }
      }
    }

    if (!success && errorRetries < MAX_RETRIES) {
      console.error(`  ❌ Queue remained full too long, skipping ${thinkerId}`)
      failed++
    }

    // Save progress after each upload
    writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2))

    // Batch management
    batchCount++
    if (batchCount >= BATCH_SIZE) {
      console.log(`\n--- Batch of ${BATCH_SIZE} uploaded, waiting for queue to process ---`)
      await waitForQueueToClear()
      recentFaceIds.length = 0
      batchCount = 0
    } else {
      await sleep(DELAY_BETWEEN_UPLOADS_MS)
    }
  }

  // Final save
  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2))

  console.log(`\n=== Results ===`)
  console.log(`Uploaded: ${uploaded}`)
  console.log(`Skipped:  ${skipped}`)
  console.log(`Failed:   ${failed}`)
  console.log(`Total:    ${uploaded + skipped + failed}/${files.length}`)
  console.log(`\nFace mappings saved to: ${OUTPUT_FILE}`)
}

main().catch(console.error)
