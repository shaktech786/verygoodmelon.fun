// ========================================
// CASCADE — Game Engine
// ========================================
// Self-building arcade game engine with 11 composable mechanics.
// All functions operate on a mutable GameState object.

import type { GameState, Entity, ProfileSummary } from './types'
import {
  GAME_W, GAME_H, COLORS, DEFAULT_PARAMS,
  WAVE_DURATION, WAVE_SCORE, MAX_WAVES,
} from './types'

// ==========================================
// STATE CREATION
// ==========================================

export function createState(): GameState {
  return {
    w: GAME_W,
    h: GAME_H,
    px: GAME_W / 2,
    py: GAME_H / 2,
    pvx: 0,
    pvy: 0,
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
    shieldCharges: 3,
    shieldRechargeTimer: 0,
    dashCD: 0,
    dashActive: false,
    dashDuration: 0,
    comboTimer: 0,
    rushTimer: 0,
    rushActive: false,
    shake: 0,
    keys: new Set(),
    mx: GAME_W / 2,
    my: GAME_H / 2,
    mDown: false,
    clickThisFrame: false,
    moveDistTotal: 0,
    collectTotal: 0,
    killTotal: 0,
    hitsTaken: 0,
    clickTotal: 0,
    moveBias: [0, 0, 0, 0],
    spawnTimers: {},
    totalTime: 0,
    mutations: [],
  }
}

// ==========================================
// MAIN UPDATE
// ==========================================

export function update(s: GameState, dt: number): void {
  if (dt > 0.1) dt = 0.1
  s.totalTime += dt
  s.waveTime += dt

  // Wave 0: click phase (no movement, just clicking the orb)
  if (s.wave === 0 && s.activeMechanics.length === 0) {
    updateClickPhase(s)
  }

  // Player pulse recovery
  if (s.pSize > s.pBaseSize) {
    s.pSize = Math.max(s.pBaseSize, s.pSize - dt * 25)
  }

  // Run active mechanic updates
  for (const id of s.activeMechanics) {
    const fn = MECHANIC_UPDATES[id]
    if (fn) fn(s, dt)
  }

  // Update entities
  for (const e of s.entities) {
    if (!e.active) continue
    e.x += e.vx * dt
    e.y += e.vy * dt
    e.age += dt
    // Remove bullets that leave the screen
    if (e.type === 'bullet') {
      if (e.x < -20 || e.x > s.w + 20 || e.y < -20 || e.y > s.h + 20) {
        e.active = false
      }
    }
  }

  // Collision detection
  checkCollisions(s)

  // Clean up dead entities
  s.entities = s.entities.filter(e => e.active)

  // Update particles
  for (const p of s.particles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
    p.alpha = Math.max(0, p.life / p.maxLife)
  }
  s.particles = s.particles.filter(p => p.life > 0)

  // Update trail
  updateTrail(s, dt)

  // Timers
  if (s.invTimer > 0) s.invTimer -= dt
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 12)
  if (s.shootCD > 0) s.shootCD -= dt

  // Shield recharge
  if (s.activeMechanics.includes('blaster') || s.activeMechanics.includes('phase_dash')) {
    // handled in mechanic updates
  }

  // Clamp player to bounds
  const margin = s.pSize
  s.px = clamp(s.px, margin, s.w - margin)
  s.py = clamp(s.py, margin, s.h - margin)

  // Clear per-frame flags
  s.clickThisFrame = false
}

// ==========================================
// MAIN RENDER
// ==========================================

export function render(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.save()

  // Screen shake
  if (s.shake > 0) {
    const sx = (Math.random() - 0.5) * s.shake * 2
    const sy = (Math.random() - 0.5) * s.shake * 2
    ctx.translate(sx, sy)
  }

  // Background
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(-10, -10, s.w + 20, s.h + 20)

  // Grid
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 0.5
  for (let x = 0; x <= s.w; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, s.h)
    ctx.stroke()
  }
  for (let y = 0; y <= s.h; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(s.w, y)
    ctx.stroke()
  }

  // Mechanic-specific rendering (below player)
  for (const id of s.activeMechanics) {
    const fn = MECHANIC_RENDERS[id]
    if (fn) fn(ctx, s)
  }

  // Entities
  for (const e of s.entities) {
    if (!e.active) continue
    renderEntity(ctx, e, s)
  }

  // Player trail
  for (const t of s.pTrail) {
    ctx.globalAlpha = t.alpha * 0.35
    ctx.fillStyle = COLORS.player
    ctx.beginPath()
    ctx.arc(t.x, t.y, s.pBaseSize * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Player
  renderPlayer(ctx, s)

  // Particles
  for (const p of s.particles) {
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Wave 0 click hint
  if (s.wave === 0 && s.activeMechanics.length === 0) {
    const pulse = Math.sin(s.totalTime * 3) * 0.3 + 0.7
    ctx.globalAlpha = pulse * 0.6
    ctx.fillStyle = COLORS.textDim
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CLICK', s.w / 2, s.h / 2 + 40)
    ctx.globalAlpha = 1
  }

  // Gravity well range indicator
  if (s.activeMechanics.includes('gravity_well')) {
    const range = getParam(s, 'gravity_well', 'range')
    ctx.strokeStyle = 'rgba(0,255,136,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(s.px, s.py, range, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Dash trail effect
  if (s.dashActive) {
    ctx.globalAlpha = 0.4
    ctx.fillStyle = COLORS.dash
    ctx.beginPath()
    ctx.arc(s.px, s.py, s.pSize * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

// ==========================================
// ENTITY RENDERING
// ==========================================

function renderEntity(ctx: CanvasRenderingContext2D, e: Entity, s: GameState): void {
  ctx.save()

  if (e.type === 'star') {
    ctx.shadowBlur = 12
    ctx.shadowColor = COLORS.starGlow
    ctx.globalAlpha = e.alpha
    ctx.fillStyle = COLORS.star
    drawStar(ctx, e.x, e.y, e.size, 5)
    // Sparkle
    const sparkle = Math.sin(s.totalTime * 5 + e.id) * 0.4 + 0.6
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = e.alpha * sparkle * 0.5
    ctx.beginPath()
    ctx.arc(e.x, e.y, e.size * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }

  if (e.type === 'gem') {
    const pulse = Math.sin(e.age * getParam(s, 'pulse_gems', 'pulseSpeed') * Math.PI)
    const alpha = Math.max(0, pulse)
    ctx.shadowBlur = 14
    ctx.shadowColor = COLORS.gemGlow
    ctx.globalAlpha = alpha
    ctx.fillStyle = COLORS.gem
    drawDiamond(ctx, e.x, e.y, e.size)
    e.alpha = alpha // store for collision check
  }

  if (e.type === 'chaser') {
    ctx.shadowBlur = 10
    ctx.shadowColor = COLORS.enemyGlow
    ctx.fillStyle = COLORS.enemy
    ctx.translate(e.x, e.y)
    ctx.rotate(s.totalTime * 2 + e.id)
    ctx.fillRect(-e.size, -e.size, e.size * 2, e.size * 2)
  }

  if (e.type === 'sweeper') {
    const isVertical = Math.abs(e.vx) > 0
    ctx.shadowBlur = 16
    ctx.shadowColor = COLORS.sweeperGlow
    // Wide beam
    ctx.strokeStyle = COLORS.sweeper
    ctx.lineWidth = 16
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    if (isVertical) {
      ctx.moveTo(e.x, 0)
      ctx.lineTo(e.x, s.h)
    } else {
      ctx.moveTo(0, e.y)
      ctx.lineTo(s.w, e.y)
    }
    ctx.stroke()
    // Bright center
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.9
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
    ctx.shadowBlur = 8
    ctx.shadowColor = COLORS.bullet
    ctx.fillStyle = COLORS.bullet
    ctx.beginPath()
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function renderPlayer(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.save()

  // Invincibility blink
  if (s.invTimer > 0 && Math.floor(s.totalTime * 12) % 2 === 0) {
    ctx.restore()
    return
  }

  // Glow
  ctx.shadowBlur = 22
  ctx.shadowColor = s.dashActive ? COLORS.dash : COLORS.player
  ctx.fillStyle = s.dashActive ? COLORS.dash : COLORS.player

  ctx.beginPath()
  ctx.arc(s.px, s.py, s.pSize, 0, Math.PI * 2)
  ctx.fill()

  // Inner bright core
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  ctx.arc(s.px, s.py, s.pSize * 0.35, 0, Math.PI * 2)
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
  ctx.fill()
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx + r * 0.7, cy)
  ctx.lineTo(cx, cy + r)
  ctx.lineTo(cx - r * 0.7, cy)
  ctx.closePath()
  ctx.fill()
}

// ==========================================
// CLICK PHASE (Wave 0)
// ==========================================

function updateClickPhase(s: GameState): void {
  if (!s.clickThisFrame) return
  const dx = s.mx - s.px
  const dy = s.my - s.py
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < s.pSize * 4) { // generous click area
    s.score += 1
    s.clickTotal += 1
    s.pSize = s.pBaseSize + 6 // pulse bigger
    burst(s, s.px, s.py, COLORS.player, 8)
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
  for (const t of s.pTrail) {
    t.alpha -= dt * 1.5
  }
  s.pTrail = s.pTrail.filter(t => t.alpha > 0.01)
}

// ==========================================
// COLLISION DETECTION
// ==========================================

function checkCollisions(s: GameState): void {
  for (const e of s.entities) {
    if (!e.active) continue

    // Player vs collectible
    if (e.type === 'star' || e.type === 'gem') {
      if (e.type === 'gem' && e.alpha < 0.4) continue // pulse gem not visible
      const d = dist(s.px, s.py, e.x, e.y)
      if (d < s.pSize + e.size) {
        collectItem(s, e)
      }
      continue
    }

    // Player vs enemy (chaser / sweeper)
    if (e.type === 'chaser' || e.type === 'sweeper') {
      if (s.invTimer > 0) continue

      let hit = false
      if (e.type === 'chaser') {
        hit = dist(s.px, s.py, e.x, e.y) < s.pSize + e.size
      } else {
        // Sweeper: line collision
        const isVertical = Math.abs(e.vx) > 0
        if (isVertical) {
          hit = Math.abs(s.px - e.x) < s.pSize + 10
        } else {
          hit = Math.abs(s.py - e.y) < s.pSize + 10
        }
      }

      if (hit) {
        if (s.dashActive) {
          killEnemy(s, e)
        } else {
          hitPlayer(s)
        }
      }
      continue
    }

    // Bullet vs enemy
    if (e.type === 'bullet') {
      for (const enemy of s.entities) {
        if (!enemy.active) continue
        if (enemy.type !== 'chaser') continue // bullets only hit chasers
        const d = dist(e.x, e.y, enemy.x, enemy.y)
        if (d < e.size + enemy.size) {
          killEnemy(s, enemy)
          e.active = false
          break
        }
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
  burst(s, e.x, e.y, e.color, 6)

  // Combo chain
  if (s.activeMechanics.includes('combo_chain')) {
    s.combo++
    s.comboTimer = getParam(s, 'combo_chain', 'decayTime')
    const hitsPerLevel = getParam(s, 'combo_chain', 'hitsPerLevel')
    s.multiplier = 1 + Math.floor(s.combo / hitsPerLevel)
    if (s.combo > s.maxCombo) s.maxCombo = s.combo
  }
}

function killEnemy(s: GameState, e: Entity): void {
  s.score += 20 * s.multiplier
  s.killTotal++
  e.active = false
  burst(s, e.x, e.y, COLORS.enemy, 10)
  s.shake = Math.min(s.shake + 2, 6)

  if (s.activeMechanics.includes('combo_chain')) {
    s.combo++
    s.comboTimer = getParam(s, 'combo_chain', 'decayTime')
    const hitsPerLevel = getParam(s, 'combo_chain', 'hitsPerLevel')
    s.multiplier = 1 + Math.floor(s.combo / hitsPerLevel)
    if (s.combo > s.maxCombo) s.maxCombo = s.combo
  }
}

function hitPlayer(s: GameState): void {
  s.score = Math.max(0, s.score - 25)
  s.hitsTaken++
  s.invTimer = 1.0
  s.shake = 5
  burst(s, s.px, s.py, COLORS.enemy, 14)
  // Reset combo
  s.combo = 0
  s.multiplier = 1
  s.comboTimer = 0
}

// ==========================================
// MECHANIC UPDATES
// ==========================================

function updateArrowKeys(s: GameState, dt: number): void {
  const speed = getParam(s, 'arrow_keys', 'speed')
  let ax = 0, ay = 0
  if (s.keys.has('ArrowLeft') || s.keys.has('a')) { ax = -1; s.moveBias[0]++ }
  if (s.keys.has('ArrowRight') || s.keys.has('d')) { ax = 1; s.moveBias[1]++ }
  if (s.keys.has('ArrowUp') || s.keys.has('w')) { ay = -1; s.moveBias[2]++ }
  if (s.keys.has('ArrowDown') || s.keys.has('s')) { ay = 1; s.moveBias[3]++ }

  // Normalize diagonal
  if (ax !== 0 && ay !== 0) {
    ax *= 0.707
    ay *= 0.707
  }

  s.pvx += ax * speed * 8 * dt
  s.pvy += ay * speed * 8 * dt

  // Friction
  s.pvx *= Math.pow(0.001, dt)
  s.pvy *= Math.pow(0.001, dt)

  const prevX = s.px, prevY = s.py
  s.px += s.pvx * dt
  s.py += s.pvy * dt

  s.moveDistTotal += dist(prevX, prevY, s.px, s.py)

  // Small score for moving
  const spd = Math.sqrt(s.pvx * s.pvx + s.pvy * s.pvy)
  if (spd > 20) s.score += 0.02 * dt * s.multiplier
}

function updateMouseFollow(s: GameState, dt: number): void {
  const resp = getParam(s, 'mouse_follow', 'responsiveness')
  const dx = s.mx - s.px
  const dy = s.my - s.py
  const d = Math.sqrt(dx * dx + dy * dy)

  if (d > 2) {
    const maxSpeed = 280
    const targetSpeed = Math.min(d * resp, maxSpeed)
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

  // Track movement bias
  if (s.pvx < -10) s.moveBias[0]++
  if (s.pvx > 10) s.moveBias[1]++
  if (s.pvy < -10) s.moveBias[2]++
  if (s.pvy > 10) s.moveBias[3]++

  const spd = Math.sqrt(s.pvx * s.pvx + s.pvy * s.pvy)
  if (spd > 20) s.score += 0.01 * dt * s.multiplier
}

function updateStars(s: GameState, dt: number): void {
  const rate = getParam(s, 'stars', 'spawnRate')
  const mult = s.rushActive ? getParam(s, 'score_rush', 'spawnMult') : 1
  s.spawnTimers.stars = (s.spawnTimers.stars || 0) + dt

  if (s.spawnTimers.stars > rate / mult) {
    spawnCollectible(s, 'star')
    s.spawnTimers.stars = 0
  }

  // Gentle bob
  for (const e of s.entities) {
    if (e.type !== 'star' || !e.active) continue
    e.y += Math.sin(s.totalTime * 2 + e.id * 0.7) * 0.3
    e.alpha = 0.85 + Math.sin(s.totalTime * 3 + e.id) * 0.15
    // Fade out old stars
    if (e.age > 12) {
      e.alpha *= Math.max(0, 1 - (e.age - 12) / 3)
      if (e.age > 15) e.active = false
    }
  }
}

function updatePulseGems(s: GameState, dt: number): void {
  const rate = getParam(s, 'pulse_gems', 'spawnRate')
  const mult = s.rushActive ? getParam(s, 'score_rush', 'spawnMult') : 1
  s.spawnTimers.gems = (s.spawnTimers.gems || 0) + dt

  if (s.spawnTimers.gems > rate / mult) {
    spawnCollectible(s, 'gem')
    s.spawnTimers.gems = 0
  }

  // Remove old gems
  for (const e of s.entities) {
    if (e.type !== 'gem' || !e.active) continue
    if (e.age > 10) e.active = false
  }
}

function updateChasers(s: GameState, dt: number): void {
  const p = s.mechanicParams.chasers || DEFAULT_PARAMS.chasers
  const rate = p.spawnRate
  const speed = p.speed
  const maxCount = p.maxCount
  const mult = s.rushActive ? getParam(s, 'score_rush', 'spawnMult') : 1

  s.spawnTimers.chasers = (s.spawnTimers.chasers || 0) + dt
  const chaserCount = s.entities.filter(e => e.type === 'chaser' && e.active).length

  if (s.spawnTimers.chasers > rate / mult && chaserCount < maxCount) {
    const side = Math.floor(Math.random() * 4)
    let x: number, y: number
    if (side === 0) { x = -15; y = Math.random() * s.h }
    else if (side === 1) { x = s.w + 15; y = Math.random() * s.h }
    else if (side === 2) { x = Math.random() * s.w; y = -15 }
    else { x = Math.random() * s.w; y = s.h + 15 }

    s.entities.push({
      id: s.nextId++,
      type: 'chaser',
      x, y,
      vx: 0, vy: 0,
      size: 8,
      color: COLORS.enemy,
      alpha: 1,
      active: true,
      age: 0,
      hp: 1,
    })
    s.spawnTimers.chasers = 0
  }

  // Chase player
  for (const e of s.entities) {
    if (e.type !== 'chaser' || !e.active) continue
    const dx = s.px - e.x
    const dy = s.py - e.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > 1) {
      e.vx = (dx / d) * speed
      e.vy = (dy / d) * speed
    }
  }
}

function updateSweepers(s: GameState, dt: number): void {
  const p = s.mechanicParams.sweepers || DEFAULT_PARAMS.sweepers
  const rate = p.spawnRate
  const speed = p.speed
  const mult = s.rushActive ? getParam(s, 'score_rush', 'spawnMult') : 1

  s.spawnTimers.sweepers = (s.spawnTimers.sweepers || 0) + dt

  if (s.spawnTimers.sweepers > rate / mult) {
    const isVertical = Math.random() > 0.5
    const fromStart = Math.random() > 0.5

    s.entities.push({
      id: s.nextId++,
      type: 'sweeper',
      x: isVertical ? (fromStart ? -10 : s.w + 10) : 0,
      y: isVertical ? 0 : (fromStart ? -10 : s.h + 10),
      vx: isVertical ? (fromStart ? speed : -speed) : 0,
      vy: isVertical ? 0 : (fromStart ? speed : -speed),
      size: 10,
      color: COLORS.sweeper,
      alpha: 1,
      active: true,
      age: 0,
      hp: 1,
    })
    s.spawnTimers.sweepers = 0
  }

  // Remove sweepers that passed through
  for (const e of s.entities) {
    if (e.type !== 'sweeper' || !e.active) continue
    if (Math.abs(e.vx) > 0) {
      if ((e.vx > 0 && e.x > s.w + 20) || (e.vx < 0 && e.x < -20)) e.active = false
    } else {
      if ((e.vy > 0 && e.y > s.h + 20) || (e.vy < 0 && e.y < -20)) e.active = false
    }
  }
}

function updateBlaster(s: GameState, _dt: number): void {
  const p = s.mechanicParams.blaster || DEFAULT_PARAMS.blaster

  if (s.keys.has(' ') && s.shootCD <= 0) {
    // Direction: toward mouse, or last movement direction
    let dx = s.mx - s.px
    let dy = s.my - s.py
    let d = Math.sqrt(dx * dx + dy * dy)
    if (d < 5) {
      // Fallback: shoot in last movement direction
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
      color: COLORS.bullet,
      alpha: 1,
      active: true,
      age: 0,
      hp: 1,
    })
    s.shootCD = p.fireRate
    // Slight recoil
    s.pvx -= (dx / d) * 30
    s.pvy -= (dy / d) * 30
    burst(s, s.px, s.py, COLORS.bullet, 3)
  }
}

function updatePhaseDash(s: GameState, dt: number): void {
  const p = s.mechanicParams.phase_dash || DEFAULT_PARAMS.phase_dash

  if (s.dashCD > 0) s.dashCD -= dt

  if (s.dashActive) {
    s.dashDuration -= dt
    s.invTimer = 0.1 // stay invincible during dash
    if (s.dashDuration <= 0) {
      s.dashActive = false
      burst(s, s.px, s.py, COLORS.dash, 6)
    }
  }

  if (s.keys.has(' ') && s.dashCD <= 0 && !s.dashActive) {
    s.dashActive = true
    s.dashDuration = p.duration
    s.dashCD = p.cooldown
    // Burst in movement direction
    const spd = Math.sqrt(s.pvx * s.pvx + s.pvy * s.pvy)
    if (spd > 5) {
      s.pvx = (s.pvx / spd) * 350 * p.speedMult
      s.pvy = (s.pvy / spd) * 350 * p.speedMult
    } else {
      // Dash toward mouse
      const dx = s.mx - s.px
      const dy = s.my - s.py
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > 1) {
        s.pvx = (dx / d) * 350
        s.pvy = (dy / d) * 350
      }
    }
    burst(s, s.px, s.py, COLORS.dash, 10)
  }
}

function updateComboChain(s: GameState, dt: number): void {
  if (s.combo > 0) {
    s.comboTimer -= dt
    if (s.comboTimer <= 0) {
      s.combo = 0
      s.multiplier = 1
    }
  }
}

function updateGravityWell(s: GameState, dt: number): void {
  const range = getParam(s, 'gravity_well', 'range')
  const strength = getParam(s, 'gravity_well', 'strength')

  for (const e of s.entities) {
    if (!e.active) continue
    if (e.type !== 'star' && e.type !== 'gem') continue

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
  if (!s.rushActive) return
  s.rushTimer -= dt
  // Score multiplier is handled via s.multiplier in activation
}

// ==========================================
// MECHANIC RENDERS (overlays/indicators)
// ==========================================

function renderComboChain(ctx: CanvasRenderingContext2D, s: GameState): void {
  if (s.combo < 1) return
  // Combo ring around player
  const ringAlpha = Math.min(s.combo / 10, 0.5)
  ctx.strokeStyle = COLORS.combo[Math.min(s.multiplier - 1, COLORS.combo.length - 1)]
  ctx.lineWidth = 2
  ctx.globalAlpha = ringAlpha
  ctx.beginPath()
  ctx.arc(s.px, s.py, s.pSize + 6 + s.multiplier * 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
}

function renderScoreRush(ctx: CanvasRenderingContext2D, s: GameState): void {
  if (!s.rushActive) return
  // Pulsing border
  const pulse = Math.sin(s.totalTime * 6) * 0.3 + 0.4
  ctx.strokeStyle = COLORS.accent
  ctx.lineWidth = 3
  ctx.globalAlpha = pulse
  ctx.strokeRect(4, 4, s.w - 8, s.h - 8)
  ctx.globalAlpha = 1
}

// ==========================================
// MECHANIC LOOKUP TABLES
// ==========================================

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

const MECHANIC_RENDERS: Record<string, (ctx: CanvasRenderingContext2D, s: GameState) => void> = {
  combo_chain: renderComboChain,
  score_rush: renderScoreRush,
}

// ==========================================
// MECHANIC ACTIVATION
// ==========================================

export function activateMechanic(s: GameState, mechanicId: string, params: Record<string, number>): void {
  if (s.activeMechanics.includes(mechanicId)) return

  // Merge params with defaults
  const merged = { ...(DEFAULT_PARAMS[mechanicId] || {}), ...params }
  s.mechanicParams[mechanicId] = merged
  s.activeMechanics.push(mechanicId)

  // Mechanic-specific activation
  if (mechanicId === 'score_rush') {
    s.rushActive = true
    s.rushTimer = merged.duration || 25
    // Boost multiplier
    const scoreMult = merged.scoreMult || 3
    s.multiplier = Math.max(s.multiplier, scoreMult)
  }
}

// ==========================================
// GAME STATE QUERIES
// ==========================================

export function shouldMutate(s: GameState): boolean {
  if (s.wave >= MAX_WAVES - 1) return false
  const dur = WAVE_DURATION[s.wave]
  const scoreNeeded = WAVE_SCORE[s.wave]
  return s.waveTime >= dur || (s.score - s.waveScoreStart) >= scoreNeeded
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

  // Determine play style
  const killRate = s.killTotal / time
  const moveRate = s.moveDistTotal / time
  let playStyle: ProfileSummary['playStyle'] = 'collector'
  if (killRate > 0.5) playStyle = 'aggressive'
  else if (s.hitsTaken < 2 && time > 30) playStyle = 'cautious'
  else if (moveRate > 100) playStyle = 'explorer'

  return {
    playStyle,
    clickRate: s.clickTotal / time,
    moveDistance: s.moveDistTotal,
    collectRate: s.collectTotal / time,
    killRate,
    hitRate: s.hitsTaken / time,
    preferredDirection: prefDir,
    score: s.score,
    wave: s.wave,
    activeMechanics: s.activeMechanics,
  }
}

// ==========================================
// HELPERS
// ==========================================

function spawnCollectible(s: GameState, type: 'star' | 'gem'): void {
  const margin = 30
  s.entities.push({
    id: s.nextId++,
    type,
    x: margin + Math.random() * (s.w - margin * 2),
    y: margin + Math.random() * (s.h - margin * 2),
    vx: 0,
    vy: 0,
    size: type === 'star' ? 7 : 9,
    color: type === 'star' ? COLORS.star : COLORS.gem,
    alpha: 1,
    active: true,
    age: 0,
    hp: 0,
  })
}

function burst(s: GameState, x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
    const speed = 40 + Math.random() * 100
    s.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.5 + Math.random() * 2.5,
      color,
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
