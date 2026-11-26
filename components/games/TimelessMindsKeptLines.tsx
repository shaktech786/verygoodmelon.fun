import { useEffect, useRef, type RefObject } from 'react'
import { NoteDialog } from '@/components/seedpress/NoteDialog'
import { Stamp } from '@/components/seedpress/Stamp'
import type { KeptLine } from '@/lib/games/timeless-minds/kept-lines'

interface TimelessMindsKeptLinesProps {
  lines: KeptLine[]
  onRemove: (id: string) => void
  onClose: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

function dayLabel(keptOn: string): string {
  const day = new Date(`${keptOn}T12:00:00`)
  return Number.isNaN(day.getTime()) ? '' : day.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** The small shelf of parting words the visitor chose to keep. */
export default function TimelessMindsKeptLines({ lines, onRemove, onClose, returnFocusRef }: TimelessMindsKeptLinesProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const removeButtons = useRef<(HTMLButtonElement | null)[]>([])
  const focusAfterRemove = useRef<number | null>(null)

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
    <NoteDialog
      title="Kept lines"
      description="Parting words you chose to keep. They stay on this device only."
      onClose={onClose}
      titleRef={headingRef}
      returnFocusRef={returnFocusRef}
      scrimCloses
      actions={<Stamp onClick={onClose}>Back to the conversation</Stamp>}
    >
      {lines.length === 0 ? (
        <p>Nothing kept yet. When someone says goodbye, you can keep their parting words here.</p>
      ) : (
        <ul className="sp-kept">
          {lines.map((line, index) => (
            <li key={line.id} className="sp-sheet sp-kept__line">
              <blockquote className="sp-kept__words">{line.text}</blockquote>
              <p className="sp-kept__by">
                {line.thinkerName}{line.keptOn && dayLabel(line.keptOn) ? `, kept ${dayLabel(line.keptOn)}` : ''}
              </p>
              <button
                ref={element => { removeButtons.current[index] = element }}
                type="button"
                onClick={() => remove(index, line.id)}
                className="sp-quiet"
              >
                Remove <span className="sr-only">the line from {line.thinkerName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </NoteDialog>
  )
}
