'use client'

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react'
import localFont from 'next/font/local'
import type { CluePlace, DiscoveryEvent, GameState, MutationResult, MutationRecord, PathPoint, Sleeping } from './engine/types'
import { DEFAULT_PARAMS, GAME_W, GAME_H, ENDING } from './engine/types'
import { cluePlaces, getProfileSummary } from './engine/engine'
import { endingKind, fallbackName, fallbackTagline, reflection, type RunStory } from './engine/naming'
import { categoryOf } from './engine/plan'
import { fallbackRule, discovery, hintFor, listed, shortName, togetherNow } from './engine/rules'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { KeyHints } from '@/components/seedpress/KeyHints'
import GameCanvas from './components/GameCanvas'
import TitleScreen from './components/TitleScreen'
import FinaleScreen from './components/FinaleScreen'
import { isControlTarget } from './components/controls'
import { MechanicIcon } from './components/MechanicIcon'
import { Icon } from '@/components/seedpress/icons/Icon'
import './screen.css'

// The Shapeshifter's arcade screen keeps its pixel face, self-hosted like the Seedpress fonts (app/fonts/README)
const retroFont = localFont({ src: '../../fonts/PressStart2P-arcade.woff2', weight: '400', display: 'swap' })

type GamePhase = 'title' | 'playing' | 'paused' | 'finale'

type ActiveMechanic = { id: string; params: Record<string, number> }

interface Finale {
  closingLine: string
  path: PathPoint[]
  sleeping: Sleeping[]
  field: { w: number; h: number }
}

interface Named extends MutationRecord {
  hint: string
  together: string[]
}

const MUTATE_URL = '/api/cascade/mutate'
const REQUEST_TIMEOUT_MS = 8000
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
// A phone gets a tall field so the game fills the screen instead of a third of it
const PORTRAIT_W = 480
const PORTRAIT_H = 720
// A rule's name stays on the field long enough to read, then the field is left to the player
const NAMED_MS = 9000

function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null
}

const TOUCH_QUERY = '(pointer: coarse)'
const NARROW_QUERY = '(max-width: 639px)'

function subscribeQuery(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }
}
const subscribeTouch = subscribeQuery(TOUCH_QUERY)
const subscribeNarrow = subscribeQuery(NARROW_QUERY)

function textOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function toMutation(mechanicId: string, data: Record<string, unknown>, active: readonly string[]): MutationResult {
  const fallback = fallbackRule(mechanicId, active)
  return {
    mechanicId,
    params: { ...DEFAULT_PARAMS[mechanicId] },
    title: textOr(data.title, fallback.title),
    description: textOr(data.description, fallback.description),
    flavorText: textOr(data.flavorText, fallback.flavorText),
  }
}

function toRecord(m: MutationResult): MutationRecord {
  return { id: m.mechanicId, title: m.title, description: m.description, flavorText: m.flavorText }
}

/** "a faint star outline above your orb" */
function clueAt({ id, place }: CluePlace): string {
  return `${discovery(id).clue} ${place}`
}

/** Clues and places hold commas of their own, so a list of them is split with semicolons. */
function clueList(clues: readonly CluePlace[]): string {
  const parts = clues.map(clueAt)
  if (parts.length <= 2) return parts.join(' and ')
  return `${parts.slice(0, -1).join('; ')}; and ${parts[parts.length - 1]}`
}

/** What a screen reader hears when clues appear: what each looks like and where, never the rule's name. */
function plantedWords(clues: readonly CluePlace[], canMove: boolean): string {
  const [only] = clues
  if (clues.length === 1 && only.id === ENDING) {
    return `A small circle of light has appeared ${only.place}. When you are ready, go to it, or rest, and your game will finish.`
  }
  if (clues.length === 1) {
    const how = canMove ? 'Go to it, gather light, or rest' : 'Pulse the orb, or rest'
    return `Something new is growing ${only.place}: ${discovery(only.id).clue}. ${how}, and it will open.`
  }
  const circle = clues.some(c => c.id === ENDING)
  const choose = circle
    ? 'Go to the one you want. The circle ends the game, and so does resting.'
    : 'Go to the one you want, and it will open. Or rest, and they will settle and sleep.'
  return `Some new things are growing: ${clueList(clues)}. ${choose}`
}

function capitalised(words: string): string {
  return words[0].toUpperCase() + words.slice(1)
}

function whereWords(clues: readonly CluePlace[]): string {
  if (clues.length === 0) return 'Nothing is growing right now.'
  return `${capitalised(clueList(clues))}.`
}

export default function CascadeGame() {
  const [phase, setPhase] = useState<GamePhase>('title')
  const [runId, setRunId] = useState(0)
  const [currentWave, setCurrentWave] = useState(0)
  const [allMutations, setAllMutations] = useState<MutationRecord[]>([])
  const [activeMechanics, setActiveMechanics] = useState<ActiveMechanic[]>([])
  const [clues, setClues] = useState<CluePlace[]>([])
  const [settling, setSettling] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [named, setNamed] = useState<Named | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [gameName, setGameName] = useState('')
  const [tagline, setTagline] = useState('')
  const [finale, setFinale] = useState<Finale>({ closingLine: '', path: [], sleeping: [], field: { w: GAME_W, h: GAME_H } })
  const [lockedPortrait, setLockedPortrait] = useState<boolean | null>(null)
  const reducedMotion = useReducedMotion()
  // Arrow keys cannot be pressed on a phone, so touch players always get the follow control
  const isTouch = useSyncExternalStore(subscribeTouch, () => window.matchMedia(TOUCH_QUERY).matches, () => false)
  const isNarrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW_QUERY).matches, () => false)
  // The field's shape is fixed once a run starts, so turning the phone never resets a game
  const portrait = lockedPortrait ?? isNarrow
  const [fieldW, fieldH] = portrait ? [PORTRAIT_W, PORTRAIT_H] : [GAME_W, GAME_H]
  const gameStateRef = useRef<GameState | null>(null)
  // Events arrive from the game loop between renders, so the run's rules are also kept outside state
  const mechanicsRef = useRef<ActiveMechanic[]>([])
  const mutationsRef = useRef<MutationRecord[]>([])
  const namedIdsRef = useRef<Set<string>>(new Set())
  const runRef = useRef(0)
  const boxRef = useRef<HTMLDivElement>(null)

  /** A repeated sentence is still read again, so asking twice is never met with silence. */
  const say = useCallback((words: string) => {
    setAnnouncement(prev => (prev === words ? `${words} ` : words))
  }, [])

  /** Fresh words for a rule the player just chose; the run's own words stand in until they come. */
  const fetchWords = useCallback(async (id: string, wave: number, active: string[], mutations: MutationRecord[]): Promise<MutationResult | null> => {
    const s = gameStateRef.current
    try {
      const res = await fetch(MUTATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wave,
          category: categoryOf(id),
          options: [id],
          profile: s ? getProfileSummary(s) : null,
          activeMechanics: active,
          mutations,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.mechanicId === id ? toMutation(id, data, active) : null
    } catch {
      return null
    }
  }, [])

  const handleStart = useCallback(() => {
    setLockedPortrait(isNarrow)
    setPhase('playing')
  }, [isNarrow])

  const handleDiscovery = useCallback((event: DiscoveryEvent) => {
    const s = gameStateRef.current
    if (!s) return

    if (event.type === 'planted') {
      setClues(event.clues)
      setSettling(false)
      setHint(null)
      // The name card would hide clues near the top, and choosing matters more now
      setNamed(null)
      say(plantedWords(event.clues, mechanicsRef.current.length > 0))
      return
    }

    if (event.type === 'beside') {
      say(`You are beside ${discovery(event.id).clue}.`)
      return
    }

    if (event.type === 'settling') {
      setSettling(true)
      say('If you keep resting, these will settle into the field and sleep. Move, and they stay awake.')
      return
    }

    if (event.type === 'let-be') {
      setClues([])
      setSettling(false)
      say(`You let them be. ${capitalised(listed(event.ids.map(shortName)))} settled into the field to sleep. Something else will grow soon.`)
      return
    }

    if (event.type === 'opened') {
      const ids = mechanicsRef.current.map(m => m.id)
      const mutation = toMutation(event.id, {}, ids)
      const mechanics = [...mechanicsRef.current, { id: mutation.mechanicId, params: mutation.params }]
      const mutations = [...mutationsRef.current, toRecord(mutation)]
      mechanicsRef.current = mechanics
      mutationsRef.current = mutations
      setActiveMechanics(mechanics)
      setAllMutations(mutations)
      setCurrentWave(mechanics.length)
      setClues([])
      setSettling(false)
      setHint(null)
      setNamed(null)
      // Says what changed in plain words; the rule's name waits until the player has felt it
      const passed = event.passed.filter(id => id !== ENDING)
      say(`It opened. ${discovery(event.id).change}${passed.length ? ' The others faded, and may grow again later.' : ''}`)

      const run = runRef.current
      void fetchWords(event.id, mechanics.length - 1, ids, mutationsRef.current.slice(0, -1)).then((fresh) => {
        if (!fresh || runRef.current !== run || namedIdsRef.current.has(event.id)) return
        mutationsRef.current = mutationsRef.current.map(m => (m.id === event.id ? toRecord(fresh) : m))
        setAllMutations(mutationsRef.current)
      })
      return
    }

    const words = hintFor(event.id, isTouch)
    if (event.type === 'hint') {
      setHint(words)
      say(words)
      return
    }

    const rule = mutationsRef.current.find(m => m.id === event.id)
    if (!rule) return
    namedIdsRef.current.add(event.id)
    const together = togetherNow(event.id, mechanicsRef.current.map(m => m.id))
    setHint(null)
    setNamed({ ...rule, hint: words, together })
    say([`${rule.title}.`, rule.description, ...together, words].join(' '))
  }, [fetchWords, isTouch, say])

  useEffect(() => {
    if (!named) return
    const t = setTimeout(() => setNamed(null), NAMED_MS)
    return () => clearTimeout(t)
  }, [named])

  const handleGameComplete = useCallback(async () => {
    const s = gameStateRef.current
    const run = runRef.current
    const mutations = mutationsRef.current
    const story: RunStory = {
      mechanicIds: mutations.map(m => m.id),
      letBe: s ? s.sleeping.map(z => z.id) : [],
      foundBy: s ? [...s.foundBy] : [],
      style: s ? getProfileSummary(s).playStyle : 'gentle',
      transformed: s?.transformed ?? 0,
      bumps: s?.bumps ?? 0,
      carries: s?.carries ?? 0,
    }
    setFinale({
      path: s ? [...s.path] : [],
      sleeping: s ? [...s.sleeping] : [],
      field: { w: s?.w ?? GAME_W, h: s?.h ?? GAME_H },
      closingLine: reflection(story),
    })
    setGameName('')
    setTagline('')
    setPhase('finale')

    let name = fallbackName(story)
    let line = fallbackTagline(story)
    try {
      const res = await fetch(MUTATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isNaming: true,
          mutations,
          score: s ? Math.floor(s.score) : 0,
          profile: s ? getProfileSummary(s) : null,
          ending: endingKind(story),
          letBe: story.letBe,
          transformed: story.transformed,
          bumps: story.bumps,
          carries: story.carries,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.gameName === 'string' && data.gameName) name = data.gameName
        if (typeof data.tagline === 'string' && data.tagline) line = data.tagline
      }
    } catch {
      // The ending's own name above is the fallback
    }
    if (runRef.current !== run) return
    setGameName(name)
    setTagline(line)
  }, [])

  const handlePlayAgain = useCallback(() => {
    runRef.current += 1
    setRunId(runRef.current)
    setPhase('title')
    setCurrentWave(0)
    setAllMutations([])
    setActiveMechanics([])
    setClues([])
    setSettling(false)
    setHint(null)
    setNamed(null)
    setAnnouncement('')
    mechanicsRef.current = []
    mutationsRef.current = []
    namedIdsRef.current = new Set()
    setGameName('')
    setTagline('')
    setLockedPortrait(null)
  }, [])

  const pause = useCallback(() => setPhase(p => (p === 'playing' ? 'paused' : p)), [])
  const resume = useCallback(() => setPhase(p => (p === 'paused' ? 'playing' : p)), [])

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'paused') return
    // Buttons are fine (the pause card focuses RESUME); only typing in a field is left alone
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || isTextEntry(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 'c' && phase === 'playing') {
        const s = gameStateRef.current
        if (s) say(whereWords(cluePlaces(s)))
        return
      }
      if (key !== 'escape' && key !== 'p') return
      if (phase === 'playing') pause()
      else resume()
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') pause()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [phase, pause, resume, say])

  // The finale is taller than a short laptop screen allows only if the box is half scrolled away
  useEffect(() => {
    if (phase !== 'finale') return
    boxRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [phase, reducedMotion])

  // While the game has focus, the arrow keys and Space belong to it, never to the page's scrollbar
  const keepKeysInGame = (e: React.KeyboardEvent) => {
    if (ARROW_KEYS.has(e.key) || (e.key === ' ' && !isControlTarget(e.target))) e.preventDefault()
  }

  const showHud = phase === 'playing' || phase === 'paused'
  const blooming = activeMechanics.some(m => m.id === 'score_rush')
  const fade = reducedMotion ? '' : 'animate-fade'
  const crossroads = clues.length > 1
  const circleOffered = clues.some(c => c.id === ENDING)
  const caption = clues.length === 1 && circleOffered
    ? 'When you are ready, go to the circle, or rest.'
    : clues.length === 1 && currentWave === 0
      ? `Something is growing. ${isTouch ? 'Tap the orb' : 'Press Space'}, or just rest.`
      : clues.length === 1
        ? 'Something is growing. Go to it, or rest.'
        : crossroads && settling
          ? 'Resting lets them settle and sleep. Move, and they stay awake.'
          : crossroads && circleOffered
            ? 'Go to the one you want. The circle ends the game, and so does resting.'
            : crossroads
              ? 'Go to the one you want, or rest and let them be.'
              : hint ?? (currentWave === 0 ? (isTouch ? 'Tap the orb.' : 'Click the orb, or press Space.') : blooming ? 'the bloom' : null)

  return (
    // The finished game takes the page's width, so its map and legend are drawn large enough to read
    <div className={`w-full mx-auto ${phase === 'finale' ? 'max-w-3xl' : 'max-w-[640px]'}`} onKeyDown={keepKeysInGame}>
      {/* Overlays share the canvas's grid cell so a tall screen grows the box instead of being clipped.
          Play happens on a dark arcade screen in a bezel; the finished game is printed back on the site's paper. */}
      <div ref={boxRef} className={`grid rounded-xl overflow-hidden border border-card-border bg-card-bg scroll-mt-20 ${phase === 'finale' ? '' : 'shapeshifter-screen'}`}>
        {/* Hidden under the finale, so the box takes the finale's height rather than the field's */}
        <div className={`col-start-1 row-start-1 ${phase === 'finale' ? 'hidden' : ''}`}>
          <GameCanvas
            key={`${runId}-${fieldW}`}
            width={fieldW}
            height={fieldH}
            isTouch={isTouch}
            isPlaying={phase === 'playing'}
            activeMechanics={activeMechanics}
            onDiscovery={handleDiscovery}
            onGameComplete={handleGameComplete}
            gameStateRef={gameStateRef}
            reducedMotion={reducedMotion}
          />
        </div>

        {showHud && (
          <div
            className="col-start-1 row-start-1 self-start relative w-full pointer-events-none z-10"
            style={{ aspectRatio: `${fieldW} / ${fieldH}` }}
          >
            {/* The name comes last: the rule has already been seen and used by the time it appears */}
            {named && (
              <div className="absolute top-8 inset-x-3 flex justify-center" data-testid="rule-named">
                <div className={`max-w-sm text-center rounded-lg border border-card-border bg-card-bg/90 px-4 py-2.5 ${fade}`}>
                  <p className={`flex items-center justify-center gap-2 text-[11px] sm:text-sm leading-relaxed text-melon-green break-words shapeshifter-neon ${retroFont.className}`}>
                    <MechanicIcon id={named.id} />
                    {named.title}
                  </p>
                  <p className="text-sm text-foreground mt-1 break-words">{named.description}</p>
                  {named.together.map(line => (
                    <p key={line} className="text-sm text-foreground mt-1 break-words" data-testid="rule-together">{line}</p>
                  ))}
                  {named.flavorText && <p className="text-xs italic text-foreground/75 mt-1 break-words">{named.flavorText}</p>}
                  <p className="text-xs text-foreground/80 mt-1">{named.hint}</p>
                </div>
              </div>
            )}

            {phase === 'playing' && caption && (
              <p className="absolute bottom-6 sm:bottom-8 inset-x-3 text-center text-sm text-foreground/80">
                <span className="rounded bg-card-bg/80 px-2 py-0.5">{caption}</span>
              </p>
            )}
          </div>
        )}

        {phase === 'paused' && (
          <div
            className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center gap-4 px-4 py-8 bg-card-bg/95"
            role="dialog"
            aria-label="Paused"
          >
            <p className={`text-base tracking-[0.3em] text-melon-green shapeshifter-neon ${retroFont.className}`}>PAUSED</p>
            <p className="text-sm text-foreground/80">Take as long as you like.</p>
            <button
              type="button"
              onClick={resume}
              autoFocus
              className={`text-xs tracking-[0.15em] px-5 py-3 rounded-lg cursor-pointer bg-melon-green text-card-bg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${retroFont.className}`}
            >
              RESUME
            </button>
            <button
              type="button"
              onClick={handlePlayAgain}
              className="text-sm underline cursor-pointer text-foreground/80 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded px-1 min-h-[44px]"
            >
              Start over
            </button>
            {!isTouch && <KeyHints>Esc or P pauses and resumes. C tells you where the clues are.</KeyHints>}
          </div>
        )}

        {phase === 'title' && (
          <TitleScreen onStart={handleStart} retroFont={retroFont.className} isTouch={isTouch} focusBegin={runId > 0} />
        )}

        {phase === 'finale' && (
          <FinaleScreen
            gameName={gameName}
            tagline={tagline}
            closingLine={finale.closingLine}
            mutations={allMutations}
            path={finale.path}
            sleeping={finale.sleeping}
            field={finale.field}
            onPlayAgain={handlePlayAgain}
            retroFont={retroFont.className}
            reducedMotion={reducedMotion}
          />
        )}
      </div>

      {/* Pause sits below the field, so a thumb guiding the orb can never press it by accident */}
      <div className="flex items-center justify-between gap-3 mt-2 min-h-11">
        {phase === 'playing' && (
          <>
            <button
              type="button"
              onClick={pause}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg border border-card-border bg-card-bg text-sm text-foreground/85 hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Icon name="pause" size={16} />
              Pause
            </button>
            {!isTouch && <KeyHints>Esc or P also pauses. C tells you where the clues are.</KeyHints>}
          </>
        )}
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {phase === 'playing' && announcement}
        {phase === 'paused' && 'Paused.'}
        {phase === 'finale' && 'Your game is finished.'}
      </div>
    </div>
  )
}
