#!/usr/bin/env node
// Turns the thinker portraits into duotone riso prints (docs/design-system/PLAN.md 6.3), offline.
//
//   node scripts/duotone-avatars.mjs [--src <dir>] [--out <dir>]
//
// Reads every PNG in public/games/timeless-minds/avatars and writes, per theme, two WebP plates:
//   <out>/<theme>/<id>.webp       ink plate: the portrait as one ink on paper
//   <out>/<theme>/<id>-spot.webp  spot plate: the theme's dusk ink, printed over the mid-tones
// The page lays the spot plate over the ink plate, so the second ink can settle into register
// (the Sage's first reply). The colours come from lib/design/tokens.ts, so a palette change and
// a re-run is all a re-ink takes. Nothing is fetched; the sources are the committed portraits.
import { mkdirSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import sharp from 'sharp'
import { PALETTES } from '../lib/design/tokens.ts'

const ROOT = join(import.meta.dirname, '..')
const argValue = (flag, fallback) => {
  const at = process.argv.indexOf(flag)
  return at === -1 ? fallback : process.argv[at + 1]
}
const SRC = argValue('--src', join(ROOT, 'public', 'games', 'timeless-minds', 'avatars'))
const OUT = argValue('--out', join(ROOT, 'public', 'games', 'timeless-minds', 'portraits'))

const WIDTH = 480
const INK_QUALITY = 74
// How far the spot ink reaches at its strongest, in the mid-tones; shadows and highlights stay the plain ink and paper.
const SPOT_STRENGTH = 0.62

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Light: the ink is the shadow and the paper the highlight. Dark: the dark paper is the shadow and the light ink the highlight, so a face stays the light thing in the picture. */
function plates(theme) {
  const palette = PALETTES[theme]
  const dark = theme === 'dark'
  return {
    shadow: rgb(dark ? palette.paper : palette.ink),
    highlight: rgb(dark ? palette.ink : palette.paper),
    spot: rgb(palette.dusk),
  }
}

/** A 256-step ramp from the shadow colour to the highlight colour, with a slight S-curve so faces keep their modelling. */
function ramp(shadow, highlight) {
  const table = new Uint8Array(256 * 3)
  for (let level = 0; level < 256; level++) {
    const t = level / 255
    const eased = t * t * (3 - 2 * t) * 0.35 + t * 0.65
    for (let channel = 0; channel < 3; channel++) {
      table[level * 3 + channel] = Math.round(shadow[channel] + (highlight[channel] - shadow[channel]) * eased)
    }
  }
  return table
}

/** The portrait as one channel of tone, flattened onto white and stretched so the darkest and lightest areas use the whole ramp. */
async function tone(file) {
  const { data, info } = await sharp(file)
    .flatten({ background: '#ffffff' })
    .resize({ width: WIDTH, withoutEnlargement: true })
    .greyscale()
    .normalise({ lower: 2, upper: 98 })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

async function print(file, id) {
  const { data, width, height } = await tone(file)
  for (const theme of ['light', 'dark']) {
    const { shadow, highlight, spot } = plates(theme)
    const colours = ramp(shadow, highlight)
    const ink = Buffer.alloc(width * height * 3)
    const spotPlate = Buffer.alloc(width * height * 4)
    for (let i = 0; i < data.length; i++) {
      const level = data[i]
      ink.set(colours.subarray(level * 3, level * 3 + 3), i * 3)
      // The spot ink prints in the mid-tones, strongest at the middle grey and gone at pure shadow and highlight.
      const t = level / 255
      const bell = Math.max(0, 1 - Math.abs(t - 0.5) * 2.2)
      spotPlate.set(spot, i * 4)
      spotPlate[i * 4 + 3] = Math.round(bell * bell * SPOT_STRENGTH * 255)
    }
    const dir = join(OUT, theme)
    mkdirSync(dir, { recursive: true })
    await sharp(ink, { raw: { width, height, channels: 3 } }).webp({ quality: INK_QUALITY }).toFile(join(dir, `${id}.webp`))
    await sharp(spotPlate, { raw: { width, height, channels: 4 } }).webp({ quality: 60, alphaQuality: 60 }).toFile(join(dir, `${id}-spot.webp`))
  }
}

const sources = readdirSync(SRC).filter((name) => name.toLowerCase().endsWith('.png'))
for (const name of sources) await print(join(SRC, name), basename(name, '.png'))
console.log(`Printed ${sources.length} portraits in two inks, for two themes, to ${OUT}`)
