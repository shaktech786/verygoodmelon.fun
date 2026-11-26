'use client'

import { useId } from 'react'
import { isOwnMix } from '@/lib/accessibility/own-mix'
import { SENSES, type Sense } from '@/lib/design/tokens'
import { useAccessibility } from '@/lib/hooks/useAccessibility'
import { Icon } from './icons/Icon'
import { useSenseDial } from './useSenseDial'

const STOPS: Readonly<Record<Sense, { label: string; line: string; turn: number }>> = {
  quiet: { label: 'Quiet', line: 'Nothing moves unless you move it. Softer colours.', turn: -60 },
  gentle: { label: 'Gentle', line: 'Small movements when you press things, and one moment of colour when you finish.', turn: 0 },
  lively: { label: 'Lively', line: 'A bit more bounce: packets lift higher and their inks settle as you pass.', turn: 60 },
}

/** The sensory dial: three native radios under a knob that shows where it is set. */
export function SenseDial({ compact = false }: { compact?: boolean }) {
  const { sense, setSense } = useSenseDial()
  const { settings } = useAccessibility()
  const lineId = useId()
  return (
    <fieldset className={compact ? 'sp-dial sp-dial--compact' : 'sp-dial'}>
      <legend className="sp-dial__legend">How it feels</legend>
      <div className="sp-dial__knob" aria-hidden="true" style={{ ['--turn' as string]: `${STOPS[sense].turn}deg` }}>
        <span className="sp-dial__pointer" />
        <span className="sp-dial__mark sp-dial__mark--quiet" />
        <span className="sp-dial__mark sp-dial__mark--gentle" />
        <span className="sp-dial__mark sp-dial__mark--lively" />
      </div>
      <div className="sp-stamp-row">
        {SENSES.map((stop) => (
          <label key={stop} className="sp-choice">
            <input
              type="radio"
              name={lineId}
              value={stop}
              checked={sense === stop}
              onChange={() => setSense(stop)}
              aria-describedby={sense === stop ? lineId : undefined}
            />
            <span className="sp-choice__face">
              {sense === stop && <Icon name="done" />}
              {STOPS[stop].label}
            </span>
          </label>
        ))}
        {isOwnMix(settings) && <span className="sp-dial__mix">Your own mix</span>}
      </div>
      <p id={lineId} className="sp-dial__line">
        {STOPS[sense].line}
      </p>
    </fieldset>
  )
}
