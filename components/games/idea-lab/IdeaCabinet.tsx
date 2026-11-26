import { useRef, useState } from 'react'
import type { Concept } from '@/lib/games/idea-lab/concepts'
import { isGolden } from '@/lib/games/idea-lab/golds'
import { cabinetOrder, recipeFor } from '@/lib/games/idea-lab/cabinet'
import { Icon } from '@/components/seedpress/icons/Icon'
import { cn } from '@/lib/utils/cn'
import styles from '../IdeaLab.module.css'

interface IdeaCabinetProps {
  discoveries: Concept[]
  combinations: Record<string, string>
  /** Every concept on the bench, base ones included, to name what each idea was made from. */
  concepts: Concept[]
  /** In the wide layout the cabinet is always open; on a phone it waits behind a quiet toggle. */
  wide: boolean
}

const LIST_ID = 'idea-cabinet-list'

const goldInAnyWork = (name: string) => isGolden(name, 0) || isGolden(name, 1)

/** A shelf of every idea the player has made, each one opened in place to be read again. */
export function IdeaCabinet({ discoveries, combinations, concepts, wide }: IdeaCabinetProps) {
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
    <section aria-labelledby="idea-cabinet-title" className={cn(styles.panel, styles.cabinet)}>
      {wide ? (
        <h2 id="idea-cabinet-title" className={styles.heading}>Your cabinet</h2>
      ) : (
        <h2 id="idea-cabinet-title" className={styles.heading}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={LIST_ID}
            onClick={() => setOpen(!open)}
            className={cn(styles.cabinetToggle, open && styles.open)}
          >
            <span>Your cabinet</span>
            <Icon name="chevron-down" size={24} />
          </button>
        </h2>
      )}

      {shown && (
        <div id={LIST_ID}>
          <p className={styles.soft}>
            {shelved.length === 0
              ? 'Empty for now. Every idea you make is shelved here, to read again whenever you like.'
              : 'Every idea you have made, kept here. Open one to read it again.'}
          </p>
          {shelved.length > 0 && (
            <ul onKeyDown={moveFocus} className={styles.drawers}>
              {shelved.map(concept => {
                const reading = concept.id === readingId
                const gold = goldInAnyWork(concept.name)
                const recipe = reading ? recipeFor(concept.id, combinations, concepts) : null
                const panelId = `idea-cabinet-${concept.id}`
                return (
                  <li key={concept.id} className={cn(styles.drawer, gold && styles.drawerGold, reading && styles.drawerReading)}>
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
                      className={styles.drawerButton}
                    >
                      <span aria-hidden="true">{concept.emoji}</span>
                      <span className={styles.drawerName}><span className="sr-only">Reread</span> {concept.name}</span>
                      {gold && <span className={styles.drawerGoldWord}>gold</span>}
                    </button>
                    <div id={panelId} hidden={!reading} className={cn(styles.reading, styles.arrive)}>
                      {reading && (
                        <>
                          <p>{concept.description ? <>&ldquo;{concept.description}&rdquo;</> : 'Made, and kept without a note.'}</p>
                          {recipe && (
                            <p className={styles.made}>
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
