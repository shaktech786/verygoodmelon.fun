'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { Undo2, Trash2 } from 'lucide-react'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlantCategory = 'flower' | 'tree' | 'stone' | 'mushroom' | 'bush'

interface PlantVariant {
  category: PlantCategory
  id: string
  label: string
}

interface PlacedElement {
  id: string
  variant: PlantVariant
  x: number // 0..1 normalized
  y: number // 0..1 normalized
  scale: number // 0.8..1.2
  colorSeed: number // 0..1 for subtle color variation
  phase: number // random phase offset for sway
  placedAt: number
}

interface GardenSuggestion {
  variant: PlantVariant
  x: number
  y: number
}

interface GardenState {
  elements: PlacedElement[]
  version: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'verygoodmelon:calm-garden'
const SUGGEST_THRESHOLD = 3
const GROW_MS = 700
// Normalized y of the drawn horizon. Planting starts here; above it is sky.
const GROUND_TOP = 0.33

const PLANT_VARIANTS: PlantVariant[] = [
  // Flowers (5 varieties)
  { category: 'flower', id: 'daisy', label: 'Daisy' },
  { category: 'flower', id: 'tulip', label: 'Tulip' },
  { category: 'flower', id: 'poppy', label: 'Poppy' },
  { category: 'flower', id: 'lavender', label: 'Lavender' },
  { category: 'flower', id: 'sunflower', label: 'Sunflower' },
  // Trees (3 types)
  { category: 'tree', id: 'oak', label: 'Oak Tree' },
  { category: 'tree', id: 'pine', label: 'Pine Tree' },
  { category: 'tree', id: 'willow', label: 'Willow' },
  // Stones (3 types)
  { category: 'stone', id: 'round-stone', label: 'Round Stone' },
  { category: 'stone', id: 'flat-stone', label: 'Flat Stone' },
  { category: 'stone', id: 'crystal', label: 'Crystal' },
  // Mushrooms (2 types)
  { category: 'mushroom', id: 'toadstool', label: 'Toadstool' },
  { category: 'mushroom', id: 'cluster', label: 'Mushroom Cluster' },
  // Bushes (2 types)
  { category: 'bush', id: 'round-bush', label: 'Round Bush' },
  { category: 'bush', id: 'berry-bush', label: 'Berry Bush' },
]

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const COLORS = {
  greens: ['#74c69d', '#52b788', '#40916c', '#2d6a4f', '#1a4d2e'],
  flowerColors: ['#e63946', '#f4845f', '#f7b267', '#d4a5f5', '#f9c6d3'],
  browns: ['#8b6f47', '#a0855b', '#6b4f36', '#5c3d2e'],
  greys: ['#9e9e9e', '#bdbdbd', '#757575', '#6d6d6d'],
  sky: {
    morning: { top: '#fbc2b5', bottom: '#fde8c9' },
    day: { top: '#87ceeb', bottom: '#b8e4f0' },
    evening: { top: '#f4845f', bottom: '#fde8c9' },
    night: { top: '#1a1a3e', bottom: '#2d2d5e' },
  },
}

// ---------------------------------------------------------------------------
// Sky time-of-day
// ---------------------------------------------------------------------------

type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 9) return 'morning'
  if (hour >= 9 && hour < 17) return 'day'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawStem(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  height: number,
  sway: number,
  color: string,
) {
  ctx.beginPath()
  ctx.moveTo(x, baseY)
  ctx.quadraticCurveTo(x + sway * 0.6, baseY - height * 0.5, x + sway, baseY - height)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colorSeed: number,
  sway: number,
  variantId: string,
) {
  const stemH = 30 * scale
  const topX = x + sway
  const topY = y - stemH

  // Stem
  drawStem(ctx, x, y, stemH, sway, COLORS.greens[2])

  // Leaf on stem
  ctx.save()
  ctx.translate(x + sway * 0.3, y - stemH * 0.4)
  ctx.rotate(0.4 + sway * 0.02)
  ctx.beginPath()
  ctx.ellipse(0, 0, 6 * scale, 3 * scale, 0, 0, Math.PI * 2)
  ctx.fillStyle = COLORS.greens[1]
  ctx.fill()
  ctx.restore()

  const petalColor = COLORS.flowerColors[Math.floor(colorSeed * COLORS.flowerColors.length)]

  if (variantId === 'daisy') {
    // Circle petals around center
    const petalCount = 8
    for (let i = 0; i < petalCount; i++) {
      const angle = (Math.PI * 2 / petalCount) * i
      ctx.beginPath()
      ctx.ellipse(
        topX + Math.cos(angle) * 6 * scale,
        topY + Math.sin(angle) * 6 * scale,
        5 * scale, 3 * scale,
        angle, 0, Math.PI * 2,
      )
      ctx.fillStyle = 'white'
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(topX, topY, 4 * scale, 0, Math.PI * 2)
    ctx.fillStyle = '#f7b267'
    ctx.fill()
  } else if (variantId === 'tulip') {
    // Cup-shaped petals
    ctx.beginPath()
    ctx.moveTo(topX - 7 * scale, topY)
    ctx.quadraticCurveTo(topX - 9 * scale, topY - 12 * scale, topX, topY - 14 * scale)
    ctx.quadraticCurveTo(topX + 9 * scale, topY - 12 * scale, topX + 7 * scale, topY)
    ctx.closePath()
    ctx.fillStyle = petalColor
    ctx.fill()
  } else if (variantId === 'poppy') {
    // Large round petals
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2
      ctx.beginPath()
      ctx.arc(
        topX + Math.cos(angle) * 5 * scale,
        topY + Math.sin(angle) * 5 * scale,
        6 * scale, 0, Math.PI * 2,
      )
      ctx.fillStyle = petalColor
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(topX, topY, 3 * scale, 0, Math.PI * 2)
    ctx.fillStyle = '#1a1a1a'
    ctx.fill()
  } else if (variantId === 'lavender') {
    // Tall cluster of small blossoms
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.arc(
        topX + Math.sin(i * 2.1 + colorSeed * 10) * 2 * scale,
        topY - i * 3 * scale,
        2.5 * scale, 0, Math.PI * 2,
      )
      ctx.fillStyle = '#d4a5f5'
      ctx.fill()
    }
  } else if (variantId === 'sunflower') {
    // Large flower with many petals
    const petalCount = 12
    for (let i = 0; i < petalCount; i++) {
      const angle = (Math.PI * 2 / petalCount) * i
      ctx.save()
      ctx.translate(topX + Math.cos(angle) * 8 * scale, topY + Math.sin(angle) * 8 * scale)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.ellipse(0, 0, 6 * scale, 3 * scale, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#f7b267'
      ctx.fill()
      ctx.restore()
    }
    ctx.beginPath()
    ctx.arc(topX, topY, 6 * scale, 0, Math.PI * 2)
    ctx.fillStyle = '#5c3d2e'
    ctx.fill()
  }
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colorSeed: number,
  sway: number,
  variantId: string,
) {
  const greenIdx = Math.floor(colorSeed * COLORS.greens.length)
  const canopyColor = COLORS.greens[greenIdx]

  if (variantId === 'oak') {
    // Trunk
    const trunkH = 40 * scale
    ctx.fillStyle = COLORS.browns[0]
    ctx.beginPath()
    ctx.moveTo(x - 5 * scale, y)
    ctx.lineTo(x - 3 * scale + sway * 0.3, y - trunkH)
    ctx.lineTo(x + 3 * scale + sway * 0.3, y - trunkH)
    ctx.lineTo(x + 5 * scale, y)
    ctx.closePath()
    ctx.fill()
    // Canopy - overlapping circles
    const canopyY = y - trunkH
    const topX = x + sway * 0.5
    for (const [ox, oy, r] of [
      [0, -10, 18], [-12, -4, 14], [12, -4, 14], [0, -22, 12],
    ] as [number, number, number][]) {
      ctx.beginPath()
      ctx.arc(topX + ox * scale, canopyY + oy * scale, r * scale, 0, Math.PI * 2)
      ctx.fillStyle = canopyColor
      ctx.fill()
    }
  } else if (variantId === 'pine') {
    // Trunk
    const trunkH = 35 * scale
    ctx.fillStyle = COLORS.browns[2]
    ctx.fillRect(x - 3 * scale, y - trunkH, 6 * scale, trunkH)
    // Triangular layers
    const topX = x + sway * 0.4
    for (let layer = 0; layer < 3; layer++) {
      const layerY = y - trunkH + layer * 8 * scale - 10 * scale
      const w = (14 - layer * 3) * scale
      ctx.beginPath()
      ctx.moveTo(topX, layerY - 16 * scale)
      ctx.lineTo(topX - w, layerY)
      ctx.lineTo(topX + w, layerY)
      ctx.closePath()
      ctx.fillStyle = COLORS.greens[3 + Math.min(layer, 1)]
      ctx.fill()
    }
  } else if (variantId === 'willow') {
    // Trunk
    const trunkH = 45 * scale
    ctx.fillStyle = COLORS.browns[1]
    ctx.beginPath()
    ctx.moveTo(x - 4 * scale, y)
    ctx.quadraticCurveTo(x - 2 * scale + sway * 0.2, y - trunkH * 0.5, x + sway * 0.3, y - trunkH)
    ctx.lineTo(x + 4 * scale + sway * 0.3, y - trunkH)
    ctx.quadraticCurveTo(x + 2 * scale + sway * 0.2, y - trunkH * 0.5, x + 4 * scale, y)
    ctx.closePath()
    ctx.fill()
    // Drooping branches
    const topX = x + sway * 0.5
    const topY = y - trunkH
    for (let i = 0; i < 7; i++) {
      const angle = -Math.PI * 0.8 + (Math.PI * 0.6 / 6) * i
      const branchLen = (25 + i * 3) * scale
      ctx.beginPath()
      ctx.moveTo(topX, topY - 5 * scale)
      ctx.quadraticCurveTo(
        topX + Math.cos(angle) * branchLen * 0.5,
        topY + 10 * scale,
        topX + Math.cos(angle) * branchLen,
        topY + branchLen * 0.6 + sway * 2,
      )
      ctx.strokeStyle = canopyColor
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }
}

function drawStone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colorSeed: number,
  variantId: string,
) {
  const greyIdx = Math.floor(colorSeed * COLORS.greys.length)
  const color = COLORS.greys[greyIdx]

  if (variantId === 'round-stone') {
    ctx.beginPath()
    ctx.ellipse(x, y - 6 * scale, 10 * scale, 7 * scale, 0, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    // Highlight
    ctx.beginPath()
    ctx.ellipse(x - 3 * scale, y - 9 * scale, 3 * scale, 2 * scale, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fill()
  } else if (variantId === 'flat-stone') {
    ctx.beginPath()
    ctx.ellipse(x, y - 3 * scale, 14 * scale, 4 * scale, 0, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 2 * scale, y - 5 * scale, 4 * scale, 1.5 * scale, 0.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fill()
  } else if (variantId === 'crystal') {
    // Geometric crystal
    ctx.beginPath()
    ctx.moveTo(x, y - 16 * scale)
    ctx.lineTo(x + 6 * scale, y - 4 * scale)
    ctx.lineTo(x + 4 * scale, y)
    ctx.lineTo(x - 4 * scale, y)
    ctx.lineTo(x - 6 * scale, y - 4 * scale)
    ctx.closePath()
    ctx.fillStyle = `rgba(180, 200, 220, ${0.7 + colorSeed * 0.3})`
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function drawMushroom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colorSeed: number,
  sway: number,
  variantId: string,
) {
  if (variantId === 'toadstool') {
    // Stem
    const stemTopX = x + sway * 0.5
    ctx.fillStyle = '#f5e6d3'
    ctx.beginPath()
    ctx.moveTo(x - 3 * scale, y)
    ctx.lineTo(stemTopX - 2 * scale, y - 14 * scale)
    ctx.lineTo(stemTopX + 2 * scale, y - 14 * scale)
    ctx.lineTo(x + 3 * scale, y)
    ctx.closePath()
    ctx.fill()
    // Cap
    ctx.beginPath()
    ctx.arc(stemTopX, y - 14 * scale, 10 * scale, Math.PI, 0)
    ctx.fillStyle = colorSeed > 0.5 ? '#e63946' : '#d4a5f5'
    ctx.fill()
    // Dots
    ctx.beginPath()
    ctx.arc(stemTopX - 4 * scale, y - 18 * scale, 1.5 * scale, 0, Math.PI * 2)
    ctx.arc(stemTopX + 3 * scale, y - 20 * scale, 1.5 * scale, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fill()
  } else if (variantId === 'cluster') {
    // Multiple small mushrooms
    for (const [ox, oy, s] of [[-6, 0, 0.7], [0, 2, 1], [7, -1, 0.8]] as [number, number, number][]) {
      const mx = x + ox * scale
      const my = y + oy * scale
      const ms = s * scale
      const mSway = sway * s * 0.4
      // Stem
      ctx.fillStyle = '#f5e6d3'
      ctx.fillRect(mx - 1.5 * ms + mSway * 0.5, my - 8 * ms, 3 * ms, 8 * ms)
      // Cap
      ctx.beginPath()
      ctx.arc(mx + mSway * 0.5, my - 8 * ms, 5 * ms, Math.PI, 0)
      ctx.fillStyle = COLORS.browns[Math.floor(colorSeed * COLORS.browns.length)]
      ctx.fill()
    }
  }
}

function drawBush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colorSeed: number,
  sway: number,
  variantId: string,
) {
  const greenIdx = Math.floor(colorSeed * COLORS.greens.length)

  if (variantId === 'round-bush') {
    // Cluster of circles
    for (const [ox, oy, r] of [
      [0, -8, 12], [-9, -4, 9], [9, -4, 9], [0, -16, 8],
    ] as [number, number, number][]) {
      ctx.beginPath()
      ctx.arc(x + ox * scale + sway * 0.3, y + oy * scale, r * scale, 0, Math.PI * 2)
      ctx.fillStyle = COLORS.greens[greenIdx]
      ctx.fill()
    }
  } else if (variantId === 'berry-bush') {
    // Bush with berries
    for (const [ox, oy, r] of [
      [0, -7, 10], [-7, -3, 8], [7, -3, 8],
    ] as [number, number, number][]) {
      ctx.beginPath()
      ctx.arc(x + ox * scale + sway * 0.3, y + oy * scale, r * scale, 0, Math.PI * 2)
      ctx.fillStyle = COLORS.greens[Math.min(greenIdx + 1, COLORS.greens.length - 1)]
      ctx.fill()
    }
    // Berries
    for (const [ox, oy] of [[-5, -10], [3, -12], [8, -6], [-8, -5]] as [number, number][]) {
      ctx.beginPath()
      ctx.arc(x + ox * scale + sway * 0.2, y + oy * scale, 2 * scale, 0, Math.PI * 2)
      ctx.fillStyle = '#e63946'
      ctx.fill()
    }
  }
}

function drawPlant(
  ctx: CanvasRenderingContext2D,
  variant: PlantVariant,
  x: number,
  y: number,
  scale: number,
  colorSeed: number,
  sway: number,
) {
  switch (variant.category) {
    case 'flower':
      drawFlower(ctx, x, y, scale, colorSeed, sway, variant.id)
      break
    case 'tree':
      drawTree(ctx, x, y, scale, colorSeed, sway, variant.id)
      break
    case 'stone':
      drawStone(ctx, x, y, scale, colorSeed, variant.id)
      break
    case 'mushroom':
      drawMushroom(ctx, x, y, scale, colorSeed, sway, variant.id)
      break
    case 'bush':
      drawBush(ctx, x, y, scale, colorSeed, sway, variant.id)
      break
  }
}

// Plants are drawn for a ~480px garden; wider gardens draw them larger, and
// plants further back (nearer the horizon) draw smaller, so the meadow has depth.
function sizeFactor(canvasW: number): number {
  return Math.max(0.85, Math.min(2, canvasW / 480))
}

function depthFactor(y: number): number {
  return 0.7 + 0.45 * Math.max(0, (y - GROUND_TOP) / (1 - GROUND_TOP))
}

function easeOutBack(t: number): number {
  const c = 1.4
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeOfDay: TimeOfDay,
  time: number,
) {
  const horizon = h * GROUND_TOP
  const skyColors = COLORS.sky[timeOfDay]
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon + h * 0.05)
  skyGrad.addColorStop(0, skyColors.top)
  skyGrad.addColorStop(1, skyColors.bottom)
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, w, horizon + h * 0.05)

  if (timeOfDay === 'night') {
    drawStars(ctx, w, h, time)
  }

  // Sun or moon, low and soft
  const orbX = w * (timeOfDay === 'morning' ? 0.2 : timeOfDay === 'evening' ? 0.8 : 0.72)
  const orbY = horizon * (timeOfDay === 'day' ? 0.38 : 0.62)
  const orbR = Math.max(14, Math.min(w, h) * 0.05)
  const glow = ctx.createRadialGradient(orbX, orbY, orbR * 0.5, orbX, orbY, orbR * 3)
  glow.addColorStop(0, timeOfDay === 'night' ? 'rgba(255,255,230,0.25)' : 'rgba(255,240,200,0.55)')
  glow.addColorStop(1, 'rgba(255,240,200,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(orbX, orbY, orbR * 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2)
  ctx.fillStyle = timeOfDay === 'night' ? '#f4f1de' : timeOfDay === 'day' ? '#fff3c4' : '#ffd8a8'
  ctx.fill()
  if (timeOfDay === 'night') {
    ctx.beginPath()
    ctx.arc(orbX + orbR * 0.4, orbY - orbR * 0.2, orbR * 0.85, 0, Math.PI * 2)
    ctx.fillStyle = skyColors.top
    ctx.fill()
  }

  // Clouds drift very slowly across; with reduced motion the clock is frozen and they rest.
  if (timeOfDay !== 'night') {
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    for (let i = 0; i < 3; i++) {
      const span = w + 200
      const cx = ((i * 0.37 + time * 0.000006 * (1 + i * 0.3)) % 1) * span - 100
      const cy = horizon * (0.22 + i * 0.2)
      const s = Math.max(0.7, w / 800) * (1 - i * 0.15)
      for (const [ox, oy, r] of [[0, 0, 18], [20, -6, 22], [42, 0, 16], [22, 6, 18]] as [number, number, number][]) {
        ctx.beginPath()
        ctx.arc(cx + ox * s, cy + oy * s, r * s, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // Distant hills sit on the horizon behind the meadow.
  ctx.beginPath()
  ctx.moveTo(0, horizon + 2)
  ctx.quadraticCurveTo(w * 0.15, horizon - h * 0.06, w * 0.32, horizon - h * 0.01)
  ctx.quadraticCurveTo(w * 0.55, horizon - h * 0.08, w * 0.78, horizon - h * 0.015)
  ctx.quadraticCurveTo(w * 0.9, horizon - h * 0.05, w, horizon - h * 0.02)
  ctx.lineTo(w, horizon + 2)
  ctx.closePath()
  ctx.fillStyle = timeOfDay === 'night' ? '#2f4a3a' : '#8fbf8f'
  ctx.fill()
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, timeOfDay: TimeOfDay) {
  const horizon = h * GROUND_TOP
  const night = timeOfDay === 'night'
  const groundGrad = ctx.createLinearGradient(0, horizon, 0, h)
  groundGrad.addColorStop(0, night ? '#3f6b4a' : '#7db87d')
  groundGrad.addColorStop(0.4, night ? '#335c3e' : '#5a9a5a')
  groundGrad.addColorStop(1, night ? '#24452e' : '#3d7a3d')
  ctx.fillStyle = groundGrad
  ctx.fillRect(0, horizon, w, h - horizon)

  // A few still grass tufts give the meadow texture without moving.
  ctx.strokeStyle = night ? 'rgba(120,170,120,0.2)' : 'rgba(40,90,40,0.14)'
  ctx.lineWidth = 1
  for (let i = 0; i < 45; i++) {
    const gx = ((i * 7919 + 13) % 997) / 997 * w
    const gy = horizon + 6 + ((i * 6271 + 29) % 991) / 991 * (h - horizon - 8)
    const len = 3 + depthFactor(gy / h) * 4
    ctx.beginPath()
    ctx.moveTo(gx, gy)
    ctx.quadraticCurveTo(gx - 1, gy - len * 0.6, gx - 3, gy - len)
    ctx.moveTo(gx + 1, gy)
    ctx.quadraticCurveTo(gx + 1, gy - len * 0.7, gx + 1, gy - len * 1.2)
    ctx.moveTo(gx + 2, gy)
    ctx.quadraticCurveTo(gx + 3, gy - len * 0.6, gx + 5, gy - len * 0.8)
    ctx.stroke()
  }
}

function drawVisitors(
  ctx: CanvasRenderingContext2D,
  hosts: PlacedElement[],
  count: number,
  w: number,
  h: number,
  timeOfDay: TimeOfDay,
  time: number,
  still: boolean,
) {
  const k = sizeFactor(w)
  for (let i = 0; i < count; i++) {
    // Each visitor drifts from one flower to another every few seconds.
    const hop = time / 7000 + i * 0.41
    const step = Math.floor(hop)
    const t = Math.min(1, (hop - step) * 3)
    const from = hosts[(step * 5 + i * 3) % hosts.length]
    const to = hosts[((step + 1) * 5 + i * 3) % hosts.length]
    const at = (el: PlacedElement) => [el.x * w, el.y * h - 34 * k * depthFactor(el.y)] as const
    const [fx, fy] = at(from)
    const [tx, ty] = at(to)
    const ease = 0.5 - Math.cos(t * Math.PI) / 2
    const x = fx + (tx - fx) * ease + Math.sin(time * 0.0009 + i) * 6
    const y = fy + (ty - fy) * ease - Math.sin(t * Math.PI) * 30 + Math.cos(time * 0.0013 + i) * 4

    if (timeOfDay === 'night') {
      const glow = still ? 0.8 : 0.55 + Math.sin(time * 0.002 + i * 2) * 0.35
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10)
      g.addColorStop(0, `rgba(255, 245, 160, ${glow})`)
      g.addColorStop(1, 'rgba(255, 245, 160, 0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fillStyle = '#fff6b0'
      ctx.fill()
    } else {
      const open = still ? 0.85 : 0.35 + Math.abs(Math.sin(time * 0.009 + i)) * 0.65
      const s = 1.1 * k
      ctx.fillStyle = COLORS.flowerColors[(i * 2 + 1) % COLORS.flowerColors.length]
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(x + side * 4 * s * open, y - 2 * s, 4.5 * s * open, 4 * s, side * 0.4, 0, Math.PI * 2)
        ctx.fill()
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
  }
}

function drawSuggestion(
  ctx: CanvasRenderingContext2D,
  suggestion: GardenSuggestion,
  w: number,
  h: number,
  time: number,
) {
  const x = suggestion.x * w
  const y = suggestion.y * h
  const k = sizeFactor(w) * depthFactor(suggestion.y)
  const breathe = 0.75 + Math.sin(time * 0.002) * 0.25

  ctx.save()
  // A soft pool of light on the grass, then a ghost of the plant itself.
  ctx.globalAlpha = breathe
  ctx.beginPath()
  ctx.ellipse(x, y, 26 * k, 9 * k, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 250, 220, 0.45)'
  ctx.fill()
  ctx.setLineDash([5, 5])
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 0.45 * breathe
  drawPlant(ctx, suggestion.variant, x, y, k, 0.4, 0)
  ctx.restore()
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const starCount = 40
  for (let i = 0; i < starCount; i++) {
    // Deterministic pseudo-random positions from index
    const sx = ((i * 7919 + 104729) % 1000) / 1000 * w
    const sy = ((i * 6271 + 87119) % 1000) / 1000 * (h * (GROUND_TOP - 0.05))
    const twinkle = 0.45 + Math.sin(time * 0.001 + i * 2.3) * 0.25
    ctx.beginPath()
    ctx.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 240, ${twinkle})`
    ctx.fill()
  }
}

const ICON_SCALE: Record<PlantCategory, number> = { flower: 0.85, tree: 0.5, stone: 1.3, mushroom: 1.3, bush: 1.1 }
const ICON_SIZE = 40

// Each picker button shows the plant drawn by the same code as the garden.
function PlantIcon({ variant }: { variant: PlantVariant }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = ICON_SIZE * dpr
    canvas.height = ICON_SIZE * dpr
    ctx.scale(dpr, dpr)
    drawPlant(ctx, variant, ICON_SIZE / 2, ICON_SIZE - 4, ICON_SCALE[variant.category], 0.35, 0)
  }, [variant])
  return <canvas ref={ref} className="w-10 h-10" aria-hidden="true" />
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadGarden(): GardenState {
  if (typeof window === 'undefined') return { elements: [], version: 1 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { elements: [], version: 1 }
    const parsed = JSON.parse(raw) as GardenState
    if (!Array.isArray(parsed.elements)) return { elements: [], version: 1 }
    // Re-link each element to the current variant list; drop anything unrecognisable.
    const elements = parsed.elements.flatMap((el) => {
      const variant = PLANT_VARIANTS.find((v) => v.id === el?.variant?.id)
      return variant && typeof el.x === 'number' && typeof el.y === 'number' ? [{ ...el, variant, placedAt: 0 }] : []
    })
    return { elements, version: 1 }
  } catch {
    return { elements: [], version: 1 }
  }
}

function saveGarden(state: GardenState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full — silently fail
  }
}

// Butterflies (or fireflies at night) arrive once there are flowers to visit.
function visitorCountFor(elements: PlacedElement[]): number {
  const hosts = elements.filter((el) => el.variant.category === 'flower' || el.variant.id === 'berry-bush')
  return Math.min(3, Math.floor(hosts.length / 3))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalmGarden() {
  const [elements, setElements] = useState<PlacedElement[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<PlantVariant>(PLANT_VARIANTS[0])
  const [suggestion, setSuggestion] = useState<GardenSuggestion | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const prefersReducedMotion = useReducedMotion()
  const [keyboardCursor, setKeyboardCursor] = useState<{ x: number; y: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 })
  const suggestPendingRef = useRef(false)
  const suggestCountRef = useRef(0)
  const visitorsSeenRef = useRef(0)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadGarden().elements
    visitorsSeenRef.current = visitorCountFor(saved)
    setElements(saved)
    setLoaded(true)
  }, [])

  // Persist on change, but never before the saved garden has been read back,
  // or the initial empty state would overwrite it.
  useEffect(() => {
    if (!loaded) return
    saveGarden({ elements, version: 1 })
  }, [elements, loaded])

  // Time of day for sky
  const timeOfDay = useMemo(() => getTimeOfDay(), [])
  const visitorCount = visitorCountFor(elements)

  useEffect(() => {
    if (!loaded) return
    if (visitorCount > visitorsSeenRef.current) {
      setAnnouncement(timeOfDay === 'night' ? 'A firefly has found your garden.' : 'A butterfly has found your garden.')
    }
    visitorsSeenRef.current = visitorCount
  }, [visitorCount, loaded, timeOfDay])

  const fetchSuggestion = useCallback(async (currentElements: PlacedElement[]) => {
    if (suggestPendingRef.current) return
    suggestPendingRef.current = true

    try {
      const res = await fetch('/api/calm-garden/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements: currentElements.map(el => ({
            type: el.variant.id,
            x: el.x,
            y: el.y,
            variant: el.variant.category,
          })),
          canvasWidth: 1,
          canvasHeight: 1,
        }),
      })
      if (!res.ok) return

      const data = await res.json()
      const variant = PLANT_VARIANTS.find(v => v.id === data?.suggestion?.type)
      if (!variant || typeof data.suggestion.x !== 'number' || typeof data.suggestion.y !== 'number') return

      setSuggestion({
        variant,
        x: Math.max(0.05, Math.min(0.95, data.suggestion.x)),
        y: Math.max(GROUND_TOP + 0.05, Math.min(0.95, data.suggestion.y)),
      })
      setAnnouncement(`The garden would welcome a ${variant.label}`)
    } catch {
      // A missing suggestion is not worth interrupting the garden for.
    } finally {
      suggestPendingRef.current = false
    }
  }, [])

  const placeElement = useCallback((x: number, y: number, variant: PlantVariant) => {
    const newEl: PlacedElement = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      variant,
      x,
      y,
      scale: 0.85 + Math.random() * 0.3,
      colorSeed: Math.random(),
      phase: Math.random() * Math.PI * 2,
      placedAt: Date.now(),
    }
    const next = [...elements, newEl]
    setElements(next)

    // Suggest at the threshold and every 3 placements after it, a few times per garden
    if (
      next.length >= SUGGEST_THRESHOLD &&
      (next.length - SUGGEST_THRESHOLD) % 3 === 0 &&
      suggestCountRef.current < 5
    ) {
      suggestCountRef.current++
      fetchSuggestion(next)
    }

    setSuggestion(null)
    setAnnouncement(`Placed ${variant.label} in your garden`)
  }, [elements, fetchSuggestion])

  const acceptSuggestion = useCallback(() => {
    if (suggestion) placeElement(suggestion.x, suggestion.y, suggestion.variant)
  }, [suggestion, placeElement])

  const dismissSuggestion = useCallback(() => {
    setSuggestion(null)
    setAnnouncement('Suggestion set aside')
  }, [])

  const undoLast = useCallback(() => {
    if (elements.length === 0) return
    setElements(elements.slice(0, -1))
    setAnnouncement(`Removed ${elements[elements.length - 1].variant.label}`)
  }, [elements])

  const clearGarden = useCallback(() => {
    setElements([])
    setSuggestion(null)
    suggestCountRef.current = 0
    setShowClearConfirm(false)
    setAnnouncement('Garden cleared')
  }, [])

  // One handler for mouse, pen and touch: a tap fires click too, so a separate
  // touch handler would plant everything twice.
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    if (y < GROUND_TOP) {
      setAnnouncement('That is sky. Plants need the grass below.')
      return
    }

    if (suggestion && Math.abs(x - suggestion.x) < 0.05 && Math.abs(y - suggestion.y) < 0.05) {
      acceptSuggestion()
      return
    }

    placeElement(x, y, selectedVariant)
  }, [selectedVariant, suggestion, placeElement, acceptSuggestion])

  // Track mouse for plant lean effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    mouseRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }, [])

  const handleCanvasFocus = useCallback((e: React.FocusEvent<HTMLCanvasElement>) => {
    // Only show the planting cursor to keyboard users, not after a mouse click.
    if (e.currentTarget.matches(':focus-visible')) {
      setKeyboardCursor(prev => prev ?? { x: 0.5, y: 0.75 })
    }
  }, [])

  // Arrow keys and Enter only act while the garden itself is focused, so the
  // rest of the page keeps normal scrolling and link activation.
  const handleCanvasKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = 0.03
    const cur = keyboardCursor ?? { x: 0.5, y: 0.75 }
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        setKeyboardCursor({ x: cur.x, y: Math.max(GROUND_TOP, cur.y - step) })
        break
      case 'ArrowDown':
        e.preventDefault()
        setKeyboardCursor({ x: cur.x, y: Math.min(0.98, cur.y + step) })
        break
      case 'ArrowLeft':
        e.preventDefault()
        setKeyboardCursor({ x: Math.max(0.02, cur.x - step), y: cur.y })
        break
      case 'ArrowRight':
        e.preventDefault()
        setKeyboardCursor({ x: Math.min(0.98, cur.x + step), y: cur.y })
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        setKeyboardCursor(cur)
        placeElement(cur.x, cur.y, selectedVariant)
        break
      case 'Escape':
        setKeyboardCursor(null)
        break
    }
  }, [keyboardCursor, selectedVariant, placeElement])

  const handleGardenKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      undoLast()
    }
  }, [undoLast])

  const handlePickerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown'
    const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
    if (!forward && !back) return
    e.preventDefault()
    const idx = PLANT_VARIANTS.findIndex(v => v.id === selectedVariant.id)
    const next = PLANT_VARIANTS[(idx + (forward ? 1 : -1) + PLANT_VARIANTS.length) % PLANT_VARIANTS.length]
    setSelectedVariant(next)
    document.getElementById(`plant-${next.id}`)?.focus()
  }, [selectedVariant])

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }
    resizeCanvas()

    const ro = new ResizeObserver(resizeCanvas)
    ro.observe(canvas)

    const sorted = [...elements].sort((a, b) => a.y - b.y)
    const hosts = elements.filter((el) => el.variant.category === 'flower' || el.variant.id === 'berry-bush')

    const tick = (frameTime: number) => {
      // A frozen clock keeps sky, visitors and the suggestion still for reduced motion.
      const now = prefersReducedMotion ? 0 : frameTime
      const wallNow = Date.now()
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      const k = sizeFactor(w)

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      drawSky(ctx, w, h, timeOfDay, now)
      drawGround(ctx, w, h, timeOfDay)

      // -- Draw elements (sorted by y for depth) --
      for (const el of sorted) {
        let sway = 0
        let growth = 1
        if (!prefersReducedMotion) {
          sway = Math.sin(now * 0.001 + el.phase) * 3 * el.scale

          // Cursor proximity lean
          const mx = mouseRef.current.x
          const my = mouseRef.current.y
          if (mx >= 0 && my >= 0) {
            const dx = el.x - mx
            const dy = el.y - my
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 0.15 && dist > 0.01) {
              const lean = (0.15 - dist) / 0.15 * 5
              sway += dx > 0 ? lean : -lean
            }
          }

          const age = (wallNow - el.placedAt) / GROW_MS
          if (age < 1) growth = Math.max(0.05, easeOutBack(Math.max(0, age)))
        }
        const x = el.x * w
        const y = el.y * h
        const scale = el.scale * k * depthFactor(el.y) * growth

        // Soft contact shadow so plants sit on the grass rather than float on it
        ctx.beginPath()
        ctx.ellipse(x, y, 10 * scale, 3 * scale, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
        ctx.fill()

        drawPlant(ctx, el.variant, x, y, scale, el.colorSeed, sway * k)
      }

      if (suggestion) {
        drawSuggestion(ctx, suggestion, w, h, now)
      }

      if (hosts.length > 0 && visitorCount > 0) {
        drawVisitors(ctx, hosts, visitorCount, w, h, timeOfDay, now, prefersReducedMotion)
      }

      // -- Draw keyboard cursor --
      if (keyboardCursor) {
        const kx = keyboardCursor.x * w
        const ky = keyboardCursor.y * h
        ctx.beginPath()
        ctx.arc(kx, ky, 10, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(kx, ky, 10, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(211, 47, 63, 0.95)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.restore()

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      ro.disconnect()
    }
  }, [elements, suggestion, keyboardCursor, prefersReducedMotion, timeOfDay, visitorCount])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="max-w-4xl mx-auto"
      role="application"
      aria-label="The Gardener - a calm garden where you place plants"
      onKeyDown={handleGardenKeyDown}
    >
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Canvas */}
      <div className="relative bg-card-bg border border-card-border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block w-full aspect-[4/3] sm:aspect-[16/10] max-h-[68vh] cursor-crosshair focus-visible:outline-4! focus-visible:outline-solid! focus-visible:outline-accent! focus-visible:-outline-offset-4!"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onFocus={handleCanvasFocus}
          onKeyDown={handleCanvasKeyDown}
          role="img"
          aria-label={`Garden with ${elements.length} ${elements.length === 1 ? 'plant' : 'plants'}. Arrow keys move the planting spot, Enter places a ${selectedVariant.label}.`}
          tabIndex={0}
        />

        <div className="absolute top-3 right-3 text-xs font-medium text-white bg-black/55 rounded-full px-2.5 py-1 select-none pointer-events-none">
          {elements.length} {elements.length === 1 ? 'plant' : 'plants'}
        </div>

        {elements.length === 0 && loaded && (
          <p className="absolute inset-x-0 bottom-6 mx-auto w-fit max-w-[85%] text-center text-sm text-white bg-black/45 rounded-full px-4 py-1.5 select-none pointer-events-none">
            Choose a plant below, then tap the grass.
          </p>
        )}

        {suggestion && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-card-border bg-success/15 px-3 py-2 text-sm text-foreground animate-fade">
            <span>The garden would welcome a {suggestion.variant.label} by the light.</span>
            <span className="flex gap-1.5">
              <button
                type="button"
                onClick={acceptSuggestion}
                aria-label={`Plant the ${suggestion.variant.label} where the garden would welcome a ${suggestion.variant.label}`}
                className="rounded-md px-3 py-1 font-medium bg-melon-green text-background hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
              >
                Plant it
              </button>
              <button
                type="button"
                onClick={dismissSuggestion}
                className="rounded-md px-3 py-1 hover:bg-hover-bg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                Not now
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Plant picker */}
      <div className="mt-3 bg-card-bg border border-card-border rounded-lg p-3">
        <div
          id="plant-picker"
          className="grid grid-cols-5 sm:grid-cols-8 gap-1.5"
          role="radiogroup"
          aria-label="Plant to place"
          onKeyDown={handlePickerKeyDown}
        >
          {PLANT_VARIANTS.map(variant => (
            <button
              key={variant.id}
              id={`plant-${variant.id}`}
              type="button"
              role="radio"
              aria-checked={selectedVariant.id === variant.id}
              tabIndex={selectedVariant.id === variant.id ? 0 : -1}
              onClick={() => setSelectedVariant(variant)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-1 pt-1.5 pb-1 text-[11px] leading-tight transition-colors duration-75',
                'focus:outline-none focus:ring-2 focus:ring-accent',
                selectedVariant.id === variant.id
                  ? 'bg-accent-soft border border-accent text-foreground'
                  : 'border border-transparent text-foreground/80 hover:bg-hover-bg hover:text-foreground',
              )}
            >
              <span className="rounded-md bg-success/25 p-0.5">
                <PlantIcon variant={variant} />
              </span>
              <span className="text-center">{variant.label}</span>
            </button>
          ))}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-card-border">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={undoLast}
              disabled={elements.length === 0}
              aria-label="Undo last placement"
            >
              <Undo2 className="inline w-4 h-4 mr-1 -mt-0.5" aria-hidden="true" />
              Undo
            </Button>
            {!showClearConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                disabled={elements.length === 0}
                aria-label="Clear garden"
              >
                <Trash2 className="inline w-4 h-4 mr-1 -mt-0.5" aria-hidden="true" />
                Clear
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-sm text-foreground/80">Clear all?</span>
                <Button variant="danger" size="sm" onClick={clearGarden}>
                  Yes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(false)}>
                  No
                </Button>
              </div>
            )}
          </div>
          {elements.length > 0 && (
            <p className="text-xs text-foreground/70">Your garden saves itself and will be here when you return.</p>
          )}
        </div>
      </div>

      <p className="text-center mt-3 text-xs text-foreground/70">
        Keyboard: focus the garden, move with the arrow keys, Enter to plant, Ctrl+Z to undo.
      </p>
    </div>
  )
}
