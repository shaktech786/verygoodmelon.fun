import { GROUND_TOP, categoryOf, type Plant, type PlantCategory, type PlantType, type Season, type TimeOfDay } from '@/lib/games/calm-garden/garden'
import { depthFactor, sizeFactor } from '@/lib/games/calm-garden/geometry'
import { pickBySeed } from '@/lib/games/calm-garden/colours'
import { alpha, blend, shade, type GardenColours } from './inks'

type Ctx = CanvasRenderingContext2D
type C = GardenColours

const pick = pickBySeed

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

function stem(ctx: Ctx, c: C, x: number, baseY: number, height: number, sway: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(x, baseY)
  ctx.quadraticCurveTo(x + sway * 0.6, baseY - height * 0.5, x + sway, baseY - height)
  ctx.strokeStyle = c.greens[2]
  ctx.lineWidth = Math.max(1.5, 1.6 * Math.sqrt(s))
  ctx.lineCap = 'round'
  ctx.stroke()
}

function leaf(ctx: Ctx, c: C, x: number, y: number, s: number, angle: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.ellipse(0, 0, 6 * s, 2.6 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = c.greens[1]
  ctx.fill()
  ctx.restore()
}

function drawFlower(ctx: Ctx, c: C, type: PlantType, x: number, y: number, s: number, seed: number, sway: number) {
  const stemH = 30 * s
  const tx = x + sway
  const ty = y - stemH
  stem(ctx, c, x, y, stemH, sway, s)
  leaf(ctx, c, x + sway * 0.3 + 4 * s, y - stemH * 0.35, s, 0.5)
  leaf(ctx, c, x + sway * 0.2 - 4 * s, y - stemH * 0.2, s, -0.5)
  const petal = pick(c.petals, seed)

  if (type === 'daisy') {
    for (let i = 0; i < 9; i++) {
      const a = ((Math.PI * 2) / 9) * i
      ctx.beginPath()
      ctx.ellipse(tx + Math.cos(a) * 6 * s, ty + Math.sin(a) * 6 * s, 5 * s, 2.6 * s, a, 0, Math.PI * 2)
      ctx.fillStyle = i % 2 ? c.white : c.cream
      ctx.fill()
    }
    blob(ctx, tx, ty, 3.8 * s, c.brass)
    blob(ctx, tx - s, ty - s, 1.6 * s, c.brassLight)
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
    blob(ctx, tx, ty, 3 * s, c.body)
  } else if (type === 'lavender') {
    for (let i = 0; i < 8; i++) {
      blob(ctx, tx + Math.sin(i * 2.1 + seed * 10) * 2 * s, ty - i * 2.8 * s, (2.8 - i * 0.15) * s, c.lavender[i % 2])
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const a = ((Math.PI * 2) / 14) * i
      ctx.save()
      ctx.translate(tx + Math.cos(a) * 8.5 * s, ty + Math.sin(a) * 8.5 * s)
      ctx.rotate(a)
      ctx.beginPath()
      ctx.ellipse(0, 0, 6 * s, 2.8 * s, 0, 0, Math.PI * 2)
      ctx.fillStyle = c.sunflower[i % 2]
      ctx.fill()
      ctx.restore()
    }
    blob(ctx, tx, ty, 6 * s, c.browns[3])
    blob(ctx, tx - 1.5 * s, ty - 1.5 * s, 2.5 * s, c.browns[1])
  }
}

function drawTree(ctx: Ctx, c: C, type: PlantType, x: number, y: number, s: number, seed: number, sway: number, season: Season) {
  const leaves = pick(c.canopy[season], seed)
  if (type === 'oak') {
    const trunkH = 40 * s
    ctx.fillStyle = c.browns[0]
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
      for (const [ox, oy] of [[-8, -14], [6, -20], [10, -6], [-3, -2], [2, -28]]) blob(ctx, x + sway * 0.5 + ox * s, cy + oy * s, 1.8 * s, c.blossom)
    }
  } else if (type === 'pine') {
    const trunkH = 35 * s
    ctx.fillStyle = c.browns[2]
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
      ctx.fillStyle = season === 'winter' ? shade(c.greens[3], 0.15) : c.greens[3 + Math.min(layer, 1)]
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(tx, ly - 16 * s)
      ctx.lineTo(tx - w, ly)
      ctx.lineTo(tx - w * 0.2, ly)
      ctx.closePath()
      ctx.fillStyle = alpha(c.white, 0.12)
      ctx.fill()
    }
  } else {
    // A weeping willow: a wide, low crown with a curtain of strands falling from all
    // across it, nearly to the grass. (Strands from a single point read as a palm.)
    const trunkH = 34 * s
    ctx.fillStyle = c.browns[1]
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

function drawStone(ctx: Ctx, c: C, type: PlantType, x: number, y: number, s: number, seed: number) {
  const grey = pick(c.greys, seed)
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
    ctx.fillStyle = alpha(c.white, 0.25)
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
    ctx.fillStyle = alpha(c.white, 0.2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(x, y - 16 * s)
    ctx.lineTo(x + 6 * s, y - 4 * s)
    ctx.lineTo(x + 4 * s, y)
    ctx.lineTo(x - 4 * s, y)
    ctx.lineTo(x - 6 * s, y - 4 * s)
    ctx.closePath()
    ctx.fillStyle = alpha(c.crystal, 0.75 + seed * 0.25)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x, y - 16 * s)
    ctx.lineTo(x - 6 * s, y - 4 * s)
    ctx.lineTo(x - 1 * s, y - 3 * s)
    ctx.closePath()
    ctx.fillStyle = alpha(c.white, 0.35)
    ctx.fill()
  }
}

function drawMushroom(ctx: Ctx, c: C, type: PlantType, x: number, y: number, s: number, seed: number, sway: number) {
  if (type === 'toadstool') {
    const tx = x + sway * 0.5
    ctx.fillStyle = c.toadstool.stem
    ctx.beginPath()
    ctx.moveTo(x - 3 * s, y)
    ctx.lineTo(tx - 2 * s, y - 14 * s)
    ctx.lineTo(tx + 2 * s, y - 14 * s)
    ctx.lineTo(x + 3 * s, y)
    ctx.closePath()
    ctx.fill()
    const cap = seed > 0.5 ? c.toadstool.capWarm : c.toadstool.capCool
    ctx.beginPath()
    ctx.arc(tx, y - 14 * s, 10 * s, Math.PI, 0)
    ctx.fillStyle = cap
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(tx, y - 14 * s, 10 * s, 2 * s, 0, 0, Math.PI)
    ctx.fillStyle = shade(cap, -0.25)
    ctx.fill()
    const spot = alpha(c.white, 0.8)
    blob(ctx, tx - 4 * s, y - 18 * s, 1.6 * s, spot)
    blob(ctx, tx + 3 * s, y - 20 * s, 1.6 * s, spot)
    blob(ctx, tx + 6 * s, y - 16 * s, 1.2 * s, spot)
  } else {
    for (const [ox, oy, k] of [[-6, 0, 0.7], [0, 2, 1], [7, -1, 0.8]] as const) {
      const mx = x + ox * s
      const my = y + oy * s
      const ms = k * s
      const msw = sway * k * 0.2
      ctx.fillStyle = c.toadstool.stem
      ctx.fillRect(mx - 1.5 * ms + msw, my - 8 * ms, 3 * ms, 8 * ms)
      ctx.beginPath()
      ctx.arc(mx + msw, my - 8 * ms, 5 * ms, Math.PI, 0)
      ctx.fillStyle = pick(c.browns, seed)
      ctx.fill()
    }
  }
}

function drawBush(ctx: Ctx, c: C, type: PlantType, x: number, y: number, s: number, seed: number, sway: number, season: Season) {
  const green = season === 'autumn' ? pick(c.bush.autumn, seed) : pick(c.greens.slice(1), seed)
  const bx = x + sway * 0.3
  if (type === 'round-bush') {
    canopy(ctx, bx, y, s, [[0, -8, 12], [-9, -4, 9], [9, -4, 9], [0, -16, 8]], green)
  } else {
    canopy(ctx, bx, y, s, [[0, -7, 10], [-7, -3, 8], [7, -3, 8]], green)
    for (const [ox, oy] of [[-5, -10], [3, -12], [8, -6], [-8, -5], [0, -4]]) {
      blob(ctx, bx + ox * s, y + oy * s, 2.1 * s, c.berry)
      blob(ctx, bx + ox * s - 0.6 * s, y + oy * s - 0.6 * s, 0.8 * s, alpha(c.white, 0.6))
    }
  }
}

export function drawPlant(ctx: Ctx, c: C, type: PlantType, x: number, y: number, s: number, seed: number, sway: number, season: Season) {
  switch (categoryOf(type)) {
    case 'flower':
      return drawFlower(ctx, c, type, x, y, s, seed, sway)
    case 'tree':
      return drawTree(ctx, c, type, x, y, s, seed, sway, season)
    case 'stone':
      return drawStone(ctx, c, type, x, y, s, seed)
    case 'mushroom':
      return drawMushroom(ctx, c, type, x, y, s, seed, sway)
    case 'bush':
      return drawBush(ctx, c, type, x, y, s, seed, sway, season)
  }
}

function drawStars(ctx: Ctx, c: C, w: number, h: number, time: number, brightness: number) {
  for (let i = 0; i < 46; i++) {
    const sx = (((i * 7919 + 104729) % 1000) / 1000) * w
    const sy = (((i * 6271 + 87119) % 1000) / 1000) * (h * (GROUND_TOP - 0.05))
    const twinkle = (0.45 + Math.sin(time * 0.001 + i * 2.3) * 0.2) * brightness
    blob(ctx, sx, sy, 1 + (i % 3) * 0.5, alpha(c.star, twinkle))
  }
}

/**
 * `sit` is the sky ink's cross-fade towards the sit-down light, 0 to 1 (1,600 ms when someone sits,
 * instant in Quiet). `drift` is how far the sun has slowly sunk since, 0 to 1 over the whole sit.
 */
export function drawSky(ctx: Ctx, c: C, w: number, h: number, tod: TimeOfDay, time: number, sit: number, drift: number) {
  const horizon = h * GROUND_TOP
  const colors = c.sky[tod]
  const top = blend(colors.top, c.sitSky[tod].top, sit)
  const grad = ctx.createLinearGradient(0, 0, 0, horizon + h * 0.05)
  grad.addColorStop(0, top)
  grad.addColorStop(1, blend(colors.bottom, c.sitSky[tod].bottom, sit))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, horizon + h * 0.05)

  if (tod === 'night') drawStars(ctx, c, w, h, time, 1 + sit * 0.4)
  if (tod === 'evening') drawStars(ctx, c, w, h, time, Math.max(0, drift - 0.4) * 1.6)

  // By day the sun sinks towards the hills; in the evening it sets behind them.
  const orbX = w * (tod === 'morning' ? 0.2 : tod === 'evening' ? 0.8 : 0.72)
  const restY = horizon * (tod === 'day' ? 0.38 : 0.62)
  const setY = horizon * (tod === 'day' ? 0.8 : tod === 'evening' ? 1.15 : 0.62)
  const orbY = restY + (setY - restY) * drift
  const orbR = Math.max(14, Math.min(w, h) * 0.05)
  const glowColour = tod === 'night' ? c.moon : c.glow
  const glow = ctx.createRadialGradient(orbX, orbY, orbR * 0.5, orbX, orbY, orbR * 3)
  glow.addColorStop(0, alpha(glowColour, tod === 'night' ? 0.25 + sit * 0.15 : 0.55))
  glow.addColorStop(1, alpha(glowColour, 0))
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(orbX, orbY, orbR * 3, 0, Math.PI * 2)
  ctx.fill()
  blob(ctx, orbX, orbY, orbR, tod === 'night' ? c.moon : tod === 'day' ? blend(c.sun, c.sunLow, sit) : c.sunSet)
  if (tod === 'night') blob(ctx, orbX + orbR * 0.4, orbY - orbR * 0.2, orbR * 0.85, top)

  // Clouds drift very slowly; in Quiet and with reduced motion the clock is frozen and they rest.
  if (tod !== 'night') {
    ctx.fillStyle = tod === 'day' ? blend(c.cloud, c.cloudDusk, sit) : c.cloud
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
  ctx.fillStyle = tod === 'night' ? c.hill.night : blend(c.hill.day, tod === 'evening' ? c.hill.sitEvening : c.hill.sitDay, sit)
  ctx.fill()
}

export function drawGround(ctx: Ctx, c: C, w: number, h: number, tod: TimeOfDay, season: Season, trees: readonly Plant[], sit: number) {
  const horizon = h * GROUND_TOP
  const base = tod === 'night' ? c.nightGround : c.ground[season]
  const grad = ctx.createLinearGradient(0, horizon, 0, h)
  base.forEach((color, i) => grad.addColorStop([0, 0.4, 1][i], blend(color, c.sitGround[tod][i], sit * 0.85)))
  ctx.fillStyle = grad
  ctx.fillRect(0, horizon, w, h - horizon)

  ctx.strokeStyle = tod === 'night' ? alpha(c.greens[0], 0.2) : alpha(c.greens[4], 0.16)
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
        ctx.fillStyle = pick(c.canopy.autumn, (i * 0.27 + t.colorSeed) % 1)
        ctx.fill()
      }
    }
  }
}

/** A butterfly by day, a firefly at night. */
export function drawVisitor(ctx: Ctx, c: C, kind: 'butterfly' | 'firefly', x: number, y: number, k: number, i: number, time: number, still: boolean) {
  if (kind === 'firefly') {
    const glowAmount = still ? 0.8 : 0.55 + Math.sin(time * 0.002 + i * 2) * 0.3
    const r = 10 * Math.sqrt(k)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, alpha(c.firefly, glowAmount))
    g.addColorStop(1, alpha(c.firefly, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    blob(ctx, x, y, 2 * Math.sqrt(k), c.fireflyCore)
    return
  }
  const open = still ? 0.85 : 0.35 + Math.abs(Math.sin(time * 0.009 + i)) * 0.65
  const s = 1.1 * k
  const color = c.petals[(i * 2 + 1) % c.petals.length]
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
  ctx.strokeStyle = c.body
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, y - 5 * s)
  ctx.lineTo(x, y + 5 * s)
  ctx.stroke()
}

/** Soft light over the plants while sitting: warm sun by day, a cool hush at dusk and night. */
export function drawSitLight(ctx: Ctx, c: C, w: number, h: number, tod: TimeOfDay, sit: number) {
  if (sit <= 0) return
  const horizon = h * GROUND_TOP
  if (tod === 'day' || tod === 'morning') {
    const sun = ctx.createRadialGradient(w * (tod === 'day' ? 0.72 : 0.2), horizon * 0.8, 0, w * 0.5, horizon, Math.max(w, h))
    sun.addColorStop(0, alpha(c.light, 0.28 * sit))
    sun.addColorStop(1, alpha(c.light, 0))
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.fillStyle = alpha(c.coolWash, (tod === 'evening' ? 0.22 : 0.12) * sit)
    ctx.fillRect(0, horizon, w, h - horizon)
  }
  const vignette = ctx.createRadialGradient(w / 2, h * 0.6, Math.min(w, h) * 0.35, w / 2, h * 0.6, Math.max(w, h) * 0.75)
  vignette.addColorStop(0, alpha(c.vignette, 0))
  vignette.addColorStop(1, alpha(c.vignette, 0.2 * sit))
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

/** A dashed ring on a plant or a spot: the garden's ink for what you have chosen, rind for what is only offered. */
export function drawMarker(ctx: Ctx, c: C, x: number, y: number, rx: number, ry: number, chosen: boolean) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.strokeStyle = alpha(c.halo, 0.95)
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = chosen ? c.accent : c.suggestEdge
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
export function drawNewGrowth(ctx: Ctx, c: C, category: PlantCategory, x: number, y: number, s: number, amount: number, tod: TimeOfDay) {
  if (amount <= 0) return
  const { lift, r } = GLOW_REACH[category]
  const cy = y - lift * s
  const radius = r * s
  const color = tod === 'night' ? c.firefly : c.suggest
  const g = ctx.createRadialGradient(x, cy, 0, x, cy, radius)
  g.addColorStop(0, alpha(color, 0.5 * amount))
  g.addColorStop(0.55, alpha(color, 0.22 * amount))
  g.addColorStop(1, alpha(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, cy, radius, 0, Math.PI * 2)
  ctx.fill()
}
