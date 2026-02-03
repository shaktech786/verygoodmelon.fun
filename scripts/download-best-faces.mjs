#!/usr/bin/env node

/**
 * Download best portrait images for Simli face generation.
 *
 * Strategy:
 * 1. Use Wikipedia REST API to get the canonical portrait for each thinker
 * 2. Download the original (highest resolution) version
 * 3. Fall back to existing avatar if Wikipedia doesn't have one
 *
 * Output: .tmp/simli-faces/ directory with all images ready for upload
 */

import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs'
import { join, extname } from 'path'
import { execSync } from 'child_process'

const OUTPUT_DIR = join(process.cwd(), '.tmp', 'simli-faces')
const EXISTING_AVATARS = join(process.cwd(), 'public', 'games', 'timeless-minds', 'avatars')

// Thinker ID → Wikipedia article title
const THINKER_WIKI_MAP = [
  { id: 'socrates', wiki: 'Socrates' },
  { id: 'plato', wiki: 'Plato' },
  { id: 'aristotle', wiki: 'Aristotle' },
  { id: 'buddha', wiki: 'Gautama_Buddha' },
  { id: 'leonardo-da-vinci', wiki: 'Leonardo_da_Vinci' },
  { id: 'shakespeare', wiki: 'William_Shakespeare' },
  { id: 'galileo', wiki: 'Galileo_Galilei' },
  { id: 'isaac-newton', wiki: 'Isaac_Newton' },
  { id: 'benjamin-franklin', wiki: 'Benjamin_Franklin' },
  { id: 'michelangelo', wiki: 'Michelangelo' },
  { id: 'marie-curie', wiki: 'Marie_Curie' },
  { id: 'abraham-lincoln', wiki: 'Abraham_Lincoln' },
  { id: 'charles-darwin', wiki: 'Charles_Darwin' },
  { id: 'harriet-tubman', wiki: 'Harriet_Tubman' },
  { id: 'frederick-douglass', wiki: 'Frederick_Douglass' },
  { id: 'mark-twain', wiki: 'Mark_Twain' },
  { id: 'vincent-van-gogh', wiki: 'Vincent_van_Gogh' },
  { id: 'nikola-tesla', wiki: 'Nikola_Tesla' },
  { id: 'mahatma-gandhi', wiki: 'Mahatma_Gandhi' },
  { id: 'albert-einstein', wiki: 'Albert_Einstein' },
  { id: 'virginia-woolf', wiki: 'Virginia_Woolf' },
  { id: 'eleanor-roosevelt', wiki: 'Eleanor_Roosevelt' },
  { id: 'martin-luther-king-jr', wiki: 'Martin_Luther_King_Jr.' },
  { id: 'nelson-mandela', wiki: 'Nelson_Mandela' },
  { id: 'malcolm-x', wiki: 'Malcolm_X' },
  { id: 'rosa-parks', wiki: 'Rosa_Parks' },
  { id: 'mother-teresa', wiki: 'Mother_Teresa' },
  { id: 'maya-angelou', wiki: 'Maya_Angelou' },
  { id: 'james-baldwin', wiki: 'James_Baldwin' },
  { id: 'frida-kahlo', wiki: 'Frida_Kahlo' },
  { id: 'carl-sagan', wiki: 'Carl_Sagan' },
  { id: 'stephen-hawking', wiki: 'Stephen_Hawking' },
  { id: 'steve-jobs', wiki: 'Steve_Jobs' },
  { id: 'anne-frank', wiki: 'Anne_Frank' },
  { id: 'ruth-bader-ginsburg', wiki: 'Ruth_Bader_Ginsburg' },
  { id: 'cesar-chavez', wiki: 'Cesar_Chavez' },
  { id: 'helen-keller', wiki: 'Helen_Keller' },
  { id: 'muhammad-ali', wiki: 'Muhammad_Ali' },
  { id: 'bruce-lee', wiki: 'Bruce_Lee' },
  { id: 'bob-marley', wiki: 'Bob_Marley' },
  { id: 'oscar-wilde', wiki: 'Oscar_Wilde' },
  { id: 'neil-degrasse-tyson', wiki: 'Neil_deGrasse_Tyson' },
  { id: 'john-f-kennedy', wiki: 'John_F._Kennedy' },
  { id: 'wolfgang-amadeus-mozart', wiki: 'Wolfgang_Amadeus_Mozart' },
]

// These are busts/sculptures or otherwise unsuitable for Simli
// They need photorealistic alternatives - we'll skip Wikipedia for these
const SKIP_WIKIPEDIA = new Set([
  'socrates',     // marble bust
  'aristotle',    // marble bust
  'buddha',       // existing AI portrait has closed eyes
  'plato',        // face is small/partial in School of Athens
])

async function getWikipediaImage(wikiTitle) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'VeryGoodMelon/1.0 (personal project)' }
  })

  if (!response.ok) return null

  const data = await response.json()
  return data.originalimage?.source || data.thumbnail?.source || null
}

async function downloadImage(url, outputPath) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'VeryGoodMelon/1.0 (personal project)' }
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const buffer = await response.arrayBuffer()
  writeFileSync(outputPath, Buffer.from(buffer))
  return buffer.byteLength
}

function getImageDimensions(filePath) {
  try {
    const w = execSync(`sips -g pixelWidth "${filePath}" 2>/dev/null | tail -1 | awk '{print $2}'`).toString().trim()
    const h = execSync(`sips -g pixelHeight "${filePath}" 2>/dev/null | tail -1 | awk '{print $2}'`).toString().trim()
    return { width: parseInt(w), height: parseInt(h) }
  } catch {
    return null
  }
}

function ensureMinSize(filePath, minSize = 512) {
  const dims = getImageDimensions(filePath)
  if (!dims) return

  if (dims.width >= minSize && dims.height >= minSize) return

  const scale = Math.max(minSize / dims.width, minSize / dims.height)
  const newW = Math.ceil(dims.width * scale)
  const newH = Math.ceil(dims.height * scale)

  execSync(`sips -z ${newH} ${newW} "${filePath}" 2>/dev/null`)
  console.log(`    Resized: ${dims.width}x${dims.height} → ${newW}x${newH}`)
}

function convertToPng(filePath) {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.png') return filePath

  const pngPath = filePath.replace(/\.[^.]+$/, '.png')
  execSync(`sips -s format png "${filePath}" --out "${pngPath}" 2>/dev/null`)

  // Remove the original if different
  if (filePath !== pngPath) {
    try { execSync(`rm "${filePath}"`) } catch {}
  }
  return pngPath
}

async function main() {
  console.log('=== Download Best Faces for Simli ===\n')

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  let downloaded = 0
  let fromExisting = 0
  let skippedForManual = 0
  let failed = 0

  for (const { id, wiki } of THINKER_WIKI_MAP) {
    const outputPath = join(OUTPUT_DIR, `${id}.png`)

    // Check if already downloaded
    if (existsSync(outputPath)) {
      console.log(`⏭️  ${id} — already exists`)
      continue
    }

    // Skip ones that need manual/special handling
    if (SKIP_WIKIPEDIA.has(id)) {
      // Copy existing avatar as fallback
      const existing = join(EXISTING_AVATARS, `${id}.png`)
      if (existsSync(existing)) {
        copyFileSync(existing, outputPath)
        ensureMinSize(outputPath)
        console.log(`⚠️  ${id} — using existing (needs better image)`)
        skippedForManual++
      }
      continue
    }

    // Try Wikipedia
    console.log(`🔍 ${id} — fetching from Wikipedia...`)
    try {
      const imageUrl = await getWikipediaImage(wiki)

      if (imageUrl) {
        // Determine extension from URL
        const urlExt = extname(new URL(imageUrl).pathname).toLowerCase()
        const tmpPath = join(OUTPUT_DIR, `${id}${urlExt || '.jpg'}`)

        const bytes = await downloadImage(imageUrl, tmpPath)
        console.log(`    Downloaded: ${(bytes / 1024).toFixed(0)}KB`)

        // Convert to PNG if needed
        const finalPath = convertToPng(tmpPath)

        // Rename if needed
        if (finalPath !== outputPath) {
          execSync(`mv "${finalPath}" "${outputPath}"`)
        }

        // Ensure minimum size
        ensureMinSize(outputPath)

        const dims = getImageDimensions(outputPath)
        console.log(`    ✅ ${dims?.width}x${dims?.height}`)
        downloaded++
      } else {
        throw new Error('No image found on Wikipedia')
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.log(`    ❌ Wikipedia failed: ${err.message}`)

      // Fall back to existing avatar
      const existing = join(EXISTING_AVATARS, `${id}.png`)
      if (existsSync(existing)) {
        copyFileSync(existing, outputPath)
        ensureMinSize(outputPath)
        console.log(`    📋 Using existing avatar (upscaled)`)
        fromExisting++
      } else {
        console.log(`    ⚠️ No fallback available`)
        failed++
      }
    }
  }

  console.log(`\n=== Results ===`)
  console.log(`Downloaded from Wikipedia: ${downloaded}`)
  console.log(`Using existing (upscaled): ${fromExisting}`)
  console.log(`Need manual replacement:   ${skippedForManual}`)
  console.log(`Failed:                    ${failed}`)
  console.log(`\nOutput directory: ${OUTPUT_DIR}`)
  console.log(`\nNext: Replace images for problematic faces (busts, closed eyes)`)
  console.log(`Then: Run scripts/upload-simli-faces.mjs`)
}

main().catch(console.error)
