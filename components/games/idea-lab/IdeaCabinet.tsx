import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Concept } from '@/lib/games/idea-lab/concepts'
import { isGolden } from '@/lib/games/idea-lab/golds'
import { cabinetOrder, recipeFor } from '@/lib/games/idea-lab/cabinet'

interface IdeaCabinetProps {
  discoveries: Concept[]
  combinations: Record<string, string>
  /** Every concept on the bench, base ones included, to name what each idea was made from. */
  concepts: Concept[]
  /** In the wide layout the cabinet is always open; on a phone it waits behind a quiet toggle. */
  wide: boolean
  reducedMotion: boolean
}

const LIST_ID = 'idea-cabinet-list'

const goldInAnyWork = (name: string) => isGolden(name, 0) || isGolden(name, 1)

/** A shelf of every idea the player has made, each one opened in place to be read again. */
export function IdeaCabinet({ discoveries, combinations, concepts, wide, reducedMotion }: IdeaCabinetProps) {
  const [open, setOpen] = useState(false)
  const [readingId, setReadingId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const buttons = useRef(new Map<string, HTMLButtonElement>())

  const shelved = cabinetOrder(discoveries)
  if (!wide && shelved.length === 0) return null

  const shown = wide || open
  const tabStop = shelved.some(c => c.id === activeId) ? activeId : shelved[0]?.id

  const moveFocus = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const index = shelved.findIndex(c => c.id === tabStop)
    const last = shelved.length - 1
    const moves: Record<string, number> = {
      ArrowDown: Math.min(index + 1, last),
      ArrowRight: Math.min(index + 1, last),
      ArrowUp: Math.max(index - 1, 0),
      ArrowLeft: Math.max(index - 1, 0),
      Home: 0,
      End: last,
    }
    const next = moves[event.key]
    if (next === undefined) return
    event.preventDefault()
    setActiveId(shelved[next].id)
    buttons.current.get(shelved[next].id)?.focus()
  }

  const toggleReading = (id: string) => {
    setActiveId(id)
    setReadingId(current => (current === id ? null : id))
  }

  return (
    <section aria-labelledby="idea-cabinet-title" className="mt-6 bg-card-bg border border-card-border rounded-xl p-4 sm:p-6">
      {wide ? (
        <h2 id="idea-cabinet-title" className="font-medium text-foreground/80">Your cabinet</h2>
      ) : (
        <h2 id="idea-cabinet-title" className="m-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={LIST_ID}
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between gap-3 min-h-[44px] -my-1 text-left font-medium text-foreground/80 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <span>Your cabinet</span>
            <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-foreground/60 ${reducedMotion ? '' : 'transition-transform duration-150'} ${open ? 'rotate-180' : ''}`} />
          </button>
        </h2>
      )}

      {shown && (
        <div id={LIST_ID}>
          <p className="text-sm text-foreground/70 mt-1 mb-4">
            {shelved.length === 0
              ? 'Empty for now. Every idea you make is shelved here, to read again whenever you like.'
              : 'Every idea you have made, kept here. Open one to read it again.'}
          </p>
          {shelved.length > 0 && (
            <ul onKeyDown={moveFocus} className="grid grid-cols-2 gap-2 items-start">
              {shelved.map(concept => {
                const reading = concept.id === readingId
                const gold = goldInAnyWork(concept.name)
                const recipe = reading ? recipeFor(concept.id, combinations, concepts) : null
                const panelId = `idea-cabinet-${concept.id}`
                return (
                  <li
                    key={concept.id}
                    className={`rounded-lg border transition-colors ${
                      reading
                        ? 'border-chosen-line bg-chosen'
                        : gold
                          ? 'border-warm/70 bg-warm/10'
                          : 'border-card-border bg-foreground/[0.03]'
                    }`}
                  >
                    <button
                      ref={element => {
                        if (!element) return
                        buttons.current.set(concept.id, element)
                        return () => { buttons.current.delete(concept.id) }
                      }}
                      type="button"
                      tabIndex={concept.id === tabStop ? 0 : -1}
                      aria-expanded={reading}
                      aria-controls={panelId}
                      onClick={() => toggleReading(concept.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 min-h-[44px] text-left text-sm font-medium text-foreground rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      <span aria-hidden="true" className="text-lg leading-none">{concept.emoji}</span>
                      <span className="flex-1 min-w-0 break-words"><span className="sr-only">Reread</span> {concept.name}</span>
                      {gold && <span className="text-xs font-normal text-foreground/70">gold</span>}
                    </button>
                    <div id={panelId} hidden={!reading} className={`px-3 pb-3 pt-0.5 ${reducedMotion ? '' : 'animate-fade'}`}>
                      {reading && (
                        <>
                          <p className="text-sm leading-relaxed text-foreground/85 italic">
                            {concept.description ? <>&ldquo;{concept.description}&rdquo;</> : 'Made, and kept without a note.'}
                          </p>
                          {recipe && (
                            <p className="mt-1.5 text-xs text-foreground/70">
                              Made from <span aria-hidden="true">{recipe[0].emoji} </span>{recipe[0].name} and <span aria-hidden="true">{recipe[1].emoji} </span>{recipe[1].name}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
