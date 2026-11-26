'use client'

import { useRef, useState, type RefObject } from 'react'
import type { Thinker } from '@/lib/games/timeless-minds/thinkers'
import { NoteDialog } from '@/components/seedpress/NoteDialog'
import { Stamp } from '@/components/seedpress/Stamp'

/** A few broad shelves; a thinker whose field spans two appears on both. */
const SHELVES: ReadonlyArray<{ label: string; fields: RegExp }> = [
  { label: 'Philosophy & spirit', fields: /Philosophy|Spirituality|Humanitarian/ },
  { label: 'Science & invention', fields: /Science|Physics|Chemistry|Mathematics|Astronomy|Invention|Technology/ },
  { label: 'Arts & writing', fields: /\b(?:Art|Literature|Music|Diarist|Writing)\b/ },
  { label: 'Justice & leadership', fields: /Activism|Civil Rights|Leadership|Justice|Law|Diplomacy|Politics/ },
]

interface ThinkerPhoneBookProps {
  isOpen: boolean
  onClose: () => void
  thinkers: Thinker[]
  onSelectThinker: (thinkerId: string) => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

export default function ThinkerPhoneBook({
  isOpen,
  onClose,
  thinkers,
  onSelectThinker,
  returnFocusRef
}: ThinkerPhoneBookProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [shelf, setShelf] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Filter thinkers by search and category
  const filteredThinkers = thinkers.filter(thinker => {
    const matchesSearch = searchQuery === '' ||
      thinker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thinker.field.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thinker.culture.toLowerCase().includes(searchQuery.toLowerCase())

    const shelfFields = SHELVES.find(s => s.label === shelf)?.fields
    return matchesSearch && (!shelfFields || shelfFields.test(thinker.field))
  })

  const handleCall = (thinkerId: string) => {
    onSelectThinker(thinkerId)
    onClose()
  }


  return (
    <NoteDialog
      title="Directory"
      description="Choose who you'd like to talk with"
      onClose={onClose}
      closeLabel="Close directory"
      size="wide"
      initialFocusRef={searchRef}
      returnFocusRef={returnFocusRef}
    >
      <div className="sp-field">
        <label htmlFor="directory-search" className="sp-field__label sr-only">
          Search thinkers
        </label>
        <input
          ref={searchRef}
          id="directory-search"
          type="search"
          placeholder="Search by name, field, or culture..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sp-field__input"
        />
      </div>

      <div className="sp-directory__shelves">
        {[null, ...SHELVES.map(s => s.label)].map(label => (
          <Stamp key={label ?? 'all'} onClick={() => setShelf(label)} aria-pressed={shelf === label}>
            {label ?? 'All'}
          </Stamp>
        ))}
      </div>

      {filteredThinkers.length === 0 ? (
        <p className="sp-soft">No thinkers found matching your search.</p>
      ) : (
        <ul className="sp-directory__grid">
          {filteredThinkers.map(thinker => (
            <li key={thinker.id} className="sp-sheet sp-directory__card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/games/timeless-minds/avatars/${thinker.id}.png`}
                alt=""
                loading="lazy"
                className="sp-directory__avatar"
              />
              <h3 className="sp-directory__name">{thinker.name}</h3>
              <p className="sp-directory__field">{thinker.field}</p>
              <p className="sp-directory__facts">
                {thinker.era}
                <br />
                {thinker.culture}
              </p>
              <p className="sp-directory__line">{thinker.openingLine}</p>
              <Stamp onClick={() => handleCall(thinker.id)} aria-label={`Start call with ${thinker.name}`}>
                Start Call
              </Stamp>
            </li>
          ))}
        </ul>
      )}

      <p className="sp-soft sp-directory__count">
        {filteredThinkers.length} {filteredThinkers.length === 1 ? 'thinker' : 'thinkers'} available
        {searchQuery && ` matching "${searchQuery}"`}
      </p>
    </NoteDialog>
  )
}
