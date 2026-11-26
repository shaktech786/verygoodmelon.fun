'use client'

import { setDevOffsetDays } from './keeperStore'

const STEPS: { label: string; days: number }[] = [
  { label: '+1 day', days: 1 },
  { label: '+1 week', days: 7 },
  { label: '+1 month', days: 31 },
  { label: '+3 months', days: 92 },
]

/** Development only: pretend time has passed, to try returning to a capsule. */
export function DevTimeTravel({ offsetDays, today }: { offsetDays: number; today: string }) {
  return (
    <aside
      aria-label="Development time travel"
      className="mt-8 rounded-sheet border-2 border-dashed border-rule-strong p-4 text-left text-meta text-ink/80"
    >
      <p className="font-medium text-ink">Development only: pretend it is later</p>
      <p className="mt-1" data-testid="dev-today">
        {offsetDays === 0 ? 'Using the real date.' : `Pretending it is ${today} (${offsetDays} days ahead).`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {STEPS.map((step) => (
          <button
            key={step.label}
            type="button"
            onClick={() => setDevOffsetDays(offsetDays + step.days)}
            className="rounded-stamp border border-rule-strong bg-paper px-3 py-1.5 text-ink hover:bg-rind-wash focus:outline-none"
          >
            {step.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setDevOffsetDays(0)}
          className="rounded-stamp border border-rule-strong bg-paper px-3 py-1.5 text-ink hover:bg-rind-wash focus:outline-none"
        >
          Back to today
        </button>
      </div>
    </aside>
  )
}
