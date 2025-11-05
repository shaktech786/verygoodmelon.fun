#!/usr/bin/env node
/**
 * Batch Avatar Generator for Timeless Minds
 *
 * Generates 61 accurate avatars using face-swap technology:
 * 1. Downloads reference images from Wikipedia/public domain
 * 2. Generates base professional portrait with Flux 1.1 Pro
 * 3. Swaps real face onto base using Easel Advanced Face Swap
 *
 * Cost: ~$5-6 total (61 × $0.08-0.10)
 * Time: ~60-120 minutes
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

// Load environment variables from .env.local
config({ path: path.join(__dirname, '../.env.local') })

if (!process.env.REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN not found in environment')
  console.error('Please add it to .env.local and try again')
  process.exit(1)
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
})

// Wikipedia/Public domain reference image URLs
// These are famous photographs that are in public domain or freely available
const REFERENCE_IMAGES: Record<string, string> = {
  'socrates': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Socrates_Louvre.jpg/800px-Socrates_Louvre.jpg',
  'plato': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Plato-raphael.jpg/800px-Plato-raphael.jpg',
  'aristotle': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Aristotle_Altemps_Inv8575.jpg/800px-Aristotle_Altemps_Inv8575.jpg',
  'confucius': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Confucius_Tang_Dynasty.jpg/800px-Confucius_Tang_Dynasty.jpg',
  'buddha': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Standing_Buddha_Guimet_2418.jpg/800px-Standing_Buddha_Guimet_2418.jpg',
  'leonardo-da-vinci': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Francesco_Melzi_-_Portrait_of_Leonardo.png/800px-Francesco_Melzi_-_Portrait_of_Leonardo.png',
  'michelangelo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Miguel_%C3%81ngel%2C_por_Daniele_da_Volterra_%28detalle%29.jpg/800px-Miguel_%C3%81ngel%2C_por_Daniele_da_Volterra_%28detalle%29.jpg',
  'shakespeare': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Shakespeare.jpg/800px-Shakespeare.jpg',
  'galileo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg/800px-Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg',
  'isaac-newton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Portrait_of_Sir_Isaac_Newton%2C_1689.jpg/800px-Portrait_of_Sir_Isaac_Newton%2C_1689.jpg',
  'benjamin-franklin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Benjamin_Franklin_by_Joseph_Duplessis_1778.jpg/800px-Benjamin_Franklin_by_Joseph_Duplessis_1778.jpg',
  'wolfgang-amadeus-mozart': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Wolfgang-amadeus-mozart_1.jpg/800px-Wolfgang-amadeus-mozart_1.jpg',
  'marie-curie': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Marie_Curie_c1920.jpg/800px-Marie_Curie_c1920.jpg',
  'abraham-lincoln': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Abraham_Lincoln_O-77_matte_collodion_print.jpg/800px-Abraham_Lincoln_O-77_matte_collodion_print.jpg',
  'charles-darwin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Charles_Darwin_seated_crop.jpg/800px-Charles_Darwin_seated_crop.jpg',
  'harriet-tubman': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Harriet_Tubman%2C_by_Squyer%2C_NPG%2C_c1885.jpg/800px-Harriet_Tubman%2C_by_Squyer%2C_NPG%2C_c1885.jpg',
  'frederick-douglass': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Frederick_Douglass_portrait.jpg/800px-Frederick_Douglass_portrait.jpg',
  'mark-twain': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Mark_Twain_by_AF_Bradley.jpg/800px-Mark_Twain_by_AF_Bradley.jpg',
  'vincent-van-gogh': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project.jpg/800px-Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project.jpg',
  'nikola-tesla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Tesla_circa_1890.jpeg/800px-Tesla_circa_1890.jpeg',
  'mahatma-gandhi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Mahatma-Gandhi%2C_studio%2C_1931.jpg/800px-Mahatma-Gandhi%2C_studio%2C_1931.jpg',
  'albert-einstein': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/800px-Albert_Einstein_Head.jpg',
  'virginia-woolf': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/George_Charles_Beresford_-_Virginia_Woolf_in_1902.jpg/800px-George_Charles_Beresford_-_Virginia_Woolf_in_1902.jpg',
  'eleanor-roosevelt': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Eleanor_Roosevelt_portrait_1933.jpg/800px-Eleanor_Roosevelt_portrait_1933.jpg',
  'martin-luther-king-jr': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Martin_Luther_King%2C_Jr..jpg/800px-Martin_Luther_King%2C_Jr..jpg',
  'nelson-mandela': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Nelson_Mandela_1994.jpg/800px-Nelson_Mandela_1994.jpg',
  'malcolm-x': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Malcolm_X_NYWTS_2a.jpg/800px-Malcolm_X_NYWTS_2a.jpg',
  'rosa-parks': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Rosaparks.jpg/800px-Rosaparks.jpg',
  'mother-teresa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Mother_Teresa_1.jpg/800px-Mother_Teresa_1.jpg',
  'john-f-kennedy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/John_F._Kennedy%2C_White_House_color_photo_portrait.jpg/800px-John_F._Kennedy%2C_White_House_color_photo_portrait.jpg',
  'maya-angelou': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Angelou_at_Clinton_inauguration_%28cropped_2%29.jpg/800px-Angelou_at_Clinton_inauguration_%28cropped_2%29.jpg',
  'james-baldwin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/James_Baldwin_33_Allan_Warren.jpg/800px-James_Baldwin_33_Allan_Warren.jpg',
  'frida-kahlo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg/800px-Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg',
  'carl-sagan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Carl_Sagan_Planetary_Society.JPG/800px-Carl_Sagan_Planetary_Society.JPG',
  'steve-jobs': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg/800px-Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg',
  'malala-yousafzai': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Malala_Yousafzai_2015.jpg/800px-Malala_Yousafzai_2015.jpg',
  'anne-frank': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Anne_Frank_in_1940.jpg/800px-Anne_Frank_in_1940.jpg',
  'muhammad-ali': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Muhammad_Ali_NYWTS.jpg/800px-Muhammad_Ali_NYWTS.jpg',
  'oprah-winfrey': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Oprah_in_2014.jpg/800px-Oprah_in_2014.jpg',
  'dalai-lama': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Dalai_Lama_1430_Luca_Galuzzi_2007crop.jpg/800px-Dalai_Lama_1430_Luca_Galuzzi_2007crop.jpg',
  'ruth-bader-ginsburg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Ruth_Bader_Ginsburg_official_SCOTUS_portrait_crop.jpg/800px-Ruth_Bader_Ginsburg_official_SCOTUS_portrait_crop.jpg',
  'bob-marley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bob-Marley-in-Concert_Zurich_05-30-80.jpg/800px-Bob-Marley-in-Concert_Zurich_05-30-80.jpg',
  'jane-goodall': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Jane_Goodall_2019.jpg/800px-Jane_Goodall_2019.jpg',
  'cesar-chavez': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Cesar_chavez_crop2.jpg/800px-Cesar_chavez_crop2.jpg',
  'helen-keller': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Helen_Keller_circa_1920_-_restored.jpg/800px-Helen_Keller_circa_1920_-_restored.jpg',
  'simone-biles': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Simone_Biles_Rio_2016.jpg/800px-Simone_Biles_Rio_2016.jpg',
  'thich-nhat-hanh': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Thich_Nhat_Hanh_12_%28cropped%29.jpg/800px-Thich_Nhat_Hanh_12_%28cropped%29.jpg',
  'fred-rogers': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Fred_Rogers%2C_late_1960s.jpg/800px-Fred_Rogers%2C_late_1960s.jpg',
  'brene-brown': 'https://commons.wikimedia.org/wiki/File:Bren%C3%A9_Brown.jpg', // Will need manual download
  'neil-degrasse-tyson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Neil_deGrasse_Tyson_in_June_2017_%28cropped%29.jpg/800px-Neil_deGrasse_Tyson_in_June_2017_%28cropped%29.jpg',
  'desmond-tutu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Desmond_Tutu_-_Utropolis_2007.jpg/800px-Desmond_Tutu_-_Utropolis_2007.jpg',
  'viktor-frankl': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Viktor_Frankl2.jpg/800px-Viktor_Frankl2.jpg',
  'alan-turing': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Alan_Turing_Aged_16.jpg/800px-Alan_Turing_Aged_16.jpg',
  'ada-lovelace': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Ada_Lovelace_portrait.jpg/800px-Ada_Lovelace_portrait.jpg',
  'rachel-carson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Rachel-Carson.jpg/800px-Rachel-Carson.jpg',
  'wangari-maathai': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Wangari_Maathai_in_Nairobi.jpg/800px-Wangari_Maathai_in_Nairobi.jpg',
  'sojourner-truth': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Sojourner_truth_c1870.jpg/800px-Sojourner_truth_c1870.jpg',
  'susan-b-anthony': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Susan_B_Anthony_by_Powelson.png/800px-Susan_B_Anthony_by_Powelson.png',
  'greta-thunberg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Greta_Thunberg_au_Parlement_europ%C3%A9en_%2833744056508%29_%28cropped%29.jpg/800px-Greta_Thunberg_au_Parlement_europ%C3%A9en_%2833744056508%29_%28cropped%29.jpg',
  'harriet-beecher-stowe': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Harriet_Beecher_Stowe_c1870.jpg/800px-Harriet_Beecher_Stowe_c1870.jpg',
  'rumi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Molana.jpg/800px-Molana.jpg',
}

const DIRS = {
  reference: path.join(__dirname, '../public/games/timeless-minds/reference-images'),
  avatarsTest: path.join(__dirname, '../public/games/timeless-minds/avatars-test'),
  avatarsFinal: path.join(__dirname, '../public/games/timeless-minds/avatars'),
}

// Ensure directories exist
Object.values(DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

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
        // Handle redirect
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

async function generateAvatar(thinkerId: string, avatarPrompt: string): Promise<void> {
  console.log(`\n🎨 Generating avatar for: ${thinkerId}`)

  const refImagePath = path.join(DIRS.reference, `${thinkerId}-ref.jpg`)
  const finalAvatarPath = path.join(DIRS.avatarsFinal, `${thinkerId}.png`)

  // Skip if final avatar already exists
  if (fs.existsSync(finalAvatarPath)) {
    console.log(`  ✓ Avatar already exists, skipping`)
    return
  }

  try {
    // Step 1: Download reference image if not exists
    if (!fs.existsSync(refImagePath)) {
      const refUrl = REFERENCE_IMAGES[thinkerId]
      if (!refUrl) {
        console.log(`  ⚠️  No reference URL found, skipping`)
        return
      }
      console.log(`  📥 Downloading reference image...`)
      await downloadImage(refUrl, refImagePath)
      console.log(`  ✓ Reference image downloaded`)
    }

    // Step 2: Generate base image with Flux 1.1 Pro
    console.log(`  🖼️  Generating base image with Flux 1.1 Pro...`)
    const baseOutput = await replicate.run(
      'black-forest-labs/flux-1.1-pro',
      {
        input: {
          prompt: avatarPrompt,
          aspect_ratio: '1:1',
          output_format: 'png',
          output_quality: 100,
          safety_tolerance: 2,
        }
      }
    ) as any

    // Extract URL from output (handle array or direct string)
    let baseImageUrl = baseOutput
    if (Array.isArray(baseOutput)) {
      baseImageUrl = baseOutput[0]
    } else if (baseOutput?.output) {
      baseImageUrl = Array.isArray(baseOutput.output) ? baseOutput.output[0] : baseOutput.output
    }

    console.log(`  ✓ Base image generated: ${baseImageUrl}`)

    // Step 3: Apply face swap
    console.log(`  🔄 Applying face swap...`)
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

    // Extract URL from face swap output
    let finalImageUrl = faceSwapOutput
    if (Array.isArray(faceSwapOutput)) {
      finalImageUrl = faceSwapOutput[0]
    } else if (faceSwapOutput?.output) {
      finalImageUrl = Array.isArray(faceSwapOutput.output) ? faceSwapOutput.output[0] : faceSwapOutput.output
    }

    console.log(`  ✓ Face swap completed: ${finalImageUrl}`)

    // Step 4: Download final avatar
    console.log(`  💾 Saving final avatar...`)
    await downloadImage(finalImageUrl, finalAvatarPath)
    console.log(`  ✅ Avatar complete: ${thinkerId}`)

  } catch (error) {
    console.error(`  ❌ Failed to generate ${thinkerId}:`, error)
  }
}

async function main() {
  console.log('🚀 Starting batch avatar generation for 61 thinkers...\n')
  console.log('💰 Estimated cost: $5-6 total')
  console.log('⏱️  Estimated time: 60-120 minutes\n')

  const { thinkers } = await import('../lib/games/timeless-minds/thinkers-famous-50.js')

  let completed = 0
  let failed = 0
  let skipped = 0

  for (const thinker of thinkers) {
    try {
      await generateAvatar(thinker.id, thinker.avatarPrompt)
      completed++
    } catch (error) {
      console.error(`Failed: ${thinker.id}`, error)
      failed++
    }

    // Progress update
    const total = thinkers.length
    const progress = ((completed + failed + skipped) / total * 100).toFixed(1)
    console.log(`\n📊 Progress: ${completed + failed + skipped}/${total} (${progress}%) | ✅ ${completed} | ❌ ${failed} | ⏭️  ${skipped}\n`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 Batch generation complete!')
  console.log(`✅ Completed: ${completed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log('='.repeat(60))
}

main().catch(console.error)
