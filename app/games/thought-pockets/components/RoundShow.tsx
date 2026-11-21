'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RoundReport } from '@/types/thought-pockets'
import { playTones } from '@/components/games/gentleCues'
import { TYPE_COLORS } from './CardFace'

const STEP_MS = 340
const CONCLUSION_MS = 640
const TOTAL_MS = 560
const ADJUST_MS = 560
const LAND_MS = 700
const BIG_HIT = 20
const HUGE_HIT = 40
const AFTER_MS = 600
const SHIFT_MS = 1100
const LOUDNESS = 0.05

type Beat = 'step' | 'total' | 'adjust' | 'land' | 'unsettle' | 'act' | 'shift'

export function format(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/0$/, '')
}

function hasAdjustments(report: RoundReport): boolean {
  return report.modifiers.length > 0 || report.blocked > 0 || report.raw !== report.product
}

/** The beats of one round in the order they happened: each card, the sum, what changed it, the hit, then the bias's turn. */
export function roundBeats(report: RoundReport): Beat[] {
  const beats: Beat[] = report.steps.map(() => 'step')
  if (report.steps.length > 0) {
    beats.push('total')
    if (hasAdjustments(report)) beats.push('adjust')
    beats.push('land')
  }
  if (report.unsettleLoss > 0) beats.push('unsettle')
  beats.push('act')
  if (report.phaseChanged) beats.push('shift')
  return beats
}

function beatLength(beat: Beat, index: number, report: RoundReport): number {
  switch (beat) {
    case 'step':
      return report.steps[index]?.conclusion ? CONCLUSION_MS : STEP_MS
    case 'total':
      return TOTAL_MS
    case 'adjust':
      return ADJUST_MS
    case 'land':
      return LAND_MS + (report.damage >= BIG_HIT ? 300 : 0) + (report.damage >= HUGE_HIT ? 400 : 0)
    case 'shift':
      return SHIFT_MS
    default:
      return AFTER_MS
  }
}

function soundFor(beat: Beat, index: number, report: RoundReport) {
  if (beat === 'step') {
    const conclusion = report.steps[index]?.conclusion
    playTones(conclusion ? [{ hz: 392, seconds: 0.18 }, { hz: 523, at: 0.12, seconds: 0.3 }] : [{ hz: 330 * 1.12 ** index, seconds: 0.16 }], LOUDNESS)
  }
  if (beat === 'land' && report.damage > 0) {
    const weight = report.damage >= HUGE_HIT ? 1.6 : report.damage >= BIG_HIT ? 1.3 : 1
    playTones([{ hz: 196, toHz: 131, seconds: 0.45 }], LOUDNESS * weight)
  }
  if (beat === 'shift') playTones([{ hz: 262, toHz: 220, seconds: 0.6 }], LOUDNESS)
}

function conclusionTimes(notes: string[]): number | null {
  const note = notes.find((n) => n.startsWith('Conclusion: counts'))
  if (!note) return null
  return note === 'Conclusion: counts twice' ? 2 : Number(note.replace(/\D/g, ''))
}

export interface RoundShowState {
  /** How many beats have played. */
  stage: number
  beats: Beat[]
  done: boolean
  skip: () => void
}

/** Plays a round's beats one after another. A new `id` starts again; skipping jumps to the end. */
export function useRoundShow(id: string | null, report: RoundReport | null): RoundShowState {
  const [state, setState] = useState<{ id: string | null; stage: number; skipped: boolean }>({ id, stage: 0, skipped: false })
  if (state.id !== id) setState({ id, stage: 0, skipped: false })
  const beats = useMemo(() => (report ? roundBeats(report) : []), [report])
  const current = state.id === id ? state : { id, stage: 0, skipped: false }
  const done = id === null || current.skipped || current.stage >= beats.length

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

/** Where the show is: which step is lit, and whether the hit has landed. */
export function showProgress(show: RoundShowState) {
  const reached = (beat: Beat) => show.done || show.beats.slice(0, show.stage + 1).includes(beat)
  const lit = show.done ? Infinity : show.beats.slice(0, show.stage + 1).filter((b) => b === 'step').length
  const landing = !show.done && show.beats[show.stage] === 'land'
  return { reached, lit, landing }
}

interface RoundShowProps {
  report: RoundReport
  show: RoundShowState
  reduced: boolean
  /** What happened on the bias's side, already worded. */
  aftermath: string[]
  title: string
  testId?: string
}

/** One round, told in order. With reduced motion the same beats appear in place, without movement. */
export function RoundShow({ report, show, reduced, aftermath, title, testId = 'last-round' }: RoundShowProps) {
  const { reached, lit, landing } = showProgress(show)
  const before = report.carriedWeight + report.doubtWeight
  const running = report.steps.map((_, i) => before + report.steps.slice(0, i + 1).reduce((sum, s) => sum + s.weight, 0))
  const big = report.damage >= HUGE_HIT ? 'text-3xl' : report.damage >= BIG_HIT ? 'text-2xl' : 'text-xl'
  const appear = reduced ? '' : 'tp-appear'
  return (
    <div
      className="mt-1.5 text-sm text-[var(--tp-text)]"
      data-testid={testId}
      data-show={show.done ? 'done' : 'playing'}
      onClick={show.done ? undefined : show.skip}
    >
      <div className="flex items-baseline justify-between gap-2">
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
        <p className="mt-1">You made no argument.</p>
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
              const now = !show.done && i === lit - 1
              const times = conclusionTimes(step.notes)
              return (
                <li
                  key={step.uid}
                  className={`rounded-sm border-l-4 bg-[var(--tp-paper)] px-2 py-1 text-xs text-[var(--tp-paper-ink)] ${on ? '' : 'opacity-40'} ${now ? 'outline-2 outline-[var(--tp-accent)]' : ''} ${now && !reduced ? 'tp-lift' : ''}`}
                  style={{ borderLeftColor: TYPE_COLORS[step.type] }}
                >
                  <span className="font-semibold">{step.name}</span>
                  {step.weight > 0 && <span> +{format(step.weight / (times ?? 1))} Weight</span>}
                  {step.multiplier > 0 && <span> +{format(step.multiplier / (times ?? 1))} Mult</span>}
                  {step.guard > 0 && <span> {step.guard} Guard</span>}
                  {step.unsettle > 0 && <span> Unsettle {step.unsettle}</span>}
                  {on && step.weight > 0 && <span className="text-[var(--tp-paper-muted)]"> (Weight {running[i]})</span>}
                  {on && times && (
                    <strong className={`ml-1 rounded-sm bg-[var(--tp-accent)] px-1 text-[var(--tp-on-accent)] ${now && !reduced ? 'tp-pop' : ''}`}>
                      Conclusion ×{times} = +{step.weight > 0 ? `${step.weight} Weight` : `${format(step.multiplier)} Mult`}
                    </strong>
                  )}
                </li>
              )
            })}
          </ol>
          {reached('total') && (
            <p className={`mt-1.5 ${appear}`}>
              Weight {report.weight} × Multiplier {format(report.multiplier)} = <strong>{report.product}</strong>
              {reached('adjust') && report.modifiers.length > 0 && (
                <>
                  {' '}
                  ({report.modifiers.join('; ')}) = <strong>{report.raw}</strong>
                </>
              )}
              {reached('adjust') && report.blocked > 0 && (
                <>
                  , its Guard absorbed {report.blocked}
                  {report.guardBroken && <strong className="ml-1 rounded-sm border border-[var(--tp-guard)] px-1 text-[var(--tp-guard)]">Guard broken</strong>}
                </>
              )}
            </p>
          )}
          {reached('land') && (
            <p className={`mt-1 ${appear}`}>
              <strong className={`${big} font-serif text-[var(--tp-accent)] ${landing && !reduced ? 'tp-pop' : ''}`}>{report.damage} damage</strong>
              {report.healedBack > 0 && <> (it recovered {report.healedBack})</>}
              {report.selfLoss > 0 && <>; you lost {report.selfLoss} to Backfire</>}
              {report.growth > 0 && <>; repeating yourself made its attacks +{report.growth}</>}
            </p>
          )}
        </>
      )}
      {reached('unsettle') && report.unsettleLoss > 0 && <p className={`mt-1 ${appear}`}>Unsettled, it lost {report.unsettleLoss} before it could act.</p>}
      {reached('act') && aftermath.map((line) => (
        <p key={line} className={`mt-1 ${appear}`}>
          {line}
        </p>
      ))}
    </div>
  )
}
