import { useEffect, useRef } from 'react'
import type { KeptLine } from '@/lib/games/timeless-minds/kept-lines'

interface TimelessMindsKeptLinesProps {
  lines: KeptLine[]
  onRemove: (id: string) => void
  onClose: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void
}

function dayLabel(keptOn: string): string {
  const day = new Date(`${keptOn}T12:00:00`)
  return Number.isNaN(day.getTime()) ? '' : day.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** The small shelf of parting words the visitor chose to keep. */
export default function TimelessMindsKeptLines({ lines, onRemove, onClose, onKeyDown }: TimelessMindsKeptLinesProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const removeButtons = useRef<(HTMLButtonElement | null)[]>([])
  const focusAfterRemove = useRef<number | null>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  // After a line is let go, focus moves to the line that took its place, or back to the heading.
  useEffect(() => {
    const index = focusAfterRemove.current
    if (index === null) return
    focusAfterRemove.current = null
    const next = removeButtons.current[Math.min(index, lines.length - 1)]
    if (next) next.focus()
    else headingRef.current?.focus()
  }, [lines])

  const remove = (index: number, id: string) => {
    focusAfterRemove.current = index
    onRemove(id)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kept-lines-title"
        onKeyDown={onKeyDown}
        className="bg-card-bg text-foreground border-card-border rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-fade border my-8"
      >
        <h3
          id="kept-lines-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-sm font-semibold uppercase tracking-wide text-foreground/70 focus-visible:shadow-none!"
        >
          Kept lines
        </h3>
        <p className="mt-1 text-sm text-foreground/70">Parting words you chose to keep. They stay on this device only.</p>

        {lines.length === 0 ? (
          <p className="mt-6">Nothing kept yet. When someone says goodbye, you can keep their parting words here.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {lines.map((line, index) => (
              <li key={line.id} className="bg-background rounded-xl border border-card-border px-4 py-3">
                <blockquote className="font-serif text-base sm:text-lg leading-relaxed">{line.text}</blockquote>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="text-sm text-foreground/70">
                    {line.thinkerName}{line.keptOn && dayLabel(line.keptOn) ? `, kept ${dayLabel(line.keptOn)}` : ''}
                  </p>
                  <button
                    ref={element => { removeButtons.current[index] = element }}
                    type="button"
                    onClick={() => remove(index, line.id)}
                    className="min-h-[44px] px-2 -mr-2 text-sm underline underline-offset-2 text-foreground/70 hover:opacity-80 rounded-lg"
                  >
                    Remove <span className="sr-only">the line from {line.thinkerName}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 min-h-[44px] bg-melon-green text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          Back to the conversation
        </button>
      </div>
    </div>
  )
}
