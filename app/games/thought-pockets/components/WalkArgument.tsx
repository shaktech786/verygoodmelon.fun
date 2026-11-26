'use client'

import { useState } from 'react'
import { RunState } from '@/types/thought-pockets'
import { getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { stepWords, walkArgumentText } from '@/lib/games/thought-pockets/data/walkArgument'
import { TYPE_COLORS, TypeMark } from './CardFace'
import { BiasPortrait } from './Sprites'
import { format } from './RoundShow'
import { quietButton } from './NodeScreens'

type Copied = 'idle' | 'copied' | 'failed'

/** The walk's best turn as a keepsake card, with its equation, and a plain-text copy that stays on this device until the player pastes it. */
export function WalkArgument({ run }: { run: RunState }) {
  const [copied, setCopied] = useState<Copied>('idle')
  const best = run.bestArgument
  const text = walkArgumentText(run)
  if (!best || !text) return null
  const { round } = best
  const foe = getEnemyDef(best.enemyId)
  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setCopied('copied'),
      () => setCopied('failed'),
    )
  }
  return (
    <section aria-labelledby="walk-argument-title" className="space-y-2" data-testid="walk-argument">
      <div className="rounded-md border-2 border-[var(--tp-line)] bg-[var(--tp-paper)] p-1 text-[var(--tp-paper-ink)] tp-edge">
        <div className="rounded-sm border-2 border-[var(--tp-mark)] p-3">
          <div className="flex items-center gap-3">
            <BiasPortrait enemyId={foe.id} tier={foe.tier} mood="gives" className="h-12 w-12 shrink-0" />
            <div>
              <h3 id="walk-argument-title" className="text-xs font-semibold text-[var(--tp-paper-muted)]">
                Argument of the walk
              </h3>
              <p className="font-serif text-base font-semibold">Against {foe.name}</p>
            </div>
          </div>
          <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="The cards, in order">
            {round.steps.map((step) => (
              <li key={step.uid} className="rounded-sm border-l-4 border-y border-r border-[var(--tp-line)] bg-[var(--tp-ink-2)] px-2 py-1 text-xs text-[var(--tp-text)]" style={{ borderLeftColor: TYPE_COLORS[step.type] }}>
                <TypeMark type={step.type} />
                {stepWords(step)}
              </li>
            ))}
          </ol>
          <p className="mt-2 font-serif text-base">
            Weight <strong>{round.weight}</strong> × Multiplier <strong>{format(round.multiplier)}</strong> = <strong>{round.product}</strong>
          </p>
          {round.chain.map((step, i) => (
            <p key={`${i}-${step.kind}`} className="text-xs">
              → {step.text}: <strong>{step.after}</strong>
            </p>
          ))}
          <p className="mt-1 font-serif text-2xl font-semibold text-[var(--tp-mark)]">{round.damage} damage</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={quietButton} onClick={copy} data-testid="copy-argument">
          Copy as text
        </button>
        <p role="status" className="text-sm text-[var(--tp-muted)]" data-testid="copy-status">
          {copied === 'copied' ? 'Copied. It is only on your clipboard; nothing was sent anywhere.' : copied === 'failed' ? 'This browser did not allow copying. The text is below to select.' : ''}
        </p>
      </div>
      {copied === 'failed' && (
        <pre className="whitespace-pre-wrap rounded-md border border-[var(--tp-line)] p-2 text-xs" data-testid="argument-text">
          {text}
        </pre>
      )}
    </section>
  )
}
