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
      className="mt-8 rounded-lg border-2 border-dashed border-card-border p-4 text-left text-sm text-foreground/80"
    >
      <p className="font-medium text-foreground">Development only: pretend it is later</p>
      <p className="mt-1" data-testid="dev-today">
        {offsetDays === 0 ? 'Using the real date.' : `Pretending it is ${today} (${offsetDays} days ahead).`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {STEPS.map((step) => (
          <button
            key={step.label}
            type="button"
            onClick={() => setDevOffsetDays(offsetDays + step.days)}
            className="rounded border border-card-border bg-background px-3 py-1.5 text-foreground hover:bg-hover-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {step.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setDevOffsetDays(0)}
          className="rounded border border-card-border bg-background px-3 py-1.5 text-foreground hover:bg-hover-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Back to today
        </button>
      </div>
    </aside>
  )
}
