'use client'

import { EXTRA_TIMEOUT_MS } from '@/lib/games/reply-timeout'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Go } from '@/components/seedpress/Go'
import { InlineConfirm } from '@/components/seedpress/InlineConfirm'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { Stamp } from '@/components/seedpress/Stamp'
import { cn } from '@/lib/utils/cn'
import { useInks } from '@/lib/design/inks'
import { useSense } from '@/lib/design/sense'
import {
  GROUND_TOP,
  PLANT_VARIANTS,
  STORAGE_KEY,
  categoryOf,
  createPlant,
  growthFactor,
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
import {
  ARRIVAL_FLIGHT_MS,
  RETURN_MS,
  SETTLE_MS,
  WHOLE,
  arrivalLine,
  arrivalTimes,
  ease,
  glowAt,
  growthShown,
  mixCamera,
  returnCamera,
  sitFraction,
  visitorKindAt,
} from '@/lib/games/calm-garden/moments'
import { gardenerKeepsake } from '@/lib/keepsake/gardener'
import type { KeepsakePlan } from '@/lib/keepsake/plan'
import { Keepsake } from '@/components/games/Keepsake'
import { useLoadedOnClient } from '@/lib/hooks/useLoadedOnClient'
import { drawGround, drawMarker, drawNewGrowth, drawPlant, drawSitLight, drawSky, drawVisitor } from './calm-garden/draw'
import { Icon } from '@/components/seedpress/icons/Icon'
import { alpha, gardenColours } from './calm-garden/inks'
import styles from './CalmGarden.module.css'

const SUGGEST_EVERY = 3
const MAX_SUGGESTIONS = 5
const SIT_MS = 45_000
// The sky ink's cross-fade into the sit-down light (S3); the sun then sinks slowly over SIT_MS
const LIGHT_FADE_MS = 1600
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
  arrivals: ArrivalPlan
  arrived: number
}

/** Visitors already here when someone sat down, and when (fractions of the sit) each of the rest arrives. */
interface ArrivalPlan {
  before: number
  times: number[]
}

/** The look across a garden that grew while it was left. `grew` maps each changed plant to its growth at the last visit. */
interface ReturnLook {
  start: number
  skipAt: number | null
  grew: Map<string, number>
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
  const inks = useInks()
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = ICON_SIZE * dpr
    canvas.height = ICON_SIZE * dpr
    ctx.scale(dpr, dpr)
    drawPlant(ctx, gardenColours(inks), type, ICON_SIZE / 2, ICON_SIZE - 4, ICON_SCALE[categoryOf(type)], 0.35, 0, season)
  }, [type, season, inks])
  return <canvas ref={ref} className="size-10" aria-hidden="true" />
}

function visitorsSentence(count: number, kind: 'butterfly' | 'firefly'): string {
  if (count === 0) return ''
  const plural = kind === 'butterfly' ? 'butterflies' : 'fireflies'
  return count === 1 ? ` A ${kind} is visiting.` : ` ${numberWord(count).replace(/^./, (c) => c.toUpperCase())} ${plural} are visiting.`
}

/** The garden as the visitor finds it now: grown while it was left, with the time of day and season it opens in. */
function arriveInGarden() {
  const now = Date.now()
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked; the garden simply starts fresh.
  }
  const back = returnToGarden(loadGarden(raw, now), now, Math.random)
  const southern = isSouthernTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  return { back, clock: { tod: timeOfDayAt(new Date(now)), season: seasonAt(new Date(now), southern) } }
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
  const [returnLine, setReturnLine] = useState<string | null>(null)
  const [arrivals, setArrivals] = useState<ArrivalPlan>({ before: 0, times: [] })
  const [arrived, setArrived] = useState(0)
  const [postcard, setPostcard] = useState<KeepsakePlan | null>(null)
  const still = useSense().motionScale === 0
  const inks = useInks()
  const coloursRef = useRef(gardenColours(inks))
  useEffect(() => {
    coloursRef.current = gardenColours(inks)
  }, [inks])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clearButtonRef = useRef<HTMLButtonElement>(null)
  const standButtonRef = useRef<HTMLButtonElement>(null)
  const postcardRef = useRef<HTMLDivElement>(null)
  const showPostcardRef = useRef(false)
  const listRef = useRef<HTMLUListElement>(null)
  const listSummaryRef = useRef<HTMLElement>(null)
  const pointerRef = useRef<PointerTrack | null>(null)
  const dragAtRef = useRef<{ id: string; at: Point } | null>(null)
  const mouseRef = useRef<Point>({ x: -1, y: -1 })
  const sitStartRef = useRef(0)
  const suggestPendingRef = useRef(false)
  const suggestCountRef = useRef(0)
  const sinceSuggestRef = useRef(0)
  const returnRef = useRef<ReturnLook | null>(null)
  const sceneRef = useRef<Scene>({ plants: [], suggestion: null, cursor: null, selectedId: null, movingId: null, sitting: false, sitStart: 0, still: false, arrivals: { before: 0, times: [] }, arrived: 0 })

  const plants = useMemo(() => garden?.plants ?? [], [garden])
  const sitting = sitAt !== null
  const visitorKind = clock.tod === 'night' ? 'firefly' : 'butterfly'
  const visitors = visitorCount(plants, false)
  const canSit = livingCount(plants) >= READY_TO_SIT
  const selected = plants.find((p) => p.id === selectedId) ?? null
  const movingPlant = moving ? plants.find((p) => p.id === moving.id) ?? null : null

  // Load once on the client. A garden left for a while has grown, and may have
  // seeded a flower of its own.
  const arrival = useLoadedOnClient(arriveInGarden)
  const [arrivedFrom, setArrivedFrom] = useState<typeof arrival>(null)
  if (arrival && arrival !== arrivedFrom) {
    setArrivedFrom(arrival)
    setClock(arrival.clock)
    setGarden(arrival.back.garden)
    if (arrival.back.note) {
      setNote(arrival.back.note)
      setAnnouncement(arrival.back.note)
      setReturnLine(arrival.back.note)
    }
  }

  useEffect(() => {
    if (!arrival?.back.note) return
    returnRef.current = { start: performance.now(), skipAt: null, grew: new Map(arrival.back.grew.map((g) => [g.id, g.from])) }
  }, [arrival])

  // Any key or tap ends the look early; the view eases back rather than cutting.
  useEffect(() => {
    if (!returnLine) return
    const end = () => {
      returnRef.current = null
      setReturnLine(null)
    }
    let timer = window.setTimeout(end, RETURN_MS)
    const skip = () => {
      const look = returnRef.current
      if (!look || look.skipAt !== null) return
      look.skipAt = performance.now()
      window.clearTimeout(timer)
      timer = window.setTimeout(end, SETTLE_MS)
    }
    window.addEventListener('keydown', skip, true)
    window.addEventListener('pointerdown', skip, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', skip, true)
      window.removeEventListener('pointerdown', skip, true)
    }
  }, [returnLine])

  useEffect(() => {
    if (!garden) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...garden, lastVisit: Date.now() }))
    } catch {
      // Storage full or blocked: the garden still works for this visit.
    }
  }, [garden])

  useEffect(() => {
    sceneRef.current = { plants, suggestion, cursor, selectedId, movingId: moving?.id ?? null, sitting, sitStart: sitStartRef.current, still, arrivals, arrived }
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
        signal: AbortSignal.timeout(EXTRA_TIMEOUT_MS),
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
    requestAnimationFrame(() => document.getElementById('undo-button')?.focus())
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
    setPostcard(null)
    const before = visitorCount(plants, false)
    setArrivals({ before, times: arrivalTimes(before, visitorCount(plants, true)) })
    setArrived(0)
    sitStartRef.current = performance.now()
    setSitAt(Date.now())
  }, [moving, cancelMove, plants])

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

  useEffect(() => {
    if (!sitting) return
    const timers = arrivals.times.map((at, i) => window.setTimeout(() => setArrived(i + 1), at * SIT_MS))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [sitting, arrivals])

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

  const standUp = useCallback(() => {
    setSitAt(null)
    setSitDone(false)
    if (sitDone && sitAt !== null) {
      showPostcardRef.current = true
      // The visit ends on the postcard; an older suggestion would sit above it, out of date
      setSuggestion(null)
      setPostcard(gardenerKeepsake({ plants, season: clock.season, timeOfDay: clock.tod, visitors: sitVisitors, visitorKind: sitKind, line: closingLine, day: new Date(sitAt) }))
      setAnnouncement('You stand up. The garden is still here, and a postcard of it is ready to keep.')
      return
    }
    setAnnouncement('You stand up. The garden is still here.')
    requestAnimationFrame(() => document.getElementById('sit-go')?.focus())
  }, [sitDone, sitAt, plants, clock.season, clock.tod, sitVisitors, sitKind, closingLine])

  // A finished sit ends on the postcard of it, brought into view under the garden.
  useEffect(() => {
    if (!postcard || !showPostcardRef.current) return
    showPostcardRef.current = false
    postcardRef.current?.focus({ preventScroll: true })
    postcardRef.current?.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' })
  }, [postcard, still])

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
    // The tap that ends the look back over the garden does not also plant.
    if (sitting || e.button !== 0 || returnRef.current) return
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
    if (returnRef.current) return
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
      const perf = performance.now()
      const c = coloursRef.current
      const sinceSit = scene.sitting ? perf - scene.sitStart : 0
      // The sky ink cross-fades over 1,600 ms and never flashes; Quiet steps straight to it. The sun then keeps sinking, slowly.
      const light = scene.sitting ? (scene.still ? 1 : ease(sinceSit / LIGHT_FADE_MS)) : 0
      const drift = scene.sitting ? sitFraction(scene.still, Math.min(1, sinceSit / SIT_MS)) : 0

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Coming back: the view drifts across what grew while each plant grows from how it was left.
      const look = returnRef.current
      let glow = 0
      let shownGrowth: (p: Plant) => number = () => 1
      if (look) {
        const at = Math.min(1, ((look.skipAt ?? perf) - look.start) / RETURN_MS)
        const settle = look.skipAt === null ? 0 : ease((perf - look.skipAt) / SETTLE_MS)
        if (scene.still) {
          glow = look.skipAt === null ? 1 : 0
        } else {
          const camera = mixCamera(returnCamera(at, scene.plants.filter((p) => look.grew.has(p.id))), WHOLE, settle)
          ctx.setTransform(dpr * camera.zoom, 0, 0, dpr * camera.zoom, dpr * (w / 2 - camera.zoom * camera.x * w), dpr * (h / 2 - camera.zoom * camera.y * h))
          glow = glowAt(at) * (1 - settle)
          shownGrowth = (p) => {
            const from = look.grew.get(p.id)
            if (from === undefined) return 1
            const full = growthFactor(p, wallNow)
            const shown = growthShown(at, p.x)
            const k = shown + (1 - shown) * settle
            return Math.max(0.05, (from + (full - from) * k) / full)
          }
        }
      }
      drawSky(ctx, c, w, h, clock.tod, time, light, drift)
      drawGround(ctx, c, w, h, clock.tod, clock.season, shown.filter((p) => categoryOf(p.type) === 'tree'), light)

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
        const s = plantSize(p, w, wallNow) * grow * shownGrowth(p)
        const x = p.x * w
        const y = p.y * h
        if (glow > 0 && look?.grew.has(p.id)) drawNewGrowth(ctx, c, categoryOf(p.type), x, y, s, glow, clock.tod)
        ctx.beginPath()
        ctx.ellipse(x, y, 10 * s, 3 * s, 0, 0, Math.PI * 2)
        ctx.fillStyle = alpha(c.shadow, 0.13)
        ctx.fill()
        drawPlant(ctx, c, p.type, x, y, s, p.colorSeed, sway * k, clock.season)
        if (p.id === scene.selectedId || p.id === scene.movingId || p.id === drag?.id) drawMarker(ctx, c, x, y + 1, 20 * s, 6 * s, true)
      }

      if (scene.suggestion && !scene.sitting) {
        const sx = scene.suggestion.x * w
        const sy = scene.suggestion.y * h
        const s = k * depthFactor(scene.suggestion.y)
        ctx.save()
        ctx.globalAlpha = scene.still ? 0.85 : 0.7 + Math.sin(time * 0.002) * 0.2
        ctx.beginPath()
        ctx.ellipse(sx, sy, 26 * s, 9 * s, 0, 0, Math.PI * 2)
        ctx.fillStyle = alpha(c.suggest, 0.45)
        ctx.fill()
        drawMarker(ctx, c, sx, sy, 26 * s, 9 * s, false)
        ctx.globalAlpha *= 0.5
        drawPlant(ctx, c, scene.suggestion.type, sx, sy, s, 0.4, 0, clock.season)
        ctx.restore()
      }

      if (scene.sitting) drawSitLight(ctx, c, w, h, clock.tod, light)

      const flowers = visitorHosts(shown)
      const hosts = flowers.length ? flowers : shown.filter((p) => categoryOf(p.type) !== 'stone')
      // While sitting, those already visiting stay and the rest arrive one at a time.
      const here = scene.sitting ? scene.arrivals.before + scene.arrived : visitorCount(scene.plants, false)
      const kind = visitorKindAt(clock.tod, scene.sitting, drift)
      for (let i = 0; i < here && hosts.length; i++) {
        const hop = time / 7000 + i * 0.41
        const step = Math.floor(hop)
        const t = Math.min(1, (hop - step) * 3)
        // Still visitors each rest on their own flower rather than mid-journey.
        const a = scene.still ? hosts[i % hosts.length] : hosts[(step * 5 + i * 3) % hosts.length]
        const b = scene.still ? a : hosts[((step + 1) * 5 + i * 3) % hosts.length]
        const lift = (p: Plant) => p.y * h - 34 * k * depthFactor(p.y)
        const glide = ease(t)
        let vx = a.x * w + (b.x * w - a.x * w) * glide + Math.sin(time * 0.0009 + i) * 6
        let vy = lift(a) + (lift(b) - lift(a)) * glide - Math.sin(t * Math.PI) * 30 + Math.cos(time * 0.0013 + i) * 4
        const late = i - scene.arrivals.before
        if (scene.sitting && !scene.still && late >= 0) {
          // A newcomer drifts in from the side of the garden and settles into the others' wandering.
          const flight = ease((perf - scene.sitStart - scene.arrivals.times[late] * SIT_MS) / ARRIVAL_FLIGHT_MS)
          const fromX = late % 2 ? w + 24 : -24
          vx = fromX + (vx - fromX) * flight
          vy = h * 0.18 + (vy - h * 0.18) * flight
        }
        drawVisitor(ctx, c, kind, vx, vy, k, i, time, scene.still)
      }

      if (scene.cursor && !scene.sitting && !scene.movingId) drawMarker(ctx, c, scene.cursor.x * w, scene.cursor.y * h, 12, 5, true)

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

  let status: React.ReactNode = null
  if (movingPlant) {
    status = (
      <>
        <p>
          Tap the grass where the {nameOf(movingPlant.type)} should go
          <span className="hidden pointer-fine:inline">, or use the arrow keys and Enter</span>.
        </p>
        <QuietButton onClick={cancelMove}>Cancel</QuietButton>
      </>
    )
  } else if (selected) {
    const place = describePlace(selected, plants)
    status = (
      <>
        <p><span className="font-bold">{variantOf(selected.type).label}</span>, {place}. Drag it, or:</p>
        <span className={styles.statusActions}>
          <Stamp onClick={() => startMove(selected.id, false)}>Move</Stamp>
          <QuietButton onClick={() => removePlant(selected.id)}>Remove</QuietButton>
          <QuietButton onClick={() => setSelectedId(null)}>Done</QuietButton>
        </span>
      </>
    )
  } else if (suggestion) {
    status = (
      <>
        <p>{suggestion.line}</p>
        <span className={styles.statusActions}>
          <Stamp onClick={acceptSuggestion}>Plant the {nameOf(suggestion.type)} there</Stamp>
          <QuietButton onClick={dismissSuggestion}>Not now</QuietButton>
        </span>
      </>
    )
  } else if (note && !returnLine) {
    status = <p>{note}</p>
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-4" onKeyDown={handleRootKeyDown}>
      <div id="garden-announcer" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div>
        <div
          className={cn(sitting && styles.sit)}
          role={sitting ? 'dialog' : undefined}
          aria-modal={sitting ? true : undefined}
          aria-labelledby={sitting ? 'sit-title' : undefined}
          aria-describedby={sitting ? 'sit-words' : undefined}
          onKeyDown={sitting ? handleSitKeyDown : undefined}
        >
          {sitting && <h2 id="sit-title" className="sr-only">Sitting with your garden</h2>}
          <div
            className={cn(
              styles.frame,
              sitting ? 'max-w-[calc((100svh-13rem)*1.6)] rounded-sheet' : status ? 'rounded-t-sheet' : 'rounded-sheet',
            )}
          >
            <canvas
              ref={canvasRef}
              className={cn(
                'block w-full touch-none',
                sitting
                  ? 'aspect-square sm:aspect-[16/10]'
                  : 'aspect-[4/3] sm:aspect-[16/10] lg:max-h-[calc(100svh-15rem)] cursor-crosshair focus-visible:outline-4! focus-visible:outline-solid! focus-visible:-outline-offset-4!',
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
            {returnLine && !sitting && (
              // Heard through the announcer already, so it is only shown here.
              <div aria-hidden="true" className={styles.returning}>
                <p>
                  {returnLine}
                  <small>
                    <span className="pointer-fine:hidden">Tap to skip</span>
                    <span className="hidden pointer-fine:inline">Press any key to skip</span>
                  </small>
                </p>
              </div>
            )}
            {garden && plants.length === 0 && !sitting && (
              <p className={styles.caption}>Choose a plant, then tap the grass.</p>
            )}
          </div>

          {sitting && (
            <>
              <p id="sit-words" aria-live="polite" className="min-h-[5.5rem] max-w-xl text-center text-body sm:text-lead">
                {sitDone ? closingLine : (
                  <>
                    <span className="text-ink-soft">{still ? 'The light has settled. Stay as long as you like.' : 'The light is changing. Stay as long as you like.'}</span>
                    {arrived > 0 && (
                      <span key={arrived} className="mt-2 block">
                        {arrivalLine(arrived - 1, arrivals.before, visitorKindAt(clock.tod, true, sitFraction(still, arrivals.times[arrived - 1])))}
                      </span>
                    )}
                  </>
                )}
              </p>
              <Stamp ref={standButtonRef} onClick={standUp}>
                Stand up
              </Stamp>
            </>
          )}
        </div>

        {status && !sitting && <div className={styles.status}>{status}</div>}

        {postcard && !sitting && (
          <div ref={postcardRef} tabIndex={-1} className="mt-6 scroll-mt-24 rounded-sheet focus:outline-none" data-testid="garden-postcard">
            <Keepsake plan={postcard} label="A postcard of your garden" />
          </div>
        )}
      </div>

      <section aria-label="Gardening tools" inert={sitting} className={cn(styles.panel, 'mt-3 lg:mt-0')}>
        <div
          id="plant-picker"
          className={styles.picker}
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
              className={styles.plant}
            >
              <span className={styles.tile}>
                <PlantIcon type={variant.id} season={clock.season} />
              </span>
              <span className={styles.label}>{variant.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-2 border-t border-rule pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <QuietButton id="undo-button" onClick={() => history.length > 0 && undo()} aria-disabled={history.length === 0 || undefined} aria-label="Undo last change" className="aria-disabled:cursor-not-allowed aria-disabled:text-ink-soft aria-disabled:no-underline">
              <Icon name="undo" size={12} className="mr-1 inline" />
              Undo
            </QuietButton>
            {!showClearConfirm && (
              <Stamp
                ref={clearButtonRef}
                className="sp-stamp--careful"
                onClick={() => plants.length > 0 && setShowClearConfirm(true)}
                aria-disabled={plants.length === 0 || undefined}
                aria-label="Clear garden"
              >
                <Icon name="trash" size={12} className="mr-1 inline" />
                Clear
              </Stamp>
            )}
          </div>
          {showClearConfirm && (
            <InlineConfirm
              question="Clear the whole garden?"
              why="Undo brings it back."
              keepLabel="Keep it"
              confirmLabel="Yes, clear it"
              onKeep={() => {
                setShowClearConfirm(false)
                requestAnimationFrame(() => clearButtonRef.current?.focus())
              }}
              onConfirm={clearGarden}
            />
          )}
        </div>

        <div className="mt-3 grid gap-2">
          <div>
            <Go id="sit-go" onClick={startSit} aria-describedby={canSit ? 'sit-hint' : undefined} unavailable={canSit ? undefined : 'Once three things are growing.'}>
              <Icon name="sunset" size={24} />
              Sit with your garden
            </Go>
          </div>
          {canSit && <p id="sit-hint" className="text-small text-ink-soft">Rest a minute while the light changes.</p>}
        </div>

        <details
          className="mt-3 border-t border-rule pt-2"
          onToggle={(e) => {
            const details = e.currentTarget
            setListOpen(details.open)
            if (details.open) requestAnimationFrame(() => details.scrollIntoView({ block: 'nearest' }))
          }}
        >
          <summary ref={listSummaryRef} className="cursor-pointer rounded-stamp py-2 font-bold">
            What&apos;s in your garden
          </summary>
          {listOpen && (plants.length === 0 ? (
            <p className="mt-2 text-small text-ink-soft">Nothing yet.</p>
          ) : (
            <ul ref={listRef} className={styles.list}>
              {plants.map((p, i) => {
                const place = describePlace(p, plants)
                const name = nameOf(p.type)
                return (
                  <li key={p.id} className={styles.listItem}>
                    <span className="min-w-0 flex-1">
                      <span className="font-bold">{variantOf(p.type).label}</span>,{' '}
                      <span className="text-ink-soft">{place}{p.selfSown ? ' (came up on its own)' : ''}</span>
                    </span>
                    <QuietButton onClick={() => startMove(p.id, true)} aria-label={`Move the ${name}, ${place}`}>
                      Move
                    </QuietButton>
                    <QuietButton data-remove onClick={() => removeFromList(p.id, i)} aria-label={`Remove the ${name}, ${place}`}>
                      Remove
                    </QuietButton>
                  </li>
                )
              })}
            </ul>
          ))}
        </details>
      </section>
    </div>
  )
}
