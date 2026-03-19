'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { Undo2, Trash2 } from 'lucide-react'

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

interface AISuggestion {
  variant: PlantVariant
  x: number
  y: number
  expiresAt: number
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
const SUGGESTION_DURATION_MS = 10_000

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

function getTimeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
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
        topX + (Math.random() - 0.5) * 4 * scale,
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

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: PlacedElement,
  canvasW: number,
  canvasH: number,
  sway: number,
) {
  const x = el.x * canvasW
  const y = el.y * canvasH

  switch (el.variant.category) {
    case 'flower':
      drawFlower(ctx, x, y, el.scale, el.colorSeed, sway, el.variant.id)
      break
    case 'tree':
      drawTree(ctx, x, y, el.scale, el.colorSeed, sway, el.variant.id)
      break
    case 'stone':
      drawStone(ctx, x, y, el.scale, el.colorSeed, el.variant.id)
      break
    case 'mushroom':
      drawMushroom(ctx, x, y, el.scale, el.colorSeed, sway, el.variant.id)
      break
    case 'bush':
      drawBush(ctx, x, y, el.scale, el.colorSeed, sway, el.variant.id)
      break
  }
}

function drawSuggestionGlow(
  ctx: CanvasRenderingContext2D,
  suggestion: AISuggestion,
  canvasW: number,
  canvasH: number,
  time: number,
) {
  const x = suggestion.x * canvasW
  const y = suggestion.y * canvasH
  const pulse = 0.5 + Math.sin(time * 0.003) * 0.3
  const remaining = suggestion.expiresAt - Date.now()
  const fadeAlpha = Math.min(remaining / 2000, 1) // fade out over last 2s

  ctx.save()
  ctx.globalAlpha = pulse * fadeAlpha

  // Outer glow
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 25)
  grad.addColorStop(0, 'rgba(116, 198, 157, 0.4)')
  grad.addColorStop(0.6, 'rgba(116, 198, 157, 0.15)')
  grad.addColorStop(1, 'rgba(116, 198, 157, 0)')
  ctx.beginPath()
  ctx.arc(x, y, 25, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  // Dashed circle
  ctx.beginPath()
  ctx.arc(x, y, 15, 0, Math.PI * 2)
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = 'rgba(116, 198, 157, 0.6)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const starCount = 40
  for (let i = 0; i < starCount; i++) {
    // Deterministic pseudo-random positions from index
    const sx = ((i * 7919 + 104729) % 1000) / 1000 * w
    const sy = ((i * 6271 + 87119) % 1000) / 1000 * (h * 0.4)
    const twinkle = 0.3 + Math.sin(time * 0.001 + i * 2.3) * 0.3
    ctx.beginPath()
    ctx.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 240, ${twinkle})`
    ctx.fill()
  }
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
    return parsed
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalmGarden() {
  const [elements, setElements] = useState<PlacedElement[]>([])
  const [selectedVariant, setSelectedVariant] = useState<PlantVariant>(PLANT_VARIANTS[0])
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [keyboardCursor, setKeyboardCursor] = useState<{ x: number; y: number } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 })
  const suggestPendingRef = useRef(false)
  const suggestCountRef = useRef(0)
  const lastPlaceCountRef = useRef(0)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadGarden()
    setElements(saved.elements)
    lastPlaceCountRef.current = saved.elements.length
  }, [])

  // Reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Persist on change
  useEffect(() => {
    if (elements.length === 0 && lastPlaceCountRef.current === 0) return
    saveGarden({ elements, version: 1 })
    lastPlaceCountRef.current = elements.length
  }, [elements])

  // Category icons for the picker
  const categoryLabel = useCallback((cat: PlantCategory): string => {
    switch (cat) {
      case 'flower': return 'Flower'
      case 'tree': return 'Tree'
      case 'stone': return 'Stone'
      case 'mushroom': return 'Mushroom'
      case 'bush': return 'Bush'
    }
  }, [])

  // Get category symbol for the picker display
  const categorySymbol = useCallback((cat: PlantCategory): string => {
    switch (cat) {
      case 'flower': return '*'
      case 'tree': return '^'
      case 'stone': return 'o'
      case 'mushroom': return 'n'
      case 'bush': return '~'
    }
  }, [])

  // AI suggestion fetcher
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

      if (!res.ok) {
        suggestPendingRef.current = false
        return
      }

      const data = await res.json()
      if (data.suggestion) {
        const variant = PLANT_VARIANTS.find(v => v.id === data.suggestion.type)
          || PLANT_VARIANTS.find(v => v.category === data.suggestion.type)
          || PLANT_VARIANTS[Math.floor(Math.random() * PLANT_VARIANTS.length)]

        setSuggestion({
          variant,
          x: Math.max(0.05, Math.min(0.95, data.suggestion.x)),
          y: Math.max(0.3, Math.min(0.95, data.suggestion.y)),
          expiresAt: Date.now() + SUGGESTION_DURATION_MS,
        })
        setAnnouncement(`The garden suggests placing a ${variant.label}`)
      }
    } catch {
      // Silently fail — AI is invisible
    } finally {
      suggestPendingRef.current = false
    }
  }, [])

  // Place an element
  const placeElement = useCallback((x: number, y: number, variant: PlantVariant) => {
    const newEl: PlacedElement = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      variant,
      x,
      y,
      scale: 0.8 + Math.random() * 0.4,
      colorSeed: Math.random(),
      phase: Math.random() * Math.PI * 2,
      placedAt: Date.now(),
    }

    setElements(prev => {
      const next = [...prev, newEl]

      // Trigger AI suggestion after threshold
      if (next.length >= SUGGEST_THRESHOLD && suggestCountRef.current < 5) {
        // Only suggest every 3 placements after threshold
        if ((next.length - SUGGEST_THRESHOLD) % 3 === 0) {
          suggestCountRef.current++
          fetchSuggestion(next)
        }
      }

      return next
    })

    // Clear current suggestion on placement
    setSuggestion(null)
    setAnnouncement(`Placed ${variant.label} in your garden`)
  }, [fetchSuggestion])

  // Undo
  const undoLast = useCallback(() => {
    setElements(prev => {
      if (prev.length === 0) return prev
      const removed = prev[prev.length - 1]
      setAnnouncement(`Removed ${removed.variant.label}`)
      return prev.slice(0, -1)
    })
  }, [])

  // Clear garden
  const clearGarden = useCallback(() => {
    setElements([])
    setSuggestion(null)
    suggestCountRef.current = 0
    setShowClearConfirm(false)
    setAnnouncement('Garden cleared')
  }, [])

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    // Don't place in the sky area (top 25%)
    if (y < 0.25) return

    // Check if clicking on a suggestion
    if (suggestion && Date.now() < suggestion.expiresAt) {
      const dx = Math.abs(x - suggestion.x)
      const dy = Math.abs(y - suggestion.y)
      if (dx < 0.04 && dy < 0.04) {
        placeElement(suggestion.x, suggestion.y, suggestion.variant)
        return
      }
    }

    placeElement(x, y, selectedVariant)
  }, [selectedVariant, suggestion, placeElement])

  // Handle touch
  const handleCanvasTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const touch = e.touches[0]
    if (!touch) return

    const rect = canvas.getBoundingClientRect()
    const x = (touch.clientX - rect.left) / rect.width
    const y = (touch.clientY - rect.top) / rect.height

    if (y < 0.25) return

    if (suggestion && Date.now() < suggestion.expiresAt) {
      const dx = Math.abs(x - suggestion.x)
      const dy = Math.abs(y - suggestion.y)
      if (dx < 0.06 && dy < 0.06) {
        placeElement(suggestion.x, suggestion.y, suggestion.variant)
        return
      }
    }

    placeElement(x, y, selectedVariant)
  }, [selectedVariant, suggestion, placeElement])

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

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.target instanceof HTMLButtonElement) return

      const step = 0.03

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault()
          setKeyboardCursor(prev => {
            const cur = prev || { x: 0.5, y: 0.6 }
            return { x: cur.x, y: Math.max(0.25, cur.y - step) }
          })
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          setKeyboardCursor(prev => {
            const cur = prev || { x: 0.5, y: 0.6 }
            return { x: cur.x, y: Math.min(0.98, cur.y + step) }
          })
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          setKeyboardCursor(prev => {
            const cur = prev || { x: 0.5, y: 0.6 }
            return { x: Math.max(0.02, cur.x - step), y: cur.y }
          })
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          setKeyboardCursor(prev => {
            const cur = prev || { x: 0.5, y: 0.6 }
            return { x: Math.min(0.98, cur.x + step), y: cur.y }
          })
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (keyboardCursor) {
            placeElement(keyboardCursor.x, keyboardCursor.y, selectedVariant)
          }
          break
        }
        case 'z':
        case 'Z': {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            undoLast()
          }
          break
        }
        case 'Escape': {
          setKeyboardCursor(null)
          setPickerOpen(false)
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [keyboardCursor, selectedVariant, placeElement, undoLast])

  // Expire suggestion
  useEffect(() => {
    if (!suggestion) return
    const remaining = suggestion.expiresAt - Date.now()
    if (remaining <= 0) {
      setSuggestion(null)
      return
    }
    const timer = setTimeout(() => setSuggestion(null), remaining)
    return () => clearTimeout(timer)
  }, [suggestion])

  // Time of day for sky
  const timeOfDay = useMemo(() => getTimeOfDay(), [])

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

    const tick = (now: number) => {
      const w = canvas.width / dpr
      const h = canvas.height / dpr

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      // -- Sky gradient --
      const skyColors = COLORS.sky[timeOfDay]
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6)
      skyGrad.addColorStop(0, skyColors.top)
      skyGrad.addColorStop(1, skyColors.bottom)
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h * 0.6)

      // Stars at night
      if (timeOfDay === 'night') {
        drawStars(ctx, w, h, now)
      }

      // -- Ground gradient --
      const groundGrad = ctx.createLinearGradient(0, h * 0.55, 0, h)
      groundGrad.addColorStop(0, '#7db87d')
      groundGrad.addColorStop(0.4, '#5a9a5a')
      groundGrad.addColorStop(1, '#3d7a3d')
      ctx.fillStyle = groundGrad
      ctx.fillRect(0, h * 0.55, w, h * 0.45)

      // Gentle ground curve
      ctx.beginPath()
      ctx.moveTo(0, h * 0.58)
      ctx.quadraticCurveTo(w * 0.3, h * 0.54, w * 0.5, h * 0.56)
      ctx.quadraticCurveTo(w * 0.7, h * 0.58, w, h * 0.55)
      ctx.lineTo(w, h * 0.6)
      ctx.lineTo(0, h * 0.6)
      ctx.closePath()
      ctx.fillStyle = '#6aad6a'
      ctx.fill()

      // -- Draw elements (sorted by y for depth) --
      const sorted = [...elements].sort((a, b) => a.y - b.y)
      for (const el of sorted) {
        let sway = 0
        if (!prefersReducedMotion) {
          // Wind sway
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
        }
        drawElement(ctx, el, w, h, sway)
      }

      // -- Draw suggestion glow --
      if (suggestion && Date.now() < suggestion.expiresAt) {
        drawSuggestionGlow(ctx, suggestion, w, h, now)
      }

      // -- Draw keyboard cursor --
      if (keyboardCursor) {
        const kx = keyboardCursor.x * w
        const ky = keyboardCursor.y * h
        ctx.beginPath()
        ctx.arc(kx, ky, 8, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(230, 57, 70, 0.8)'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 3])
        ctx.stroke()
        ctx.setLineDash([])

        // Crosshair
        ctx.beginPath()
        ctx.moveTo(kx - 12, ky)
        ctx.lineTo(kx + 12, ky)
        ctx.moveTo(kx, ky - 12)
        ctx.lineTo(kx, ky + 12)
        ctx.strokeStyle = 'rgba(230, 57, 70, 0.4)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      ctx.restore()

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      ro.disconnect()
    }
  }, [elements, suggestion, keyboardCursor, prefersReducedMotion, timeOfDay])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="max-w-4xl mx-auto"
      role="application"
      aria-label="The Gardener - a calm garden where you place plants"
    >
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Canvas */}
      <div className="relative bg-card-bg border border-card-border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full aspect-[4/3] cursor-crosshair"
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasTouch}
          onMouseMove={handleMouseMove}
          role="img"
          aria-label={`Garden with ${elements.length} ${elements.length === 1 ? 'plant' : 'plants'}. Click to place ${selectedVariant.label}.`}
          tabIndex={0}
        />

        {/* Stats overlay */}
        <div className="absolute top-3 right-3 text-xs text-white/60 bg-black/20 rounded px-2 py-1 select-none pointer-events-none">
          {elements.length} {elements.length === 1 ? 'plant' : 'plants'}
        </div>

        {/* Suggestion hint */}
        {suggestion && (
          <div className="absolute top-3 left-3 text-xs text-white/60 bg-black/20 rounded px-2 py-1 select-none pointer-events-none animate-fade">
            The garden has a suggestion...
          </div>
        )}
      </div>

      {/* Plant picker bar */}
      <div className="mt-3 bg-card-bg border border-card-border rounded-lg p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-foreground/50 sr-only">
            Select a plant type, then click on the garden to place it
          </span>
          <button
            className="text-xs text-foreground/50 hover:text-foreground/80 transition-colors sm:hidden"
            onClick={() => setPickerOpen(!pickerOpen)}
            aria-expanded={pickerOpen}
            aria-controls="plant-picker"
          >
            {pickerOpen ? 'Hide plants' : `${selectedVariant.label} (tap to change)`}
          </button>
        </div>

        <div
          id="plant-picker"
          className={cn(
            'flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin',
            !pickerOpen && 'hidden sm:flex',
          )}
          role="radiogroup"
          aria-label="Plant type selector"
        >
          {PLANT_VARIANTS.map(variant => (
            <button
              key={variant.id}
              role="radio"
              aria-checked={selectedVariant.id === variant.id}
              onClick={() => {
                setSelectedVariant(variant)
                setPickerOpen(false)
              }}
              className={cn(
                'flex-shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded text-xs transition-all duration-75',
                'focus:outline-none focus:ring-2 focus:ring-accent',
                selectedVariant.id === variant.id
                  ? 'bg-accent/10 border border-accent text-foreground'
                  : 'bg-transparent border border-transparent text-foreground/60 hover:bg-hover-bg hover:text-foreground',
              )}
              title={variant.label}
            >
              <span className="text-base font-mono leading-none mb-0.5" aria-hidden="true">
                {categorySymbol(variant.category)}
              </span>
              <span className="whitespace-nowrap">{variant.label}</span>
            </button>
          ))}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-card-border">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={undoLast}
              disabled={elements.length === 0}
              aria-label="Undo last placement"
            >
              <Undo2 className="w-4 h-4 mr-1" aria-hidden="true" />
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
                <Trash2 className="w-4 h-4 mr-1" aria-hidden="true" />
                Clear
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-foreground/60">Clear all?</span>
                <Button variant="danger" size="sm" onClick={clearGarden}>
                  Yes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(false)}>
                  No
                </Button>
              </div>
            )}
          </div>
          <div className="text-xs text-foreground/40 hidden sm:block">
            {categoryLabel(selectedVariant.category)}: {selectedVariant.label}
          </div>
        </div>
      </div>

      {/* Keyboard instructions */}
      <div className="text-center mt-3 text-xs text-foreground/30">
        <p>Click or tap to place. Arrow keys to move cursor, Enter to place. Ctrl+Z to undo.</p>
      </div>
    </div>
  )
}
