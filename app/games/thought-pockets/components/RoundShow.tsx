'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RoundReport } from '@/types/thought-pockets'
import { playTones } from '@/components/games/gentleCues'
import { releaseWords } from '@/lib/games/thought-pockets/data/turnText'
import { TYPE_COLORS } from './CardFace'

const STEP_MS = 260
const CONCLUSION_MS = 520
const MULT_BASE_MS = 160
const MULT_STEP_MS = 120
const MULT_STEPS_SHOWN = 4
const TOTAL_MS = 520
const ADJUST_MS = 480
const LAND_MS = 480
/** The hit-pause: on a landing hit the bias recoils and holds still this long before the number appears. */
export const HIT_PAUSE_MS = 100
/** From this much damage a hit lands harder: a longer pause, a bigger number, a bolder recoil. */
export const BIG_HIT = 20
const HUGE_HIT = 40
const BIG_EXTRA_MS = 200
const HUGE_EXTRA_MS = 350
/** How long the bias's own turn holds on screen: long enough for your Resolve to count down as it hits. */
export const AFTER_MS = 500
const SHIFT_MS = 1000
const LOUDNESS = 0.05
/** The pitch of the Multiplier's tone: a gentle rise, a little under an octave from ×1 to ×4. */
const MULT_TONE = { hz: 330, rise: 0.4, maxHz: 640 }

export type Beat = 'step' | 'mult' | 'total' | 'adjust' | 'land' | 'unsettle' | 'act' | 'shift'

export function format(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/0$/, '')
}

/** The Multiplier as it grows: from ×1 (and any lasting bonus), one card at a time, to the round's Multiplier. */
export function multiplierSteps(report: RoundReport): number[] {
  const values = [1 + report.lastingMultiplier]
  for (const step of report.steps) if (step.multiplier > 0) values.push(values[values.length - 1] + step.multiplier)
  if (values[values.length - 1] !== report.multiplier) values.push(report.multiplier)
  return values
}

/** The beats of one round in the order they happened: each card's Weight, the Multiplier, the total, what changed it, the hit, then the bias's turn. */
export function roundBeats(report: RoundReport): Beat[] {
  const beats: Beat[] = report.steps.map(() => 'step')
  if (report.steps.length > 0) {
    if (report.multiplier !== 1) beats.push('mult')
    beats.push('total')
    if (report.chain.length > 0) beats.push('adjust')
    beats.push('land')
  }
  if (report.unsettleLoss > 0) beats.push('unsettle')
  beats.push('act')
  if (report.phaseChanged) beats.push('shift')
  return beats
}

export function beatLength(beat: Beat, index: number, report: RoundReport): number {
  const extra = (report.damage >= BIG_HIT ? BIG_EXTRA_MS : 0) + (report.damage >= HUGE_HIT ? HUGE_EXTRA_MS : 0)
  switch (beat) {
    case 'step':
      return report.steps[index]?.conclusion ? CONCLUSION_MS : STEP_MS
    case 'mult':
      return MULT_BASE_MS + MULT_STEP_MS * Math.min(MULT_STEPS_SHOWN, multiplierSteps(report).length - 1)
    case 'total':
      return TOTAL_MS + extra
    case 'adjust':
      return ADJUST_MS
    case 'land':
      return LAND_MS
    case 'shift':
      return SHIFT_MS
    default:
      return AFTER_MS
  }
}

/** How long the whole replay of a round takes. */
export function showLength(report: RoundReport): number {
  return roundBeats(report).reduce((sum, beat, i) => sum + beatLength(beat, i, report), 0)
}

function multHz(multiplier: number): number {
  return Math.min(MULT_TONE.maxHz, MULT_TONE.hz * multiplier ** MULT_TONE.rise)
}

function soundFor(beat: Beat, index: number, report: RoundReport) {
  if (beat === 'step') {
    const conclusion = report.steps[index]?.conclusion
    playTones(conclusion ? [{ hz: 392, seconds: 0.18 }, { hz: 523, at: 0.12, seconds: 0.3 }] : [{ hz: 294 * 1.06 ** index, seconds: 0.14 }], LOUDNESS)
  }
  if (beat === 'mult') {
    const values = multiplierSteps(report).slice(1, MULT_STEPS_SHOWN + 1)
    playTones(values.map((m, i) => ({ hz: multHz(m), at: (i * MULT_STEP_MS) / 1000, seconds: 0.16 })), LOUDNESS * 0.8)
  }
  if (beat === 'total' && report.product > 0) playTones([{ hz: multHz(report.multiplier), toHz: multHz(report.multiplier) * 1.2, seconds: 0.4 }], LOUDNESS)
  if (beat === 'land' && report.damage > 0) {
    const weight = report.damage >= HUGE_HIT ? 1.6 : report.damage >= BIG_HIT ? 1.3 : 1
    playTones([{ hz: 196, toHz: 131, at: HIT_PAUSE_MS / 1000, seconds: 0.45 }], LOUDNESS * weight)
  }
  if (beat === 'shift') {
    playTones([{ hz: 262, toHz: 220, seconds: 0.6 }], LOUDNESS)
    if (report.released > 0) playTones([{ hz: 330, at: 0.35, seconds: 0.5 }, { hz: 415, at: 0.45, seconds: 0.5 }], LOUDNESS * 0.8)
  }
}

export interface RoundShowState {
  /** How many beats have played. */
  stage: number
  beats: Beat[]
  done: boolean
  skip: () => void
}

/**
 * Plays a round's beats one after another. A new `id` starts again; skipping jumps to the end.
 * With reduced motion the whole round appears at once, as one still frame, with a single tone.
 */
export function useRoundShow(id: string | null, report: RoundReport | null, reduced: boolean): RoundShowState {
  const [state, setState] = useState<{ id: string | null; stage: number; skipped: boolean }>({ id, stage: 0, skipped: false })
  if (state.id !== id) setState({ id, stage: 0, skipped: false })
  const beats = useMemo(() => (report ? roundBeats(report) : []), [report])
  const current = state.id === id ? state : { id, stage: 0, skipped: false }
  const done = id === null || reduced || current.skipped || current.stage >= beats.length

  useEffect(() => {
    if (reduced && id !== null && report) soundFor('land', 0, report)
  }, [reduced, id, report])

  useEffect(() => {
    if (done || !report) return
    const beat = beats[current.stage]
    soundFor(beat, current.stage, report)
    const timer = window.setTimeout(() => setState((s) => (s.id === id ? { ...s, stage: s.stage + 1 } : s)), beatLength(beat, current.stage, report))
    return () => window.clearTimeout(timer)
  }, [id, current.stage, done, beats, report])

  const skip = useCallback(() => setState((s) => (s.skipped ? s : { ...s, skipped: true })), [])
  return { stage: current.stage, beats, done, skip }
}

/** Where the show is: which step is lit, which beat is playing now, and whether the hit has landed. */
export function showProgress(show: RoundShowState) {
  const reached = (beat: Beat) => show.done || show.beats.slice(0, show.stage + 1).includes(beat)
  const lit = show.done ? Infinity : show.beats.slice(0, show.stage + 1).filter((b) => b === 'step').length
  const now: Beat | null = show.done ? null : show.beats[show.stage] ?? null
  return { reached, lit, now, landing: now === 'land' }
}

const easeOut = (t: number) => 1 - (1 - t) ** 3

/** A number that runs from `from` to `to` over `ms` while `running`; otherwise it simply shows `to`. */
export function Counting({ from, to, ms, running, steps }: { from: number; to: number; ms: number; running: boolean; steps?: number[] }) {
  const [t, setT] = useState(running ? 0 : 1)
  useEffect(() => {
    if (!running) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      // A frame's timestamp can be earlier than the moment the effect started.
      const progress = Math.min(1, Math.max(0, (now - start) / ms))
      setT(progress)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running, ms])
  if (!running) return <>{format(to)}</>
  if (steps) {
    const index = Math.min(steps.length - 1, Math.floor(t * steps.length))
    return (
      <span key={index} className="tp-tick">
        {format(steps[index])}
      </span>
    )
  }
  return <>{Math.round(from + (to - from) * easeOut(t))}</>
}

interface RoundShowProps {
  report: RoundReport
  show: RoundShowState
  reduced: boolean
  /** What happened on the bias's side, already worded. */
  aftermath: string[]
  title: string
  /** What to say when the round had no argument. */
  noArgument?: string
  testId?: string
}

const tallyBox = 'inline-flex items-baseline gap-1 rounded-sm border-2 px-1.5 py-0.5'
/** How far into the total's count it settles: once the number has all but arrived. */
const SETTLE_AT = 0.6

/** The total is set larger the harder the round hits, as the damage is. */
export function totalSize(report: RoundReport): string {
  return report.damage >= HUGE_HIT ? 'text-2xl' : report.damage >= BIG_HIT ? 'text-xl' : 'text-lg'
}

/** The beat at which a bias that fell this round gave way: as its Shaken landed, as Unsettle took the rest, or as the argument landed. */
export function breakBeat(report: RoundReport): Beat {
  if (report.phaseChanged && report.released > 0) return 'shift'
  return report.unsettleLoss > 0 ? 'unsettle' : 'land'
}

/**
 * One round, told in order. Every line is laid out from the start and only revealed as its beat comes,
 * so the replay never grows and nothing below it moves. With reduced motion the same beats appear in place, without movement.
 */
export function RoundShow({ report, show, reduced, aftermath, title, noArgument = 'You made no argument.', testId = 'last-round' }: RoundShowProps) {
  const { reached, lit, now, landing } = showProgress(show)
  const before = report.carriedWeight + report.doubtWeight
  const running = report.steps.map((_, i) => before + report.steps.slice(0, i + 1).reduce((sum, s) => sum + s.weight, 0))
  const shownWeight = lit === Infinity || lit >= report.steps.length ? report.weight : lit === 0 ? before : running[lit - 1]
  const previousWeight = lit >= 2 && lit !== Infinity ? running[lit - 2] : before
  const mults = multiplierSteps(report)
  const multShown = reached('mult') ? report.multiplier : mults[0]
  const big = report.damage >= HUGE_HIT ? 'text-3xl' : report.damage >= BIG_HIT ? 'text-2xl' : 'text-xl'
  const appear = reduced ? '' : 'tp-appear'
  const reveal = (beat: Beat) => (reached(beat) ? appear : 'invisible')
  const pop = (beat: Beat) => (now === beat && !reduced ? 'tp-pop' : '')
  const stepIndex = lit === Infinity ? -1 : lit - 1
  return (
    <div
      className="mt-1.5 text-sm text-[var(--tp-text)]"
      data-testid={testId}
      data-show={show.done ? 'done' : 'playing'}
      onClick={show.done ? undefined : show.skip}
    >
      <div className="flex min-h-5 items-baseline justify-between gap-2">
        <p className="text-[0.68rem] uppercase tracking-wider text-[var(--tp-muted)]">{title}</p>
        {!show.done && (
          <button
            type="button"
            onClick={show.skip}
            className="rounded-sm px-1.5 text-xs text-[var(--tp-muted)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--tp-focus)]"
            data-testid="skip-show"
          >
            Skip <span className="hidden sm:inline">(S)</span>
          </button>
        )}
      </div>
      {report.steps.length === 0 ? (
        <p className="mt-1" data-testid="no-argument">
          {noArgument}
        </p>
      ) : (
        <>
          <ol className="mt-1 flex flex-wrap gap-1.5">
            {report.carriedWeight > 0 && <li className="rounded-sm border border-dashed border-[var(--tp-line)] px-2 py-1 text-xs">Leftover Guard +{report.carriedWeight} Weight</li>}
            {report.doubtWeight > 0 && <li className="rounded-sm border border-dashed border-[var(--tp-line)] px-2 py-1 text-xs">Doubts in hand +{report.doubtWeight} Weight</li>}
            {report.lastingMultiplier > 0 && (
              <li className="rounded-sm border border-dashed border-[var(--tp-line)] px-2 py-1 text-xs">For this fight +{format(report.lastingMultiplier)} Multiplier</li>
            )}
            {report.steps.map((step, i) => {
              const on = i < lit
              const current = !show.done && now === 'step' && i === stepIndex
              const counted = !show.done && now === 'mult' && step.multiplier > 0
              const times = step.times
              return (
                <li
                  key={step.uid}
                  className={`rounded-sm border-l-4 bg-[var(--tp-paper)] px-2 py-1 text-xs text-[var(--tp-paper-ink)] ${on ? '' : 'invisible'} ${
                    current || counted ? 'outline-2 outline-[var(--tp-accent)]' : ''
                  } ${current && !reduced ? 'tp-deal' : ''}`}
                  style={{ borderLeftColor: TYPE_COLORS[step.type] }}
                >
                  <span className="font-semibold">{step.name}</span>
                  {step.weight > 0 && <span> +{format(step.weight / times)} Weight</span>}
                  {step.multiplier > 0 && <span> +{format(step.multiplier / times)} Mult</span>}
                  {step.guard > 0 && <span> {step.guard} Guard</span>}
                  {step.unsettle > 0 && <span> Unsettle {step.unsettle}</span>}
                  {times > 1 && (
                    <strong className={`ml-1 rounded-sm bg-[var(--tp-accent)] px-1 text-[var(--tp-on-accent)] ${current && !reduced ? 'tp-pop' : ''}`} data-testid="conclusion-count">
                      Conclusion ×{times} → {step.weight > 0 ? `${step.weight} Weight` : `${format(step.multiplier)} Mult`}
                    </strong>
                  )}
                </li>
              )
            })}
          </ol>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-serif" data-testid="tally">
            <span className={`${tallyBox} border-[var(--tp-evidence)]`}>
              Weight{' '}
              <strong className={`text-base ${now === 'step' ? 'tp-tick' : ''}`} key={`w${lit}`}>
                <Counting from={previousWeight} to={shownWeight} ms={STEP_MS} running={now === 'step'} />
              </strong>
            </span>{' '}
            ×{' '}
            <span className={`${tallyBox} border-[var(--tp-logic)] ${pop('mult')}`}>
              Multiplier{' '}
              <strong className="text-base" key={`m${now === 'mult'}`}>
                <Counting from={0} to={multShown} ms={beatLength('mult', 0, report)} running={now === 'mult'} steps={mults} />
              </strong>
            </span>
            {report.modifiers.length > 0 && reached('mult') && <span className={`text-xs ${pop('mult')}`}>({report.modifiers.join('; ')})</span>}
            <span className={reveal('total')} data-testid="tally-total">
              {' '}={' '}
              <span
                className={`${tallyBox} border-[var(--tp-accent)] ${now === 'total' && !reduced ? 'tp-settle' : ''}`}
                style={now === 'total' && !reduced ? { animationDelay: `${Math.round(SETTLE_AT * beatLength('total', 0, report))}ms` } : undefined}
              >
                <strong className={totalSize(report)}>
                  <Counting from={0} to={report.product} ms={beatLength('total', 0, report)} running={now === 'total'} />
                </strong>
              </span>
            </span>
          </p>
          {report.chain.length > 0 && (
            <ol className={`mt-1 space-y-0.5 ${reveal('adjust')}`} aria-label="Then, in order" data-testid="show-chain">
              {report.chain.map((step) => (
                <li key={step.kind}>
                  → {step.text}
                  {step.kind === 'guard' && report.guardBroken && (
                    <strong className="ml-1 rounded-sm border border-[var(--tp-guard)] px-1 text-[var(--tp-guard)]">Guard broken</strong>
                  )}{' '}
                  = <strong>{step.after}</strong>
                </li>
              ))}
            </ol>
          )}
          <p className={`mt-1 ${reveal('land')}`}>
            <strong className={`${big} font-serif text-[var(--tp-accent)] ${landing && !reduced ? 'tp-pop tp-after-pause' : ''}`}>{report.damage} damage</strong>
            {report.healedBack > 0 && <> (it recovered {report.healedBack})</>}
            {report.selfLoss > 0 && <>; you lost {report.selfLoss} to Backfire</>}
            {report.growth > 0 && <>; repeating yourself made its attacks +{report.growth}</>}
          </p>
        </>
      )}
      {report.unsettleLoss > 0 && <p className={`mt-1 ${reveal('unsettle')}`}>Unsettled, it lost {report.unsettleLoss} before it could act.</p>}
      {aftermath.map((line) => (
        <p key={line} className={`mt-1 ${reveal('act')}`}>
          {line}
        </p>
      ))}
      {report.released > 0 && (
        <p className={`mt-1 font-semibold ${reveal('shift')}`} data-testid="release">
          <strong className={`inline-block rounded-sm border-2 border-[var(--tp-good)] px-1.5 text-[var(--tp-good)] ${pop('shift')}`}>
            Shaken {report.released}: {releaseWords(report.released)}
          </strong>{' '}
          As it changed, everything that shook it landed at once.
        </p>
      )}
    </div>
  )
}
