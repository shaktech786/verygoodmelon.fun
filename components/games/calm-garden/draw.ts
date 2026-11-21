import { GROUND_TOP, categoryOf, type Plant, type PlantCategory, type PlantType, type Season, type TimeOfDay } from '@/lib/games/calm-garden/garden'
import { depthFactor, sizeFactor } from '@/lib/games/calm-garden/geometry'

type Ctx = CanvasRenderingContext2D

const GREENS = ['#74c69d', '#52b788', '#40916c', '#2d6a4f', '#1f5c3a']
const PETALS = ['#e63946', '#f4845f', '#f7b267', '#d4a5f5', '#f9c6d3']
const BROWNS = ['#8b6f47', '#a0855b', '#6b4f36', '#5c3d2e']
const GREYS = ['#9e9e9e', '#b3b3b3', '#8a8a8a', '#7a7a7a']

const CANOPY: Record<Season, string[]> = {
  spring: ['#74c69d', '#5fbf8a', '#52b788', '#40916c'],
  summer: ['#52b788', '#40916c', '#2d6a4f', '#3f8f5f'],
  autumn: ['#d98e3b', '#c8692d', '#e2a54a', '#b5582c'],
  winter: ['#6f8f7a', '#5f7f6c', '#7d9a88', '#68856f'],
}

const SKY: Record<TimeOfDay, { top: string; bottom: string }> = {
  morning: { top: '#fbc2b5', bottom: '#fde8c9' },
  day: { top: '#87ceeb', bottom: '#b8e4f0' },
  evening: { top: '#f4845f', bottom: '#fde8c9' },
  night: { top: '#1a1a3e', bottom: '#2d2d5e' },
}

// Where the light goes while someone sits: golden hour by day, dusk in the
// evening, a deeper moonlit night.
const SIT_SKY: Record<TimeOfDay, { top: string; bottom: string }> = {
  morning: { top: '#a8d8f0', bottom: '#fff1d6' },
  day: { top: '#f2a86a', bottom: '#ffe1b0' },
  evening: { top: '#2e2a5a', bottom: '#d9806a' },
  night: { top: '#10112c', bottom: '#2a3768' },
}
const SIT_GROUND: Record<TimeOfDay, [string, string, string]> = {
  morning: ['#a3cf8a', '#7fb36a', '#5a9450'],
  day: ['#c2b462', '#9a9a4c', '#6f7a3a'],
  evening: ['#4f6a52', '#3c5642', '#2a3f30'],
  night: ['#35604a', '#2a5040', '#1c3a2c'],
}

const GROUND: Record<Season, [string, string, string]> = {
  spring: ['#86c486', '#5fa35f', '#3f7f3f'],
  summer: ['#7db87d', '#5a9a5a', '#3d7a3d'],
  autumn: ['#9cb46e', '#7d9e55', '#5a7f40'],
  winter: ['#a7bfa5', '#88a889', '#678a6b'],
}
const NIGHT_GROUND: [string, string, string] = ['#3f6b4a', '#335c3e', '#24452e']

const pick = <T,>(list: readonly T[], seed: number) => list[Math.min(list.length - 1, Math.floor(seed * list.length))]

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

/** Blend two #rrggbb colours; t = 0 gives a, t = 1 gives b. */
function lerp(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${mix(ar, br)}, ${mix(ag, bg)}, ${mix(ab, bb)})`
}

function blob(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}

/** Overlapping circles with a shadowed underside and a lit top, so canopies read as round. */
function canopy(ctx: Ctx, x: number, y: number, s: number, parts: readonly (readonly [number, number, number])[], color: string) {
  for (const [ox, oy, r] of parts) blob(ctx, x + ox * s, y + oy * s, r * s, shade(color, -0.22))
  for (const [ox, oy, r] of parts) blob(ctx, x + ox * s - r * s * 0.12, y + oy * s - r * s * 0.18, r * s * 0.86, color)
  for (const [ox, oy, r] of parts) blob(ctx, x + ox * s - r * s * 0.35, y + oy * s - r * s * 0.42, r * s * 0.32, shade(color, 0.18))
}

function stem(ctx: Ctx, x: number, baseY: number, height: number, sway: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(x, baseY)
  ctx.quadraticCurveTo(x + sway * 0.6, baseY - height * 0.5, x + sway, baseY - height)
  ctx.strokeStyle = GREENS[2]
  ctx.lineWidth = Math.max(1.5, 1.6 * Math.sqrt(s))
  ctx.lineCap = 'round'
  ctx.stroke()
}

function leaf(ctx: Ctx, x: number, y: number, s: number, angle: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.ellipse(0, 0, 6 * s, 2.6 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = GREENS[1]
  ctx.fill()
  ctx.restore()
}

function drawFlower(ctx: Ctx, type: PlantType, x: number, y: number, s: number, seed: number, sway: number) {
  const stemH = 30 * s
  const tx = x + sway
  const ty = y - stemH
  stem(ctx, x, y, stemH, sway, s)
  leaf(ctx, x + sway * 0.3 + 4 * s, y - stemH * 0.35, s, 0.5)
  leaf(ctx, x + sway * 0.2 - 4 * s, y - stemH * 0.2, s, -0.5)
  const petal = pick(PETALS, seed)

  if (type === 'daisy') {
    for (let i = 0; i < 9; i++) {
      const a = ((Math.PI * 2) / 9) * i
      ctx.beginPath()
      ctx.ellipse(tx + Math.cos(a) * 6 * s, ty + Math.sin(a) * 6 * s, 5 * s, 2.6 * s, a, 0, Math.PI * 2)
      ctx.fillStyle = i % 2 ? '#ffffff' : '#f4f1ea'
      ctx.fill()
    }
    blob(ctx, tx, ty, 3.8 * s, '#f2a83b')
    blob(ctx, tx - s, ty - s, 1.6 * s, '#f9cd72')
  } else if (type === 'tulip') {
    ctx.beginPath()
    ctx.moveTo(tx - 7 * s, ty)
    ctx.quadraticCurveTo(tx - 9 * s, ty - 12 * s, tx - 3 * s, ty - 15 * s)
    ctx.lineTo(tx, ty - 10 * s)
    ctx.lineTo(tx + 3 * s, ty - 15 * s)
    ctx.quadraticCurveTo(tx + 9 * s, ty - 12 * s, tx + 7 * s, ty)
    ctx.closePath()
    ctx.fillStyle = petal
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(tx - 2 * s, ty)
    ctx.quadraticCurveTo(tx - 3 * s, ty - 9 * s, tx, ty - 12 * s)
    ctx.quadraticCurveTo(tx + 3 * s, ty - 9 * s, tx + 2 * s, ty)
    ctx.fillStyle = shade(petal, -0.15)
    ctx.fill()
  } else if (type === 'poppy') {
    for (let i = 0; i < 5; i++) {
      const a = ((Math.PI * 2) / 5) * i - Math.PI / 2
      blob(ctx, tx + Math.cos(a) * 5 * s, ty + Math.sin(a) * 5 * s, 6 * s, i % 2 ? petal : shade(petal, -0.1))
    }
    blob(ctx, tx, ty, 3 * s, '#2a1f1a')
  } else if (type === 'lavender') {
    for (let i = 0; i < 8; i++) {
      blob(ctx, tx + Math.sin(i * 2.1 + seed * 10) * 2 * s, ty - i * 2.8 * s, (2.8 - i * 0.15) * s, i % 2 ? '#c792ea' : '#d4a5f5')
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const a = ((Math.PI * 2) / 14) * i
      ctx.save()
      ctx.translate(tx + Math.cos(a) * 8.5 * s, ty + Math.sin(a) * 8.5 * s)
      ctx.rotate(a)
      ctx.beginPath()
      ctx.ellipse(0, 0, 6 * s, 2.8 * s, 0, 0, Math.PI * 2)
      ctx.fillStyle = i % 2 ? '#f7b267' : '#f2a03d'
      ctx.fill()
      ctx.restore()
    }
    blob(ctx, tx, ty, 6 * s, '#5c3d2e')
    blob(ctx, tx - 1.5 * s, ty - 1.5 * s, 2.5 * s, '#7a5240')
  }
}

function drawTree(ctx: Ctx, type: PlantType, x: number, y: number, s: number, seed: number, sway: number, season: Season) {
  const leaves = pick(CANOPY[season], seed)
  if (type === 'oak') {
    const trunkH = 40 * s
    ctx.fillStyle = BROWNS[0]
    ctx.beginPath()
    ctx.moveTo(x - 5 * s, y)
    ctx.lineTo(x - 3 * s + sway * 0.3, y - trunkH)
    ctx.lineTo(x + 3 * s + sway * 0.3, y - trunkH)
    ctx.lineTo(x + 5 * s, y)
    ctx.closePath()
    ctx.fill()
    const cy = y - trunkH
    canopy(ctx, x + sway * 0.5, cy, s, [[0, -10, 18], [-12, -4, 14], [12, -4, 14], [0, -22, 12]], leaves)
    if (season === 'spring') {
      for (const [ox, oy] of [[-8, -14], [6, -20], [10, -6], [-3, -2], [2, -28]]) blob(ctx, x + sway * 0.5 + ox * s, cy + oy * s, 1.8 * s, '#f9c6d3')
    }
  } else if (type === 'pine') {
    const trunkH = 35 * s
    ctx.fillStyle = BROWNS[2]
    ctx.fillRect(x - 3 * s, y - trunkH, 6 * s, trunkH)
    const tx = x + sway * 0.4
    for (let layer = 0; layer < 3; layer++) {
      const ly = y - trunkH + layer * 8 * s - 10 * s
      const w = (14 - layer * 3) * s
      ctx.beginPath()
      ctx.moveTo(tx, ly - 16 * s)
      ctx.lineTo(tx - w, ly)
      ctx.lineTo(tx + w, ly)
      ctx.closePath()
      ctx.fillStyle = season === 'winter' ? shade(GREENS[3], 0.15) : GREENS[3 + Math.min(layer, 1)]
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(tx, ly - 16 * s)
      ctx.lineTo(tx - w, ly)
      ctx.lineTo(tx - w * 0.2, ly)
      ctx.closePath()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.fill()
    }
  } else {
    // A weeping willow: a wide, low crown with a curtain of strands falling from all
    // across it, nearly to the grass. (Strands from a single point read as a palm.)
    const trunkH = 34 * s
    ctx.fillStyle = BROWNS[1]
    ctx.beginPath()
    ctx.moveTo(x - 5 * s, y)
    ctx.quadraticCurveTo(x - 2 * s + sway * 0.2, y - trunkH * 0.5, x - 2 * s + sway * 0.3, y - trunkH)
    ctx.lineTo(x + 3 * s + sway * 0.3, y - trunkH)
    ctx.quadraticCurveTo(x + 3 * s + sway * 0.2, y - trunkH * 0.5, x + 5 * s, y)
    ctx.closePath()
    ctx.fill()
    const tx = x + sway * 0.5
    const base = y - trunkH
    ctx.beginPath()
    ctx.ellipse(tx, base, 19 * s, 17 * s, 0, Math.PI, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = shade(leaves, -0.14)
    ctx.fill()
    ctx.lineCap = 'round'
    ctx.lineWidth = 2.2 * Math.sqrt(s)
    const strands = 19
    for (let i = 0; i < strands; i++) {
      const angle = Math.PI + 0.12 + ((Math.PI - 0.24) * i) / (strands - 1)
      const out = Math.cos(angle)
      const sx = tx + out * 18 * s
      const sy = base + Math.sin(angle) * 16 * s
      // Strands in front of the trunk stop short so it still shows through the curtain.
      const end = y - (Math.abs(out) < 0.35 ? 18 : 6 + ((i * 7) % 5) * 2) * s
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.quadraticCurveTo(sx + out * 9 * s, sy + 8 * s, sx + out * 6 * s + sway * 2, end)
      ctx.strokeStyle = i % 2 ? leaves : shade(leaves, -0.2)
      ctx.stroke()
    }
  }
}

function drawStone(ctx: Ctx, type: PlantType, x: number, y: number, s: number, seed: number) {
  const grey = pick(GREYS, seed)
  if (type === 'round-stone') {
    ctx.beginPath()
    ctx.ellipse(x, y - 6 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = shade(grey, -0.15)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x - 1 * s, y - 7 * s, 8.5 * s, 5.5 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = grey
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x - 3 * s, y - 9 * s, 3 * s, 2 * s, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fill()
  } else if (type === 'flat-stone') {
    ctx.beginPath()
    ctx.ellipse(x, y - 3 * s, 14 * s, 4.5 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = shade(grey, -0.18)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x, y - 4 * s, 13 * s, 3.2 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = grey
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 2 * s, y - 5 * s, 4 * s, 1.2 * s, 0.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(x, y - 16 * s)
    ctx.lineTo(x + 6 * s, y - 4 * s)
    ctx.lineTo(x + 4 * s, y)
    ctx.lineTo(x - 4 * s, y)
    ctx.lineTo(x - 6 * s, y - 4 * s)
    ctx.closePath()
    ctx.fillStyle = `rgba(170, 195, 225, ${0.75 + seed * 0.25})`
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x, y - 16 * s)
    ctx.lineTo(x - 6 * s, y - 4 * s)
    ctx.lineTo(x - 1 * s, y - 3 * s)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fill()
  }
}

function drawMushroom(ctx: Ctx, type: PlantType, x: number, y: number, s: number, seed: number, sway: number) {
  if (type === 'toadstool') {
    const tx = x + sway * 0.5
    ctx.fillStyle = '#f5e6d3'
    ctx.beginPath()
    ctx.moveTo(x - 3 * s, y)
    ctx.lineTo(tx - 2 * s, y - 14 * s)
    ctx.lineTo(tx + 2 * s, y - 14 * s)
    ctx.lineTo(x + 3 * s, y)
    ctx.closePath()
    ctx.fill()
    const cap = seed > 0.5 ? '#e63946' : '#c792ea'
    ctx.beginPath()
    ctx.arc(tx, y - 14 * s, 10 * s, Math.PI, 0)
    ctx.fillStyle = cap
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(tx, y - 14 * s, 10 * s, 2 * s, 0, 0, Math.PI)
    ctx.fillStyle = shade(cap, -0.25)
    ctx.fill()
    blob(ctx, tx - 4 * s, y - 18 * s, 1.6 * s, 'rgba(255,255,255,0.8)')
    blob(ctx, tx + 3 * s, y - 20 * s, 1.6 * s, 'rgba(255,255,255,0.8)')
    blob(ctx, tx + 6 * s, y - 16 * s, 1.2 * s, 'rgba(255,255,255,0.8)')
  } else {
    for (const [ox, oy, k] of [[-6, 0, 0.7], [0, 2, 1], [7, -1, 0.8]] as const) {
      const mx = x + ox * s
      const my = y + oy * s
      const ms = k * s
      const msw = sway * k * 0.2
      ctx.fillStyle = '#f5e6d3'
      ctx.fillRect(mx - 1.5 * ms + msw, my - 8 * ms, 3 * ms, 8 * ms)
      ctx.beginPath()
      ctx.arc(mx + msw, my - 8 * ms, 5 * ms, Math.PI, 0)
      ctx.fillStyle = pick(BROWNS, seed)
      ctx.fill()
    }
  }
}

function drawBush(ctx: Ctx, type: PlantType, x: number, y: number, s: number, seed: number, sway: number, season: Season) {
  const green = season === 'autumn' ? pick(['#7f9a46', '#9a8a3a', '#6f8f3f'], seed) : pick(GREENS.slice(1), seed)
  const bx = x + sway * 0.3
  if (type === 'round-bush') {
    canopy(ctx, bx, y, s, [[0, -8, 12], [-9, -4, 9], [9, -4, 9], [0, -16, 8]], green)
  } else {
    canopy(ctx, bx, y, s, [[0, -7, 10], [-7, -3, 8], [7, -3, 8]], green)
    for (const [ox, oy] of [[-5, -10], [3, -12], [8, -6], [-8, -5], [0, -4]]) {
      blob(ctx, bx + ox * s, y + oy * s, 2.1 * s, '#c62f3c')
      blob(ctx, bx + ox * s - 0.6 * s, y + oy * s - 0.6 * s, 0.8 * s, 'rgba(255,255,255,0.6)')
    }
  }
}

export function drawPlant(ctx: Ctx, type: PlantType, x: number, y: number, s: number, seed: number, sway: number, season: Season) {
  switch (categoryOf(type)) {
    case 'flower':
      return drawFlower(ctx, type, x, y, s, seed, sway)
    case 'tree':
      return drawTree(ctx, type, x, y, s, seed, sway, season)
    case 'stone':
      return drawStone(ctx, type, x, y, s, seed)
    case 'mushroom':
      return drawMushroom(ctx, type, x, y, s, seed, sway)
    case 'bush':
      return drawBush(ctx, type, x, y, s, seed, sway, season)
  }
}

function drawStars(ctx: Ctx, w: number, h: number, time: number, brightness: number) {
  for (let i = 0; i < 46; i++) {
    const sx = (((i * 7919 + 104729) % 1000) / 1000) * w
    const sy = (((i * 6271 + 87119) % 1000) / 1000) * (h * (GROUND_TOP - 0.05))
    const twinkle = (0.45 + Math.sin(time * 0.001 + i * 2.3) * 0.2) * brightness
    blob(ctx, sx, sy, 1 + (i % 3) * 0.5, `rgba(255, 255, 240, ${twinkle})`)
  }
}

/** `sit` runs from 0 to 1 while someone sits, carrying the sky towards SIT_SKY. */
export function drawSky(ctx: Ctx, w: number, h: number, tod: TimeOfDay, time: number, sit: number) {
  const horizon = h * GROUND_TOP
  const colors = SKY[tod]
  const top = lerp(colors.top, SIT_SKY[tod].top, sit)
  const grad = ctx.createLinearGradient(0, 0, 0, horizon + h * 0.05)
  grad.addColorStop(0, top)
  grad.addColorStop(1, lerp(colors.bottom, SIT_SKY[tod].bottom, sit))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, horizon + h * 0.05)

  if (tod === 'night') drawStars(ctx, w, h, time, 1 + sit * 0.4)
  if (tod === 'evening') drawStars(ctx, w, h, time, Math.max(0, sit - 0.4) * 1.6)

  // By day the sun sinks towards the hills; in the evening it sets behind them.
  const orbX = w * (tod === 'morning' ? 0.2 : tod === 'evening' ? 0.8 : 0.72)
  const restY = horizon * (tod === 'day' ? 0.38 : 0.62)
  const setY = horizon * (tod === 'day' ? 0.8 : tod === 'evening' ? 1.15 : 0.62)
  const orbY = restY + (setY - restY) * sit
  const orbR = Math.max(14, Math.min(w, h) * 0.05)
  const glow = ctx.createRadialGradient(orbX, orbY, orbR * 0.5, orbX, orbY, orbR * 3)
  glow.addColorStop(0, tod === 'night' ? `rgba(255,255,230,${0.25 + sit * 0.15})` : 'rgba(255,240,200,0.55)')
  glow.addColorStop(1, 'rgba(255,240,200,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(orbX, orbY, orbR * 3, 0, Math.PI * 2)
  ctx.fill()
  blob(ctx, orbX, orbY, orbR, tod === 'night' ? '#f4f1de' : tod === 'day' ? lerp('#fff3c4', '#ffc98a', sit) : '#ffd8a8')
  if (tod === 'night') blob(ctx, orbX + orbR * 0.4, orbY - orbR * 0.2, orbR * 0.85, top)

  // Clouds drift very slowly; with reduced motion the clock is frozen and they rest.
  if (tod !== 'night') {
    ctx.fillStyle = tod === 'day' ? lerp('#ffffff', '#ffd9b8', sit) : '#ffffff'
    ctx.globalAlpha = tod === 'evening' ? 0.8 - sit * 0.5 : 0.8
    for (let i = 0; i < 3; i++) {
      const span = w + 200
      const cx = ((i * 0.37 + time * 0.000006 * (1 + i * 0.3)) % 1) * span - 100
      const cy = horizon * (0.22 + i * 0.2)
      const k = Math.max(0.7, w / 800) * (1 - i * 0.15)
      // One path per cloud, so overlapping puffs fill as a single shape.
      ctx.beginPath()
      for (const [ox, oy, r] of [[0, 0, 18], [20, -6, 22], [42, 0, 16], [22, 6, 18]] as const) {
        ctx.moveTo(cx + ox * k + r * k, cy + oy * k)
        ctx.arc(cx + ox * k, cy + oy * k, r * k, 0, Math.PI * 2)
      }
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  ctx.beginPath()
  ctx.moveTo(0, horizon + 2)
  ctx.quadraticCurveTo(w * 0.15, horizon - h * 0.06, w * 0.32, horizon - h * 0.01)
  ctx.quadraticCurveTo(w * 0.55, horizon - h * 0.08, w * 0.78, horizon - h * 0.015)
  ctx.quadraticCurveTo(w * 0.9, horizon - h * 0.05, w, horizon - h * 0.02)
  ctx.lineTo(w, horizon + 2)
  ctx.closePath()
  ctx.fillStyle = tod === 'night' ? '#2f4a3a' : lerp('#8fbf8f', tod === 'evening' ? '#3f4f5a' : '#b5b07a', sit)
  ctx.fill()
}

export function drawGround(ctx: Ctx, w: number, h: number, tod: TimeOfDay, season: Season, trees: readonly Plant[], sit: number) {
  const horizon = h * GROUND_TOP
  const base = tod === 'night' ? NIGHT_GROUND : GROUND[season]
  const grad = ctx.createLinearGradient(0, horizon, 0, h)
  base.forEach((color, i) => grad.addColorStop([0, 0.4, 1][i], lerp(color, SIT_GROUND[tod][i], sit * 0.85)))
  ctx.fillStyle = grad
  ctx.fillRect(0, horizon, w, h - horizon)

  ctx.strokeStyle = tod === 'night' ? 'rgba(120,170,120,0.2)' : 'rgba(40,90,40,0.16)'
  ctx.lineWidth = 1
  for (let i = 0; i < 70; i++) {
    const gx = (((i * 7919 + 13) % 997) / 997) * w
    const gy = horizon + 6 + (((i * 6271 + 29) % 991) / 991) * (h - horizon - 8)
    const len = (3 + depthFactor(gy / h) * 4) * Math.sqrt(sizeFactor(w))
    ctx.beginPath()
    ctx.moveTo(gx, gy)
    ctx.quadraticCurveTo(gx - 1, gy - len * 0.6, gx - 3, gy - len)
    ctx.moveTo(gx + 1, gy)
    ctx.quadraticCurveTo(gx + 1, gy - len * 0.7, gx + 1, gy - len * 1.2)
    ctx.moveTo(gx + 2, gy)
    ctx.quadraticCurveTo(gx + 3, gy - len * 0.6, gx + 5, gy - len * 0.8)
    ctx.stroke()
  }

  // In autumn, a few fallen leaves rest under each broadleaf tree.
  if (season === 'autumn') {
    const k = sizeFactor(w)
    for (const t of trees) {
      if (t.type === 'pine') continue
      const s = k * depthFactor(t.y)
      for (let i = 0; i < 6; i++) {
        const lx = t.x * w + Math.sin(i * 2.4 + t.phase) * 26 * s
        const ly = t.y * h + 2 + Math.cos(i * 1.7 + t.phase) * 5 * s
        ctx.beginPath()
        ctx.ellipse(lx, ly, 2.4 * s, 1.2 * s, i, 0, Math.PI * 2)
        ctx.fillStyle = pick(CANOPY.autumn, (i * 0.27 + t.colorSeed) % 1)
        ctx.fill()
      }
    }
  }
}

/** A butterfly by day, a firefly at night. */
export function drawVisitor(ctx: Ctx, kind: 'butterfly' | 'firefly', x: number, y: number, k: number, i: number, time: number, still: boolean) {
  if (kind === 'firefly') {
    const glowAmount = still ? 0.8 : 0.55 + Math.sin(time * 0.002 + i * 2) * 0.3
    const r = 10 * Math.sqrt(k)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255, 245, 160, ${glowAmount})`)
    g.addColorStop(1, 'rgba(255, 245, 160, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    blob(ctx, x, y, 2 * Math.sqrt(k), '#fff6b0')
    return
  }
  const open = still ? 0.85 : 0.35 + Math.abs(Math.sin(time * 0.009 + i)) * 0.65
  const s = 1.1 * k
  const color = PETALS[(i * 2 + 1) % PETALS.length]
  for (const side of [-1, 1]) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x + side * 4 * s * open, y - 2 * s, 4.5 * s * open, 4 * s, side * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = shade(color, -0.12)
    ctx.beginPath()
    ctx.ellipse(x + side * 3 * s * open, y + 3 * s, 3 * s * open, 2.6 * s, -side * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = '#3a2a1e'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, y - 5 * s)
  ctx.lineTo(x, y + 5 * s)
  ctx.stroke()
}

/** Soft light over the plants while sitting: warm sun by day, a cool hush at dusk and night. */
export function drawSitLight(ctx: Ctx, w: number, h: number, tod: TimeOfDay, sit: number) {
  if (sit <= 0) return
  const horizon = h * GROUND_TOP
  if (tod === 'day' || tod === 'morning') {
    const sun = ctx.createRadialGradient(w * (tod === 'day' ? 0.72 : 0.2), horizon * 0.8, 0, w * 0.5, horizon, Math.max(w, h))
    sun.addColorStop(0, `rgba(255, 200, 120, ${0.28 * sit})`)
    sun.addColorStop(1, 'rgba(255, 200, 120, 0)')
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.fillStyle = `rgba(30, 35, 80, ${(tod === 'evening' ? 0.22 : 0.12) * sit})`
    ctx.fillRect(0, horizon, w, h - horizon)
  }
  const vignette = ctx.createRadialGradient(w / 2, h * 0.6, Math.min(w, h) * 0.35, w / 2, h * 0.6, Math.max(w, h) * 0.75)
  vignette.addColorStop(0, 'rgba(25, 15, 20, 0)')
  vignette.addColorStop(1, `rgba(25, 15, 20, ${0.2 * sit})`)
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

export function drawMarker(ctx: Ctx, x: number, y: number, rx: number, ry: number, accent: boolean) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = accent ? 'rgba(211, 47, 63, 0.95)' : 'rgba(26, 77, 46, 0.9)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.setLineDash([])
}

const GLOW_REACH: Record<PlantCategory, { lift: number; r: number }> = {
  tree: { lift: 44, r: 58 },
  flower: { lift: 24, r: 30 },
  bush: { lift: 14, r: 30 },
  mushroom: { lift: 10, r: 20 },
  stone: { lift: 6, r: 18 },
}

/** The faint warm light around something that grew while the garden was left. */
export function drawNewGrowth(ctx: Ctx, category: PlantCategory, x: number, y: number, s: number, amount: number, tod: TimeOfDay) {
  if (amount <= 0) return
  const { lift, r } = GLOW_REACH[category]
  const cy = y - lift * s
  const radius = r * s
  const color = tod === 'night' ? '255, 238, 160' : '255, 248, 214'
  const g = ctx.createRadialGradient(x, cy, 0, x, cy, radius)
  g.addColorStop(0, `rgba(${color}, ${0.5 * amount})`)
  g.addColorStop(0.55, `rgba(${color}, ${0.22 * amount})`)
  g.addColorStop(1, `rgba(${color}, 0)`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, cy, radius, 0, Math.PI * 2)
  ctx.fill()
}
