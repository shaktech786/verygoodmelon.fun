// ========================================
// THE SHAPESHIFTER — Game Engine
// ========================================
// A small arcade game that gains one composable rule per wave.
// Nothing in it can hurt the player: shadows only nudge, tides only carry,
// and light turns shadows into stars. All functions mutate a GameState.

import type { GameState, Entity, ProfileSummary, PlayStyle } from './types'
import {
  GAME_W, GAME_H, DEFAULT_PARAMS,
  WAVE_DURATION, WAVE_SCORE, MAX_WAVES,
} from './types'
import type { Palette, Tint } from './palette'
import { withAlpha } from './palette'

const KEY_STEER_REACH = 70
const NUDGE_SPEED = 260
const NUDGE_COOLDOWN = 0.6
const DRIFT_DECAY = 0.02
const TIDE_CARRY = 0.9
const TIDE_HALF_WIDTH = 10
const TRANSFORM_SCORE = 5
const BLOOM_BREATH_HZ = 0.25
const MAX_CHAIN_LEVEL = 4
const SHADOW_SHY_RANGE = 90
const SHADOW_WANDER = 0.5
const SHADOW_EXIT_MARGIN = 40
// A star made from a shadow stays long enough to be seen before light can gather it
const NEW_STAR_SETTLE = 0.8

// ==========================================
// STATE CREATION
// ==========================================

export function createState(w: number = GAME_W, h: number = GAME_H): GameState {
  return {
    w,
    h,
    px: w / 2,
    py: h / 2,
    pvx: 0,
    pvy: 0,
    driftX: 0,
    driftY: 0,
    pSize: 12,
    pBaseSize: 12,
    pTrail: [],
    invTimer: 0,
    entities: [],
    particles: [],
    nextId: 1,
    score: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    wave: 0,
    waveTime: 0,
    waveScoreStart: 0,
    activeMechanics: [],
    mechanicParams: {},
    shootCD: 0,
    dashCD: 0,
    dashActive: false,
    dashDuration: 0,
    comboTimer: 0,
    rushTimer: 0,
    rushActive: false,
    keys: new Set(),
    mx: w / 2,
    my: h / 2,
    mDown: false,
    clickThisFrame: false,
    moveDistTotal: 0,
    collectTotal: 0,
    transformed: 0,
    nudges: 0,
    clickTotal: 0,
    moveBias: [0, 0, 0, 0],
    spawnTimers: {},
    totalTime: 0,
  }
}

// ==========================================
// MAIN UPDATE
// ==========================================

export function update(s: GameState, dt: number): void {
  if (dt > 0.1) dt = 0.1
  s.totalTime += dt
  s.waveTime += dt

  // Wave 0: the orb can only be pulsed
  if (s.wave === 0 && s.activeMechanics.length === 0) {
    updateClickPhase(s)
  }

  if (s.pSize > s.pBaseSize) {
    s.pSize = Math.max(s.pBaseSize, s.pSize - dt * 25)
  }

  for (const id of s.activeMechanics) {
    const fn = MECHANIC_UPDATES[id]
    if (fn) fn(s, dt)
  }

  // Nudges and currents ride on top of whichever movement rule is active
  s.px += s.driftX * dt
  s.py += s.driftY * dt
  const decay = Math.pow(DRIFT_DECAY, dt)
  s.driftX *= decay
  s.driftY *= decay

  for (const e of s.entities) {
    if (!e.active) continue
    e.x += e.vx * dt
    e.y += e.vy * dt
    e.age += dt
    if (e.type === 'bullet' && (e.x < -20 || e.x > s.w + 20 || e.y < -20 || e.y > s.h + 20)) {
      e.active = false
    }
  }

  checkCollisions(s)

  s.entities = s.entities.filter(e => e.active)

  for (const p of s.particles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
    p.alpha = Math.max(0, p.life / p.maxLife)
  }
  s.particles = s.particles.filter(p => p.life > 0)

  updateTrail(s, dt)

  if (s.invTimer > 0) s.invTimer -= dt
  if (s.shootCD > 0) s.shootCD -= dt

  const margin = s.pSize
  s.px = clamp(s.px, margin, s.w - margin)
  s.py = clamp(s.py, margin, s.h - margin)

  s.clickThisFrame = false
}

// ==========================================
// MAIN RENDER
// ==========================================

export function render(ctx: CanvasRenderingContext2D, s: GameState, palette: Palette, reducedMotion = false): void {
  ctx.save()

  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, s.w, s.h)

  // A quiet field of dots instead of grid lines
  ctx.fillStyle = palette.grid
  for (let x = 40; x < s.w; x += 40) {
    for (let y = 40; y < s.h; y += 40) {
      ctx.fillRect(x - 1, y - 1, 2, 2)
    }
  }

  if (s.rushActive) renderBloom(ctx, s, palette, reducedMotion)

  for (const e of s.entities) {
    if (e.active) renderEntity(ctx, e, s, palette, reducedMotion)
  }

  for (const t of s.pTrail) {
    ctx.globalAlpha = t.alpha * 0.35
    ctx.fillStyle = palette.orbGlow
    ctx.beginPath()
    ctx.arc(t.x, t.y, s.pBaseSize * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  if (s.activeMechanics.includes('gravity_well')) {
    ctx.strokeStyle = withAlpha(palette.orbGlow, 0.5)
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.arc(s.px, s.py, getParam(s, 'gravity_well', 'range'), 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }

  if (s.activeMechanics.includes('combo_chain') && s.combo > 0) {
    ctx.strokeStyle = palette.ring
    ctx.lineWidth = 2
    ctx.globalAlpha = Math.min(0.25 + s.combo / 12, 0.8)
    ctx.beginPath()
    ctx.arc(s.px, s.py, s.pSize + 6 + s.multiplier * 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  if (s.dashActive) {
    ctx.globalAlpha = 0.35
    ctx.fillStyle = palette.glide
    ctx.beginPath()
    ctx.arc(s.px, s.py, s.pSize * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  renderPlayer(ctx, s, palette)

  for (const p of s.particles) {
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = palette[p.tint]
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  if (s.activeMechanics.includes('phase_dash')) {
    const ready = s.dashCD <= 0
    ctx.fillStyle = ready ? palette.text : palette.textDim
    ctx.font = '13px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(ready ? 'glide ready' : 'gathering…', s.w - 14, s.h - 16)
  }

  ctx.restore()
}

function renderBloom(ctx: CanvasRenderingContext2D, s: GameState, palette: Palette, reducedMotion: boolean): void {
  const breath = reducedMotion ? 0.5 : 0.5 + Math.sin(s.totalTime * Math.PI * 2 * BLOOM_BREATH_HZ) * 0.2
  ctx.strokeStyle = palette.bloom
  ctx.lineWidth = 4
  ctx.globalAlpha = breath
  ctx.strokeRect(2, 2, s.w - 4, s.h - 4)
  ctx.globalAlpha = 1
}

// ==========================================
// ENTITY RENDERING
// ==========================================

function renderEntity(ctx: CanvasRenderingContext2D, e: Entity, s: GameState, palette: Palette, reducedMotion: boolean): void {
  ctx.save()

  if (e.type === 'star') {
    ctx.globalAlpha = e.alpha
    ctx.fillStyle = palette.star
    ctx.strokeStyle = palette.starEdge
    ctx.lineWidth = 1.5
    drawStar(ctx, e.x, e.y, e.size, 5)
    ctx.fill()
    ctx.stroke()
  }

  if (e.type === 'gem') {
    ctx.globalAlpha = Math.max(0.15, e.alpha)
    ctx.fillStyle = palette.gem
    ctx.strokeStyle = palette.gemEdge
    ctx.lineWidth = 1.5
    drawDiamond(ctx, e.x, e.y, e.size * (0.85 + e.alpha * 0.15))
    ctx.fill()
    ctx.stroke()
  }

  if (e.type === 'chaser') {
    // A shy, round shadow with two eyes that look at the orb
    const wobble = reducedMotion ? 0 : Math.sin(s.totalTime * 2 + e.id) * 1
    ctx.fillStyle = palette.shadow
    ctx.beginPath()
    ctx.arc(e.x, e.y + wobble, e.size + 2, 0, Math.PI * 2)
    ctx.fill()
    const d = Math.max(1, dist(e.x, e.y, s.px, s.py))
    const lx = ((s.px - e.x) / d) * 2
    const ly = ((s.py - e.y) / d) * 2
    ctx.fillStyle = palette.bg
    ctx.beginPath()
    ctx.arc(e.x - 3 + lx, e.y - 2 + ly + wobble, 1.8, 0, Math.PI * 2)
    ctx.arc(e.x + 3 + lx, e.y - 2 + ly + wobble, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }

  if (e.type === 'sweeper') {
    const isVertical = Math.abs(e.vx) > 0
    ctx.strokeStyle = palette.tide
    ctx.lineWidth = TIDE_HALF_WIDTH * 2
    ctx.globalAlpha = 0.18
    ctx.beginPath()
    if (isVertical) {
      ctx.moveTo(e.x, 0)
      ctx.lineTo(e.x, s.h)
    } else {
      ctx.moveTo(0, e.y)
      ctx.lineTo(s.w, e.y)
    }
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    if (isVertical) {
      ctx.moveTo(e.x, 0)
      ctx.lineTo(e.x, s.h)
    } else {
      ctx.moveTo(0, e.y)
      ctx.lineTo(s.w, e.y)
    }
    ctx.stroke()
  }

  if (e.type === 'bullet') {
    ctx.fillStyle = palette.light
    ctx.strokeStyle = palette.starEdge
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
}

function renderPlayer(ctx: CanvasRenderingContext2D, s: GameState, palette: Palette): void {
  ctx.save()
  ctx.shadowBlur = 18
  ctx.shadowColor = palette.orbGlow
  ctx.fillStyle = s.dashActive ? palette.glide : palette.orb
  ctx.beginPath()
  ctx.arc(s.px, s.py, s.pSize, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.fillStyle = palette.orbGlow
  ctx.beginPath()
  ctx.arc(s.px - s.pSize * 0.25, s.py - s.pSize * 0.25, s.pSize * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ==========================================
// SHAPE HELPERS
// ==========================================

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points: number): void {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2
    const radius = i % 2 === 0 ? r : r * 0.45
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx + r * 0.7, cy)
  ctx.lineTo(cx, cy + r)
  ctx.lineTo(cx - r * 0.7, cy)
  ctx.closePath()
}

// ==========================================
// CLICK PHASE (Wave 0)
// ==========================================

function updateClickPhase(s: GameState): void {
  if (!s.clickThisFrame) return
  const d = dist(s.mx, s.my, s.px, s.py)
  if (d < s.pSize * 4) {
    s.score += 1
    s.clickTotal += 1
    s.pSize = s.pBaseSize + 6
    burst(s, s.px, s.py, 'orb', 8)
  }
}

// ==========================================
// TRAIL
// ==========================================

function updateTrail(s: GameState, dt: number): void {
  const hasMovement = s.activeMechanics.some(m => m === 'arrow_keys' || m === 'mouse_follow')
  if (hasMovement) {
    const speed = Math.sqrt(s.pvx * s.pvx + s.pvy * s.pvy)
    if (speed > 10) {
      s.pTrail.push({ x: s.px, y: s.py, alpha: 0.5 })
      if (s.pTrail.length > 25) s.pTrail.shift()
    }
  }
  for (const t of s.pTrail) t.alpha -= dt * 1.5
  s.pTrail = s.pTrail.filter(t => t.alpha > 0.01)
}

// ==========================================
// COLLISIONS
// ==========================================

function checkCollisions(s: GameState): void {
  for (const e of s.entities) {
    if (!e.active) continue

    if (e.type === 'star' || e.type === 'gem') {
      if (e.type === 'gem' && e.alpha < 0.4) continue
      if (dist(s.px, s.py, e.x, e.y) < s.pSize + e.size) collectItem(s, e)
      continue
    }

    if (e.type === 'chaser') {
      if (dist(s.px, s.py, e.x, e.y) >= s.pSize + e.size) continue
      if (s.dashActive) transformShadow(s, e)
      else if (s.invTimer <= 0) nudge(s, e)
      continue
    }

    if (e.type === 'sweeper') {
      const isVertical = Math.abs(e.vx) > 0
      const inside = isVertical
        ? Math.abs(s.px - e.x) < s.pSize + TIDE_HALF_WIDTH
        : Math.abs(s.py - e.y) < s.pSize + TIDE_HALF_WIDTH
      if (!inside) continue
      // Carried along rather than hurt; counted once per tide
      s.driftX = e.vx * TIDE_CARRY
      s.driftY = e.vy * TIDE_CARRY
      if (e.hp > 0) {
        e.hp = 0
        s.nudges++
      }
      continue
    }

    if (e.type === 'bullet') {
      for (const other of s.entities) {
        if (!other.active || other === e || dist(e.x, e.y, other.x, other.y) >= e.size + other.size) continue
        if (other.type === 'chaser') transformShadow(s, other)
        else if ((other.type === 'star' || other.type === 'gem') && other.age > NEW_STAR_SETTLE) collectItem(s, other)
        else continue
        e.active = false
        break
      }
    }
  }
}

function collectItem(s: GameState, e: Entity): void {
  const baseValue = e.type === 'star'
    ? getParam(s, 'stars', 'value')
    : getParam(s, 'pulse_gems', 'value')
  s.score += baseValue * s.multiplier
  s.collectTotal++
  e.active = false
  burst(s, e.x, e.y, e.type === 'star' ? 'star' : 'gem', 6)
  extendCombo(s)
}

/** Light reaching a shadow turns it into a star where it stood. */
function transformShadow(s: GameState, e: Entity): void {
  e.active = false
  s.transformed++
  s.score += TRANSFORM_SCORE * s.multiplier
  burst(s, e.x, e.y, 'light', 10)
  spawnCollectible(s, 'star', clamp(e.x, 30, s.w - 30), clamp(e.y, 30, s.h - 30))
  extendCombo(s)
}

function nudge(s: GameState, e: Entity): void {
  const d = Math.max(1, dist(s.px, s.py, e.x, e.y))
  const nx = (s.px - e.x) / d
  const ny = (s.py - e.y) / d
  s.driftX = nx * NUDGE_SPEED
  s.driftY = ny * NUDGE_SPEED
  // The shadow backs off too, so it does not sit on the orb
  e.x -= nx * 30
  e.y -= ny * 30
  s.invTimer = NUDGE_COOLDOWN
  s.nudges++
  burst(s, s.px - nx * s.pSize, s.py - ny * s.pSize, 'shadow', 6)
}

function extendCombo(s: GameState): void {
  if (!s.activeMechanics.includes('combo_chain')) return
  s.combo++
  s.comboTimer = getParam(s, 'combo_chain', 'decayTime')
  if (s.combo > s.maxCombo) s.maxCombo = s.combo
  refreshMultiplier(s)
}

// The bloom bonus has to survive chain changes, so the multiplier is always derived from both.
function refreshMultiplier(s: GameState): void {
  const chainLevel = s.activeMechanics.includes('combo_chain')
    ? Math.min(MAX_CHAIN_LEVEL, 1 + Math.floor(s.combo / getParam(s, 'combo_chain', 'hitsPerLevel')))
    : 1
  const bloom = s.rushActive ? getParam(s, 'score_rush', 'scoreMult') : 1
  s.multiplier = chainLevel * bloom
}

// ==========================================
// MECHANIC UPDATES
// ==========================================

function heldDirection(s: GameState): [number, number] {
  let ax = 0, ay = 0
  if (s.keys.has('ArrowLeft') || s.keys.has('a')) ax = -1
  if (s.keys.has('ArrowRight') || s.keys.has('d')) ax = 1
  if (s.keys.has('ArrowUp') || s.keys.has('w')) ay = -1
  if (s.keys.has('ArrowDown') || s.keys.has('s')) ay = 1
  return [ax, ay]
}

function isActionHeld(s: GameState): boolean {
  return s.keys.has(' ') || s.mDown
}

function updateArrowKeys(s: GameState, dt: number): void {
  const speed = getParam(s, 'arrow_keys', 'speed')
  let [ax, ay] = heldDirection(s)
  if (ax < 0) s.moveBias[0]++
  if (ax > 0) s.moveBias[1]++
  if (ay < 0) s.moveBias[2]++
  if (ay > 0) s.moveBias[3]++

  if (ax !== 0 && ay !== 0) {
    ax *= 0.707
    ay *= 0.707
  }

  s.pvx += ax * speed * 8 * dt
  s.pvy += ay * speed * 8 * dt
  s.pvx *= Math.pow(0.001, dt)
  s.pvy *= Math.pow(0.001, dt)

  const prevX = s.px, prevY = s.py
  s.px += s.pvx * dt
  s.py += s.pvy * dt
  s.moveDistTotal += dist(prevX, prevY, s.px, s.py)

  const spd = Math.sqrt(s.pvx * s.pvx + s.pvy * s.pvy)
  if (spd > 20) s.score += 0.02 * dt * s.multiplier
}

function updateMouseFollow(s: GameState, dt: number): void {
  const resp = getParam(s, 'mouse_follow', 'responsiveness')

  // Keyboard-only players steer by pushing the follow target ahead of the orb
  const [ax, ay] = heldDirection(s)
  if (ax !== 0 || ay !== 0) {
    s.mx = clamp(s.px + ax * KEY_STEER_REACH, 0, s.w)
    s.my = clamp(s.py + ay * KEY_STEER_REACH, 0, s.h)
  }

  const dx = s.mx - s.px
  const dy = s.my - s.py
  const d = Math.sqrt(dx * dx + dy * dy)

  if (d > 2) {
    const targetSpeed = Math.min(d * resp, 280)
    s.pvx = (dx / d) * targetSpeed
    s.pvy = (dy / d) * targetSpeed
  } else {
    s.pvx *= 0.9
    s.pvy *= 0.9
  }

  const prevX = s.px, prevY = s.py
  s.px += s.pvx * dt
  s.py += s.pvy * dt
  s.moveDistTotal += dist(prevX, prevY, s.px, s.py)

  if (s.pvx < -10) s.moveBias[0]++
  if (s.pvx > 10) s.moveBias[1]++
  if (s.pvy < -10) s.moveBias[2]++
  if (s.pvy > 10) s.moveBias[3]++

  const spd = Math.sqrt(s.pvx * s.pvx + s.pvy * s.pvy)
  if (spd > 20) s.score += 0.01 * dt * s.multiplier
}

function bloomMult(s: GameState): number {
  return s.rushActive ? getParam(s, 'score_rush', 'spawnMult') : 1
}

function updateStars(s: GameState, dt: number): void {
  const rate = getParam(s, 'stars', 'spawnRate')
  s.spawnTimers.stars = (s.spawnTimers.stars || 0) + dt
  if (s.spawnTimers.stars > rate / bloomMult(s)) {
    spawnCollectible(s, 'star')
    s.spawnTimers.stars = 0
  }

  for (const e of s.entities) {
    if (e.type !== 'star' || !e.active) continue
    e.y += Math.sin(s.totalTime * 2 + e.id * 0.7) * 0.3
    e.alpha = 0.85 + Math.sin(s.totalTime * 3 + e.id) * 0.15
    if (e.age > 12) {
      e.alpha *= Math.max(0, 1 - (e.age - 12) / 3)
      if (e.age > 15) e.active = false
    }
  }
}

function updatePulseGems(s: GameState, dt: number): void {
  const rate = getParam(s, 'pulse_gems', 'spawnRate')
  const pulseSpeed = getParam(s, 'pulse_gems', 'pulseSpeed')
  s.spawnTimers.gems = (s.spawnTimers.gems || 0) + dt
  if (s.spawnTimers.gems > rate / bloomMult(s)) {
    spawnCollectible(s, 'gem')
    s.spawnTimers.gems = 0
  }

  for (const e of s.entities) {
    if (e.type !== 'gem' || !e.active) continue
    // Starts bright and breathes slowly, glowing for more than half of each cycle
    e.alpha = 0.55 + Math.cos(e.age * pulseSpeed * Math.PI) * 0.45
    if (e.age > 12) e.active = false
  }
}

function updateChasers(s: GameState, dt: number): void {
  const p = s.mechanicParams.chasers || DEFAULT_PARAMS.chasers
  s.spawnTimers.chasers = (s.spawnTimers.chasers || 0) + dt
  const shadowCount = s.entities.filter(e => e.type === 'chaser' && e.active).length

  if (!s.rushActive && s.spawnTimers.chasers > p.spawnRate && shadowCount < p.maxCount) {
    const side = Math.floor(Math.random() * 4)
    let x: number, y: number
    if (side === 0) { x = -15; y = Math.random() * s.h }
    else if (side === 1) { x = s.w + 15; y = Math.random() * s.h }
    else if (side === 2) { x = Math.random() * s.w; y = -15 }
    else { x = Math.random() * s.w; y = s.h + 15 }
    // Each shadow heads for its own spot somewhere in the field, not for the orb
    const tx = s.w * (0.2 + Math.random() * 0.6)
    const ty = s.h * (0.2 + Math.random() * 0.6)
    const d = Math.max(1, dist(x, y, tx, ty))
    s.entities.push({
      id: s.nextId++, type: 'chaser', x, y,
      vx: ((tx - x) / d) * p.speed, vy: ((ty - y) / d) * p.speed,
      size: 8, alpha: 1, active: true, age: 0, hp: 1,
    })
    s.spawnTimers.chasers = 0
  }

  for (const e of s.entities) {
    if (e.type !== 'chaser' || !e.active) continue
    // A slow, curving drift that never turns toward the orb; close by, a shadow only slows down to look
    const heading = Math.atan2(e.vy, e.vx) + Math.sin(s.totalTime * 0.7 + e.id) * SHADOW_WANDER * dt
    const shy = dist(s.px, s.py, e.x, e.y) < SHADOW_SHY_RANGE ? 0.5 : 1
    e.vx = Math.cos(heading) * p.speed * shy
    e.vy = Math.sin(heading) * p.speed * shy
    const outside = e.x < -SHADOW_EXIT_MARGIN || e.x > s.w + SHADOW_EXIT_MARGIN
      || e.y < -SHADOW_EXIT_MARGIN || e.y > s.h + SHADOW_EXIT_MARGIN
    if (outside && e.age > 3) e.active = false
  }
}

function updateSweepers(s: GameState, dt: number): void {
  const p = s.mechanicParams.sweepers || DEFAULT_PARAMS.sweepers
  s.spawnTimers.sweepers = (s.spawnTimers.sweepers || 0) + dt

  if (!s.rushActive && s.spawnTimers.sweepers > p.spawnRate) {
    const isVertical = Math.random() > 0.5
    const fromStart = Math.random() > 0.5
    s.entities.push({
      id: s.nextId++,
      type: 'sweeper',
      x: isVertical ? (fromStart ? -10 : s.w + 10) : 0,
      y: isVertical ? 0 : (fromStart ? -10 : s.h + 10),
      vx: isVertical ? (fromStart ? p.speed : -p.speed) : 0,
      vy: isVertical ? 0 : (fromStart ? p.speed : -p.speed),
      size: TIDE_HALF_WIDTH,
      alpha: 1,
      active: true,
      age: 0,
      hp: 1,
    })
    s.spawnTimers.sweepers = 0
  }

  for (const e of s.entities) {
    if (e.type !== 'sweeper' || !e.active) continue
    if (Math.abs(e.vx) > 0) {
      if ((e.vx > 0 && e.x > s.w + 20) || (e.vx < 0 && e.x < -20)) e.active = false
    } else if ((e.vy > 0 && e.y > s.h + 20) || (e.vy < 0 && e.y < -20)) {
      e.active = false
    }
  }
}

function updateBlaster(s: GameState): void {
  const p = s.mechanicParams.blaster || DEFAULT_PARAMS.blaster
  if (!isActionHeld(s) || s.shootCD > 0) return

  let dx = s.mx - s.px
  let dy = s.my - s.py
  let d = Math.sqrt(dx * dx + dy * dy)
  if (d < 5) {
    dx = s.pvx
    dy = s.pvy
    d = Math.sqrt(dx * dx + dy * dy)
  }
  if (d < 1) { dx = 1; dy = 0; d = 1 }

  s.entities.push({
    id: s.nextId++,
    type: 'bullet',
    x: s.px + (dx / d) * (s.pSize + 4),
    y: s.py + (dy / d) * (s.pSize + 4),
    vx: (dx / d) * p.bulletSpeed,
    vy: (dy / d) * p.bulletSpeed,
    size: p.bulletSize,
    alpha: 1,
    active: true,
    age: 0,
    hp: 1,
  })
  s.shootCD = p.fireRate
  burst(s, s.px, s.py, 'light', 3)
}

function updatePhaseDash(s: GameState, dt: number): void {
  const p = s.mechanicParams.phase_dash || DEFAULT_PARAMS.phase_dash
  if (s.dashCD > 0) s.dashCD -= dt

  if (s.dashActive) {
    s.dashDuration -= dt
    if (s.dashDuration <= 0) {
      s.dashActive = false
      burst(s, s.px, s.py, 'glide', 6)
    }
  }

  if (isActionHeld(s) && s.dashCD <= 0 && !s.dashActive) {
    s.dashActive = true
    s.dashDuration = p.duration
    s.dashCD = p.cooldown
    const spd = Math.sqrt(s.pvx * s.pvx + s.pvy * s.pvy)
    if (spd > 5) {
      s.pvx = (s.pvx / spd) * 350 * p.speedMult
      s.pvy = (s.pvy / spd) * 350 * p.speedMult
    } else {
      const dx = s.mx - s.px
      const dy = s.my - s.py
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > 1) {
        s.pvx = (dx / d) * 350
        s.pvy = (dy / d) * 350
      }
    }
    burst(s, s.px, s.py, 'glide', 10)
  }
}

function updateComboChain(s: GameState, dt: number): void {
  if (s.combo <= 0) return
  s.comboTimer -= dt
  if (s.comboTimer > 0) return
  // A pause costs one level, not the whole chain
  s.combo = Math.max(0, s.combo - getParam(s, 'combo_chain', 'hitsPerLevel'))
  s.comboTimer = getParam(s, 'combo_chain', 'decayTime')
  refreshMultiplier(s)
}

function updateGravityWell(s: GameState, dt: number): void {
  const range = getParam(s, 'gravity_well', 'range')
  const strength = getParam(s, 'gravity_well', 'strength')
  for (const e of s.entities) {
    if (!e.active || (e.type !== 'star' && e.type !== 'gem')) continue
    const dx = s.px - e.x
    const dy = s.py - e.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < range && d > 1) {
      const force = ((range - d) / range) * strength
      e.vx += (dx / d) * force * dt
      e.vy += (dy / d) * force * dt
    }
  }
}

function updateScoreRush(s: GameState, dt: number): void {
  if (s.rushActive) s.rushTimer -= dt
}

const MECHANIC_UPDATES: Record<string, (s: GameState, dt: number) => void> = {
  arrow_keys: updateArrowKeys,
  mouse_follow: updateMouseFollow,
  stars: updateStars,
  pulse_gems: updatePulseGems,
  chasers: updateChasers,
  sweepers: updateSweepers,
  blaster: updateBlaster,
  phase_dash: updatePhaseDash,
  combo_chain: updateComboChain,
  gravity_well: updateGravityWell,
  score_rush: updateScoreRush,
}

// ==========================================
// MECHANIC ACTIVATION
// ==========================================

export function activateMechanic(s: GameState, mechanicId: string, params: Record<string, number>): void {
  if (s.activeMechanics.includes(mechanicId)) return

  const merged = { ...(DEFAULT_PARAMS[mechanicId] || {}), ...params }
  s.mechanicParams[mechanicId] = merged
  s.activeMechanics.push(mechanicId)

  if (mechanicId === 'score_rush') {
    s.rushActive = true
    s.rushTimer = merged.duration
    bloomAway(s)
  }
  refreshMultiplier(s)
}

/** The bloom opens by turning every shadow into a star and letting every tide fade. */
function bloomAway(s: GameState): void {
  for (const e of s.entities) {
    if (!e.active) continue
    if (e.type === 'chaser') {
      e.active = false
      spawnCollectible(s, 'star', clamp(e.x, 30, s.w - 30), clamp(e.y, 30, s.h - 30))
      burst(s, e.x, e.y, 'light', 8)
    } else if (e.type === 'sweeper') {
      e.active = false
    }
  }
  s.entities = s.entities.filter(e => e.active)
}

// ==========================================
// GAME STATE QUERIES
// ==========================================

export function shouldMutate(s: GameState): boolean {
  if (s.wave >= MAX_WAVES - 1) return false
  return s.waveTime >= WAVE_DURATION[s.wave] || (s.score - s.waveScoreStart) >= WAVE_SCORE[s.wave]
}

export function isGameComplete(s: GameState): boolean {
  if (s.wave < MAX_WAVES - 1) return false
  if (s.rushActive) return s.rushTimer <= 0
  return s.waveTime >= WAVE_DURATION[s.wave]
}

export function advanceWave(s: GameState): void {
  s.wave++
  s.waveTime = 0
  s.waveScoreStart = s.score
}

export function getProfileSummary(s: GameState): ProfileSummary {
  const time = Math.max(s.totalTime, 1)
  const dirs = ['left', 'right', 'up', 'down'] as const
  const maxBias = Math.max(...s.moveBias)
  const prefDir = maxBias > 0 ? dirs[s.moveBias.indexOf(maxBias)] : 'none'

  const transformRate = s.transformed / time
  const moveRate = s.moveDistTotal / time
  const collectRate = s.collectTotal / time
  let playStyle: PlayStyle = 'gentle'
  if (transformRate > 0.3) playStyle = 'bold'
  else if (moveRate > 100) playStyle = 'explorer'
  else if (collectRate > 0.4) playStyle = 'collector'

  return {
    playStyle,
    clickRate: s.clickTotal / time,
    moveDistance: s.moveDistTotal,
    collectRate,
    transformRate,
    preferredDirection: prefDir,
    score: s.score,
    wave: s.wave,
    activeMechanics: s.activeMechanics,
  }
}

// ==========================================
// HELPERS
// ==========================================

function spawnCollectible(s: GameState, type: 'star' | 'gem', x?: number, y?: number): void {
  const margin = 30
  s.entities.push({
    id: s.nextId++,
    type,
    x: x ?? margin + Math.random() * (s.w - margin * 2),
    y: y ?? margin + Math.random() * (s.h - margin * 2),
    vx: 0,
    vy: 0,
    size: type === 'star' ? 8 : 9,
    alpha: 1,
    active: true,
    age: 0,
    hp: 0,
  })
}

function burst(s: GameState, x: number, y: number, tint: Tint, count: number): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
    const speed = 40 + Math.random() * 100
    s.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.5 + Math.random() * 2.5,
      tint,
      alpha: 1,
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.8,
    })
  }
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

function getParam(s: GameState, mechanic: string, key: string): number {
  return s.mechanicParams[mechanic]?.[key] ?? DEFAULT_PARAMS[mechanic]?.[key] ?? 0
}
