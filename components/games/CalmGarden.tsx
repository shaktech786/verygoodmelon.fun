'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Undo2, Trash2, Sunset } from 'lucide-react'
import { Button, buttonClassName } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import {
  GROUND_TOP,
  PLANT_VARIANTS,
  STORAGE_KEY,
  categoryOf,
  createPlant,
  livingCount,
  loadGarden,
  plantedSince,
  returnToGarden,
  isSouthernTimeZone,
  seasonAt,
  timeOfDayAt,
  variantOf,
  visitorCount,
  visitorHosts,
  type Garden,
  type Plant,
  type PlantCategory,
  type PlantType,
  type Season,
  type TimeOfDay,
} from '@/lib/games/calm-garden/garden'
import { countOf, describePlace, describeSpot, gardenSummary, nameOf, numberWord, sitLine } from '@/lib/games/calm-garden/describe'
import { parseSuggestion, suggestLocally, type Suggestion } from '@/lib/games/calm-garden/suggest'
import { plantAtPoint, plantSize, sizeFactor, depthFactor } from '@/lib/games/calm-garden/geometry'
import { drawGround, drawMarker, drawPlant, drawSitLight, drawSky, drawVisitor } from './calm-garden/draw'

const SUGGEST_EVERY = 3
const MAX_SUGGESTIONS = 5
const SIT_MS = 45_000
const READY_TO_SIT = 3
const HISTORY_LIMIT = 40
const STEP = 0.03
const DRAG_PX = 8
const GROW_MS = 700
const START: Point = { x: 0.5, y: 0.75 }

interface Point {
  x: number
  y: number
}

interface Scene {
  plants: Plant[]
  suggestion: Suggestion | null
  cursor: Point | null
  selectedId: string | null
  movingId: string | null
  sitting: boolean
  sitStart: number
  still: boolean
}

interface PointerTrack {
  pointerId: number
  startX: number
  startY: number
  hitId: string | null
  dragging: boolean
}

const clampToGround = ({ x, y }: Point): Point => ({
  x: Math.min(0.98, Math.max(0.02, x)),
  y: Math.min(0.98, Math.max(GROUND_TOP, y)),
})

const ICON_SCALE: Record<PlantCategory, number> = { flower: 0.85, tree: 0.5, stone: 1.3, mushroom: 1.3, bush: 1.1 }
const ICON_SIZE = 40

// Each picker button shows the plant drawn by the same code as the garden.
function PlantIcon({ type, season }: { type: PlantType; season: Season }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = ICON_SIZE * dpr
    canvas.height = ICON_SIZE * dpr
    ctx.scale(dpr, dpr)
    drawPlant(ctx, type, ICON_SIZE / 2, ICON_SIZE - 4, ICON_SCALE[categoryOf(type)], 0.35, 0, season)
  }, [type, season])
  return <canvas ref={ref} className="w-10 h-10" aria-hidden="true" />
}

function visitorsSentence(count: number, kind: 'butterfly' | 'firefly'): string {
  if (count === 0) return ''
  const plural = kind === 'butterfly' ? 'butterflies' : 'fireflies'
  return count === 1 ? ` A ${kind} is visiting.` : ` ${numberWord(count).replace(/^./, (c) => c.toUpperCase())} ${plural} are visiting.`
}

export default function CalmGarden() {
  const [garden, setGarden] = useState<Garden | null>(null)
  const [clock, setClock] = useState<{ tod: TimeOfDay; season: Season }>({ tod: 'day', season: 'summer' })
  const [selectedType, setSelectedType] = useState<PlantType>('daisy')
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [moving, setMoving] = useState<{ id: string; from: Point } | null>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [sitAt, setSitAt] = useState<number | null>(null)
  const [sitDone, setSitDone] = useState(false)
  const [history, setHistory] = useState<Plant[][]>([])
  const still = useReducedMotion()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sitButtonRef = useRef<HTMLButtonElement>(null)
  const standButtonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listSummaryRef = useRef<HTMLElement>(null)
  const pointerRef = useRef<PointerTrack | null>(null)
  const dragAtRef = useRef<{ id: string; at: Point } | null>(null)
  const mouseRef = useRef<Point>({ x: -1, y: -1 })
  const sitStartRef = useRef(0)
  const suggestPendingRef = useRef(false)
  const suggestCountRef = useRef(0)
  const sinceSuggestRef = useRef(0)
  const sceneRef = useRef<Scene>({ plants: [], suggestion: null, cursor: null, selectedId: null, movingId: null, sitting: false, sitStart: 0, still: false })

  const plants = useMemo(() => garden?.plants ?? [], [garden])
  const sitting = sitAt !== null
  const visitorKind = clock.tod === 'night' ? 'firefly' : 'butterfly'
  const visitors = visitorCount(plants, false)
  const canSit = livingCount(plants) >= READY_TO_SIT
  const selected = plants.find((p) => p.id === selectedId) ?? null
  const movingPlant = moving ? plants.find((p) => p.id === moving.id) ?? null : null

  // Load once on the client. A garden left for a while has grown, and may have
  // seeded a flower of its own.
  useEffect(() => {
    const now = Date.now()
    let raw: string | null = null
    try {
      raw = localStorage.getItem(STORAGE_KEY)
    } catch {
      // Storage can be blocked; the garden simply starts fresh.
    }
    const back = returnToGarden(loadGarden(raw, now), now, Math.random)
    const southern = isSouthernTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    setClock({ tod: timeOfDayAt(new Date(now)), season: seasonAt(new Date(now), southern) })
    setGarden(back.garden)
    if (back.note) {
      setNote(back.note)
      setAnnouncement(back.note)
    }
  }, [])

  useEffect(() => {
    if (!garden) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...garden, lastVisit: Date.now() }))
    } catch {
      // Storage full or blocked: the garden still works for this visit.
    }
  }, [garden])

  useEffect(() => {
    sceneRef.current = { plants, suggestion, cursor, selectedId, movingId: moving?.id ?? null, sitting, sitStart: sitStartRef.current, still }
  })

  // ---------------------------------------------------------------------------
  // Changing the garden
  // ---------------------------------------------------------------------------

  const setPlants = useCallback((next: Plant[]) => {
    setGarden((g) => (g ? { ...g, plants: next } : g))
  }, [])

  const remember = useCallback((before: Plant[]) => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), before])
  }, [])

  // `said` is what was just announced for the planting, so the idea is heard after it, not instead of it.
  const fetchSuggestion = useCallback(async (current: Plant[], said: string, season: Season, timeOfDay: TimeOfDay) => {
    if (suggestPendingRef.current) return
    suggestPendingRef.current = true
    const spots = current.slice(-120).map(({ type, x, y }) => ({ type, x, y }))
    let next: Suggestion | null = null
    try {
      const res = await fetch('/api/calm-garden/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements: spots, season, timeOfDay }),
      })
      if (res.ok) next = parseSuggestion((await res.json())?.suggestion, timeOfDay)
    } catch {
      // Unreachable: the garden answers from its own rules below.
    } finally {
      suggestPendingRef.current = false
    }
    const idea = next ?? suggestLocally(spots, Math.random())
    setSuggestion(idea)
    const offer = `${idea.line} You can plant it there, or leave it for now.`
    setAnnouncement((prev) => (prev === said ? `${said} ${offer}` : offer))
  }, [])

  const plantNew = useCallback((type: PlantType, at: Point) => {
    const plant = createPlant(type, at.x, at.y, Date.now(), Math.random)
    const next = [...plants, plant]
    remember(plants)
    setPlants(next)
    setNote(null)
    setSelectedId(null)

    let message = `Planted ${countOf(1, type)} ${describePlace(plant, next)}.`
    if (visitorCount(next, false) > visitorCount(plants, false)) {
      message += clock.tod === 'night' ? ' A firefly has found your garden.' : ' A butterfly has found your garden.'
    }
    if (livingCount(plants) < READY_TO_SIT && livingCount(next) >= READY_TO_SIT) {
      message += ' Your garden is ready to sit with, whenever you like.'
    }
    setAnnouncement(message)

    sinceSuggestRef.current++
    // An idea on offer stays until it is planted or set aside, so no new one replaces it.
    const offerOpen = suggestion !== null && !(suggestion.type === type && suggestion.x === at.x && suggestion.y === at.y)
    if (!offerOpen && next.length >= SUGGEST_EVERY && sinceSuggestRef.current >= SUGGEST_EVERY && suggestCountRef.current < MAX_SUGGESTIONS) {
      sinceSuggestRef.current = 0
      suggestCountRef.current++
      void fetchSuggestion(next, message, clock.season, clock.tod)
    }
  }, [plants, remember, setPlants, fetchSuggestion, clock.tod, clock.season, suggestion])

  const placeAt = useCallback((id: string, at: Point) => {
    setPlants(plants.map((p) => (p.id === id ? { ...p, ...clampToGround(at) } : p)))
  }, [plants, setPlants])

  const removePlant = useCallback((id: string) => {
    const plant = plants.find((p) => p.id === id)
    if (!plant) return
    remember(plants)
    setPlants(plants.filter((p) => p.id !== id))
    setSelectedId(null)
    setAnnouncement(`Removed the ${nameOf(plant.type)}.`)
  }, [plants, remember, setPlants])

  const startMove = useCallback((id: string, withKeys: boolean) => {
    const plant = plants.find((p) => p.id === id)
    if (!plant) return
    remember(plants)
    setMoving({ id, from: { x: plant.x, y: plant.y } })
    setSelectedId(null)
    const name = nameOf(plant.type)
    if (withKeys) {
      setCursor(null)
      canvasRef.current?.focus()
      setAnnouncement(`Moving the ${name}. Arrow keys move it, Enter sets it down, Escape puts it back.`)
    } else {
      setAnnouncement(`Tap the grass where the ${name} should go.`)
    }
  }, [plants, remember])

  const finishMove = useCallback(() => {
    if (!movingPlant) return
    setMoving(null)
    setAnnouncement(`Set the ${nameOf(movingPlant.type)} down ${describePlace(movingPlant, plants)}.`)
  }, [movingPlant, plants])

  const cancelMove = useCallback(() => {
    if (!moving) return
    setHistory((h) => h.slice(0, -1))
    placeAt(moving.id, moving.from)
    setMoving(null)
    setAnnouncement('Put it back where it was.')
  }, [moving, placeAt])

  const undo = useCallback(() => {
    const previous = history.at(-1)
    if (!previous) return
    setHistory(history.slice(0, -1))
    setPlants(previous)
    setMoving(null)
    setSelectedId(null)
    setAnnouncement('Undone.')
  }, [history, setPlants])

  const clearGarden = useCallback(() => {
    remember(plants)
    setPlants([])
    setSuggestion(null)
    setSelectedId(null)
    setNote(null)
    suggestCountRef.current = 0
    sinceSuggestRef.current = 0
    setShowClearConfirm(false)
    setAnnouncement('Garden cleared. Undo brings it back.')
  }, [plants, remember, setPlants])

  const acceptSuggestion = useCallback(() => {
    if (!suggestion) return
    setSuggestion(null)
    plantNew(suggestion.type, suggestion)
  }, [suggestion, plantNew])

  const dismissSuggestion = useCallback(() => {
    setSuggestion(null)
    setAnnouncement('Left it for now.')
  }, [])

  // ---------------------------------------------------------------------------
  // Sitting with the garden
  // ---------------------------------------------------------------------------

  const startSit = useCallback(() => {
    if (moving) cancelMove()
    setSelectedId(null)
    setCursor(null)
    setSitDone(false)
    sitStartRef.current = performance.now()
    setSitAt(Date.now())
  }, [moving, cancelMove])

  const standUp = useCallback(() => {
    setSitAt(null)
    setSitDone(false)
    setAnnouncement('You stand up. The garden is still here.')
    requestAnimationFrame(() => sitButtonRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!sitting) return
    standButtonRef.current?.focus()
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = 'hidden'
    const timer = window.setTimeout(() => setSitDone(true), SIT_MS)
    return () => {
      window.clearTimeout(timer)
      root.style.overflow = overflow
    }
  }, [sitting])

  const sitVisitors = visitorCount(plants, true)
  const sitKind = clock.tod === 'night' || clock.tod === 'evening' ? 'firefly' : 'butterfly'
  const closingLine = useMemo(() => {
    if (sitAt === null) return ''
    return sitLine({
      plants,
      visitors: sitVisitors,
      visitorKind: sitKind,
      before: visitors,
      kindBefore: visitorKind,
      season: clock.season,
      since: plantedSince(plants, sitAt),
      now: sitAt,
    })
  }, [plants, sitVisitors, sitKind, visitors, visitorKind, clock.season, sitAt])

  const handleSitKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      standUp()
    } else if (e.key === 'Tab') {
      // The only control while sitting is "Stand up"; focus stays with it.
      e.preventDefault()
      standButtonRef.current?.focus()
    }
  }, [standUp])

  // ---------------------------------------------------------------------------
  // Pointer: tap to plant, tap a plant to choose it, drag a plant to move it
  // ---------------------------------------------------------------------------

  const toGarden = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (sitting || e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const hit = moving ? null : plantAtPoint(e.clientX - rect.left, e.clientY - rect.top, plants, rect.width, rect.height, Date.now())
    pointerRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, hitId: hit?.id ?? null, dragging: false }
    if (hit) e.currentTarget.setPointerCapture(e.pointerId)
  }, [sitting, moving, plants])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const at = toGarden(e)
    if (e.pointerType === 'mouse') mouseRef.current = at
    const track = pointerRef.current
    if (!track || track.pointerId !== e.pointerId || !track.hitId) return
    if (!track.dragging && Math.hypot(e.clientX - track.startX, e.clientY - track.startY) > DRAG_PX) {
      track.dragging = true
      setSelectedId(null)
    }
    if (track.dragging) dragAtRef.current = { id: track.hitId, at: clampToGround(at) }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const track = pointerRef.current
    pointerRef.current = null
    const drag = dragAtRef.current
    dragAtRef.current = null
    if (!track || track.pointerId !== e.pointerId) return
    const at = toGarden(e)

    if (track.dragging && track.hitId && drag) {
      const plant = plants.find((p) => p.id === track.hitId)
      if (!plant) return
      remember(plants)
      const next = plants.map((p) => (p.id === plant.id ? { ...p, ...drag.at } : p))
      setPlants(next)
      setAnnouncement(`Moved the ${nameOf(plant.type)} ${describePlace({ ...plant, ...drag.at }, next)}.`)
      return
    }
    // A swipe across empty grass is a scroll attempt, not a planting.
    if (Math.hypot(e.clientX - track.startX, e.clientY - track.startY) > DRAG_PX) return

    if (moving) {
      placeAt(moving.id, at)
      setMoving(null)
      const plant = plants.find((p) => p.id === moving.id)
      if (plant) setAnnouncement(`Set the ${nameOf(plant.type)} down ${describePlace({ ...plant, ...clampToGround(at) }, plants)}.`)
      return
    }
    if (track.hitId) {
      const plant = plants.find((p) => p.id === track.hitId)
      setSelectedId(track.hitId)
      if (plant) setAnnouncement(`${variantOf(plant.type).label}, ${describePlace(plant, plants)}. You can move or remove it.`)
      return
    }
    if (at.y < GROUND_TOP) {
      setAnnouncement('That is sky. Plants need the grass below.')
      return
    }
    if (suggestion && Math.abs(at.x - suggestion.x) < 0.05 && Math.abs(at.y - suggestion.y) < 0.05) {
      acceptSuggestion()
      return
    }
    plantNew(selectedType, at)
  }, [plants, moving, suggestion, selectedType, remember, setPlants, placeAt, acceptSuggestion, plantNew])

  const handlePointerCancel = useCallback(() => {
    pointerRef.current = null
    dragAtRef.current = null
  }, [])

  // ---------------------------------------------------------------------------
  // Keyboard: arrows move a planting spot (or the plant being moved), Enter acts
  // ---------------------------------------------------------------------------

  const handleCanvasFocus = useCallback((e: React.FocusEvent<HTMLCanvasElement>) => {
    // Only show the planting spot to keyboard users, not after a mouse click.
    if (e.currentTarget.matches(':focus-visible') && !moving) setCursor((c) => c ?? START)
  }, [moving])

  const handleCanvasKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const from = movingPlant ?? cursor ?? START
    const delta: Record<string, Point> = {
      ArrowUp: { x: 0, y: -STEP },
      ArrowDown: { x: 0, y: STEP },
      ArrowLeft: { x: -STEP, y: 0 },
      ArrowRight: { x: STEP, y: 0 },
    }
    const d = delta[e.key]
    if (d) {
      e.preventDefault()
      const to = clampToGround({ x: from.x + d.x, y: from.y + d.y })
      if (movingPlant) {
        placeAt(movingPlant.id, to)
        setAnnouncement(describeSpot(to.x, to.y, plants.filter((p) => p.id !== movingPlant.id)))
      } else {
        setCursor(to)
        setAnnouncement(describeSpot(to.x, to.y, plants))
      }
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (movingPlant) {
        finishMove()
      } else {
        setCursor(from)
        plantNew(selectedType, from)
      }
    } else if (e.key === 'Escape') {
      if (moving) cancelMove()
      else setCursor(null)
    }
  }, [movingPlant, cursor, moving, plants, selectedType, placeAt, finishMove, cancelMove, plantNew])

  const handleRootKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (sitting) return
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      undo()
    }
  }, [sitting, undo])

  const handlePickerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown'
    const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
    if (!forward && !back) return
    e.preventDefault()
    const idx = PLANT_VARIANTS.findIndex((v) => v.id === selectedType)
    const next = PLANT_VARIANTS[(idx + (forward ? 1 : -1) + PLANT_VARIANTS.length) % PLANT_VARIANTS.length]
    setSelectedType(next.id)
    document.getElementById(`plant-${next.id}`)?.focus()
  }, [selectedType])

  const removeFromList = useCallback((id: string, index: number) => {
    removePlant(id)
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-remove]')
      const target = buttons?.[index] ?? buttons?.[index - 1] ?? listSummaryRef.current
      target?.focus()
    })
  }, [removePlant])

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    let frame = 0

    const tick = (frameTime: number) => {
      const scene = sceneRef.current
      // A frozen clock keeps sky, sway and visitors still for reduced motion.
      const time = scene.still ? 0 : frameTime
      const wallNow = Date.now()
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      const k = sizeFactor(w)
      const drag = dragAtRef.current
      const shown = drag ? scene.plants.map((p) => (p.id === drag.id ? { ...p, ...drag.at } : p)) : scene.plants
      const light = scene.sitting ? Math.min(1, (performance.now() - scene.sitStart) / SIT_MS) : 0

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      drawSky(ctx, w, h, clock.tod, time, light)
      drawGround(ctx, w, h, clock.tod, clock.season, shown.filter((p) => categoryOf(p.type) === 'tree'), light)

      for (const p of [...shown].sort((a, b) => a.y - b.y)) {
        let sway = 0
        let grow = 1
        if (!scene.still) {
          sway = Math.sin(time * 0.001 + p.phase) * 3 * p.scale
          const m = mouseRef.current
          if (m.x >= 0) {
            const dx = p.x - m.x
            const dist = Math.hypot(dx, p.y - m.y)
            if (dist < 0.15 && dist > 0.01) sway += ((0.15 - dist) / 0.15) * 5 * Math.sign(dx)
          }
          const age = (wallNow - p.plantedAt) / GROW_MS
          if (age >= 0 && age < 1) grow = Math.max(0.05, 1 + 2.4 * Math.pow(age - 1, 3) + 1.4 * Math.pow(age - 1, 2))
        }
        const s = plantSize(p, w, wallNow) * grow
        const x = p.x * w
        const y = p.y * h
        ctx.beginPath()
        ctx.ellipse(x, y, 10 * s, 3 * s, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.13)'
        ctx.fill()
        drawPlant(ctx, p.type, x, y, s, p.colorSeed, sway * k, clock.season)
        if (p.id === scene.selectedId || p.id === scene.movingId || p.id === drag?.id) drawMarker(ctx, x, y + 1, 20 * s, 6 * s, true)
      }

      if (scene.suggestion && !scene.sitting) {
        const sx = scene.suggestion.x * w
        const sy = scene.suggestion.y * h
        const s = k * depthFactor(scene.suggestion.y)
        ctx.save()
        ctx.globalAlpha = scene.still ? 0.85 : 0.7 + Math.sin(time * 0.002) * 0.2
        ctx.beginPath()
        ctx.ellipse(sx, sy, 26 * s, 9 * s, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 250, 220, 0.45)'
        ctx.fill()
        drawMarker(ctx, sx, sy, 26 * s, 9 * s, false)
        ctx.globalAlpha *= 0.5
        drawPlant(ctx, scene.suggestion.type, sx, sy, s, 0.4, 0, clock.season)
        ctx.restore()
      }

      if (scene.sitting) drawSitLight(ctx, w, h, clock.tod, light)

      const count = scene.sitting ? visitorCount(scene.plants, true) : visitorCount(scene.plants, false)
      const flowers = visitorHosts(shown)
      const hosts = flowers.length ? flowers : shown.filter((p) => categoryOf(p.type) !== 'stone')
      // While sitting, visitors arrive one by one over the first part of the light.
      const arrived = scene.sitting && !scene.still ? Math.min(count, Math.ceil(light * 4 * count)) : count
      const kind = clock.tod === 'night' || (scene.sitting && clock.tod === 'evening' && light > 0.45) ? 'firefly' : 'butterfly'
      for (let i = 0; i < arrived && hosts.length; i++) {
        const hop = time / 7000 + i * 0.41
        const step = Math.floor(hop)
        const t = Math.min(1, (hop - step) * 3)
        // Still visitors each rest on their own flower rather than mid-journey.
        const a = scene.still ? hosts[i % hosts.length] : hosts[(step * 5 + i * 3) % hosts.length]
        const b = scene.still ? a : hosts[((step + 1) * 5 + i * 3) % hosts.length]
        const lift = (p: Plant) => p.y * h - 34 * k * depthFactor(p.y)
        const ease = 0.5 - Math.cos(t * Math.PI) / 2
        const vx = a.x * w + (b.x * w - a.x * w) * ease + Math.sin(time * 0.0009 + i) * 6
        const vy = lift(a) + (lift(b) - lift(a)) * ease - Math.sin(t * Math.PI) * 30 + Math.cos(time * 0.0013 + i) * 4
        drawVisitor(ctx, kind, vx, vy, k, i, time, scene.still)
      }

      if (scene.cursor && !scene.sitting && !scene.movingId) drawMarker(ctx, scene.cursor.x * w, scene.cursor.y * h, 12, 5, true)

      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [clock])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const smallButton = 'rounded-md px-3 py-1.5 font-medium hover:bg-hover-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'
  const mainButton = 'rounded-md px-3 py-1.5 font-medium bg-melon-green text-background hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1'

  let status: React.ReactNode = null
  if (movingPlant) {
    status = (
      <>
        <p>
          Tap the grass where the {nameOf(movingPlant.type)} should go
          <span className="hidden pointer-fine:inline">, or use the arrow keys and Enter</span>.
        </p>
        <button type="button" onClick={cancelMove} className={smallButton}>Cancel</button>
      </>
    )
  } else if (selected) {
    const place = describePlace(selected, plants)
    status = (
      <>
        <p><span className="font-medium">{variantOf(selected.type).label}</span>, {place}. Drag it, or:</p>
        <span className="flex gap-1.5">
          <button type="button" onClick={() => startMove(selected.id, false)} className={mainButton}>Move</button>
          <button type="button" onClick={() => removePlant(selected.id)} className={smallButton}>Remove</button>
          <button type="button" onClick={() => setSelectedId(null)} className={smallButton}>Done</button>
        </span>
      </>
    )
  } else if (suggestion) {
    status = (
      <>
        <p>{suggestion.line}</p>
        <span className="flex gap-1.5">
          <button type="button" onClick={acceptSuggestion} className={mainButton}>
            Plant the {nameOf(suggestion.type)} there
          </button>
          <button type="button" onClick={dismissSuggestion} className={smallButton}>Not now</button>
        </span>
      </>
    )
  } else if (note) {
    status = <p>{note}</p>
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-4" onKeyDown={handleRootKeyDown}>
      <div id="garden-announcer" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div>
        <div
          className={cn(sitting && 'fixed inset-0 z-[80] flex flex-col items-center justify-center gap-5 bg-background p-4 animate-fade')}
          role={sitting ? 'dialog' : undefined}
          aria-modal={sitting ? true : undefined}
          aria-labelledby={sitting ? 'sit-title' : undefined}
          aria-describedby={sitting ? 'sit-words' : undefined}
          onKeyDown={sitting ? handleSitKeyDown : undefined}
        >
          {sitting && <h2 id="sit-title" className="sr-only">Sitting with your garden</h2>}
          <div
            className={cn(
              'relative w-full overflow-hidden border border-card-border bg-card-bg',
              sitting ? 'max-w-[calc((100svh-13rem)*1.6)] rounded-lg' : status ? 'rounded-t-lg' : 'rounded-lg',
            )}
          >
            <canvas
              ref={canvasRef}
              className={cn(
                'block w-full touch-none',
                sitting
                  ? 'aspect-square sm:aspect-[16/10]'
                  : 'aspect-[4/3] sm:aspect-[16/10] lg:max-h-[calc(100svh-15rem)] cursor-crosshair focus-visible:outline-4! focus-visible:outline-solid! focus-visible:outline-focus-ring! focus-visible:-outline-offset-4!',
              )}
              role="application"
              aria-label="Your garden"
              aria-describedby="garden-contents garden-keys"
              aria-hidden={sitting || undefined}
              tabIndex={sitting ? -1 : 0}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={() => (mouseRef.current = { x: -1, y: -1 })}
              onFocus={handleCanvasFocus}
              onKeyDown={sitting ? undefined : handleCanvasKeyDown}
            />
            <p id="garden-contents" className="sr-only">
              In your garden: {gardenSummary(plants)}.{visitorsSentence(visitors, visitorKind)}
            </p>
            <p id="garden-keys" className="sr-only" hidden={sitting}>
              {movingPlant
                ? `Arrow keys move the ${nameOf(movingPlant.type)}, Enter sets it down, Escape puts it back.`
                : `Arrow keys move the planting spot and Enter plants ${countOf(1, selectedType)}. The list of what is planted is beside the garden.`}
            </p>
            {garden && plants.length === 0 && !sitting && (
              <p className="absolute inset-x-0 bottom-6 mx-auto w-fit max-w-[85%] text-center text-sm text-white bg-black/55 rounded-full px-4 py-1.5 select-none pointer-events-none">
                Choose a plant, then tap the grass.
              </p>
            )}
          </div>

          {sitting && (
            <>
              <p id="sit-words" aria-live="polite" className="min-h-[5.5rem] max-w-xl text-center text-base leading-relaxed text-foreground sm:text-lg">
                {sitDone ? closingLine : <span className="text-foreground/70">The light is changing. Stay as long as you like.</span>}
              </p>
              <button ref={standButtonRef} type="button" onClick={standUp} className={buttonClassName('secondary', 'md')}>
                Stand up
              </button>
            </>
          )}
        </div>

        {status && !sitting && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-b-lg border border-t-0 border-card-border bg-success/15 px-3 py-2 text-sm text-foreground">
            {status}
          </div>
        )}
      </div>

      <section aria-label="Gardening tools" inert={sitting} className="mt-3 rounded-lg border border-card-border bg-card-bg p-3 lg:mt-0">
        <div
          id="plant-picker"
          className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-3"
          role="radiogroup"
          aria-label="Plant to place"
          onKeyDown={handlePickerKeyDown}
        >
          {PLANT_VARIANTS.map((variant) => (
            <button
              key={variant.id}
              id={`plant-${variant.id}`}
              type="button"
              role="radio"
              aria-checked={selectedType === variant.id}
              tabIndex={selectedType === variant.id ? 0 : -1}
              onClick={() => setSelectedType(variant.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-1 pt-1.5 pb-1 text-[11px] leading-tight transition-colors duration-75',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                selectedType === variant.id
                  ? 'bg-chosen border border-chosen-line text-foreground'
                  : 'border border-transparent text-foreground/80 hover:bg-hover-bg hover:text-foreground',
              )}
            >
              {/* The plants are drawn in daylight colours, so their tile stays a light meadow green in every theme */}
              <span className="rounded-md bg-[#d6ecdd] p-0.5">
                <PlantIcon type={variant.id} season={clock.season} />
              </span>
              <span className="text-center">{variant.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
          <Button variant="ghost" size="sm" onClick={undo} disabled={history.length === 0} aria-label="Undo last change">
            <Undo2 className="inline w-4 h-4 mr-1 -mt-0.5" aria-hidden="true" />
            Undo
          </Button>
          {!showClearConfirm ? (
            <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)} disabled={plants.length === 0} aria-label="Clear garden">
              <Trash2 className="inline w-4 h-4 mr-1 -mt-0.5" aria-hidden="true" />
              Clear
            </Button>
          ) : (
            <span className="flex items-center gap-1">
              <span className="text-sm text-foreground/80">Clear all?</span>
              <Button variant="danger" size="sm" onClick={clearGarden}>Yes</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(false)}>No</Button>
            </span>
          )}
        </div>

        <button
          ref={sitButtonRef}
          type="button"
          onClick={startSit}
          disabled={!canSit}
          aria-describedby="sit-hint"
          className={cn(
            'mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-opacity duration-75',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
            canSit ? 'bg-melon-green text-background hover:opacity-90' : 'bg-foreground/10 text-foreground/60 cursor-not-allowed',
          )}
        >
          <Sunset className="h-4 w-4" aria-hidden="true" />
          Sit with your garden
        </button>
        <p id="sit-hint" className="mt-1 text-center text-xs text-foreground/70">
          {canSit ? 'Rest a minute while the light changes.' : 'Once three things are growing.'}
        </p>

        <details
          className="mt-3 border-t border-card-border pt-2"
          onToggle={(e) => {
            const details = e.currentTarget
            setListOpen(details.open)
            if (details.open) requestAnimationFrame(() => details.scrollIntoView({ block: 'nearest' }))
          }}
        >
          <summary ref={listSummaryRef} className="cursor-pointer rounded text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
            What&apos;s in your garden
          </summary>
          {listOpen && (plants.length === 0 ? (
            <p className="mt-2 text-sm text-foreground/70">Nothing yet.</p>
          ) : (
            <ul ref={listRef} className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
              {plants.map((p, i) => {
                const place = describePlace(p, plants)
                const name = nameOf(p.type)
                return (
                  <li key={p.id} className="flex items-center gap-1 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{variantOf(p.type).label}</span>,{' '}
                      <span className="text-foreground/70">{place}{p.selfSown ? ' (came up on its own)' : ''}</span>
                    </span>
                    <button type="button" onClick={() => startMove(p.id, true)} aria-label={`Move the ${name}, ${place}`} className={cn(smallButton, 'px-2 text-xs')}>
                      Move
                    </button>
                    <button type="button" data-remove onClick={() => removeFromList(p.id, i)} aria-label={`Remove the ${name}, ${place}`} className={cn(smallButton, 'px-2 text-xs')}>
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          ))}
        </details>

        <p className="mt-3 hidden text-xs text-foreground/70 pointer-fine:block">
          Keys: Tab to the garden, arrows move, Enter plants, Ctrl+Z undoes.
        </p>
      </section>
    </div>
  )
}
