'use client'

import { useEffect, useState } from 'react'
import { Book, Search, X, Phone, Calendar, Globe2 } from 'lucide-react'
import type { Thinker } from '@/lib/games/timeless-minds/thinkers'
import { Button } from '@/components/ui/Button'

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
}

export default function ThinkerPhoneBook({
  isOpen,
  onClose,
  thinkers,
  onSelectThinker
}: ThinkerPhoneBookProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [shelf, setShelf] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen, onClose])

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
    <div className="fixed inset-0 bg-black/50 z-[100] overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="directory-title"
          className="bg-background rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade overflow-hidden my-8"
        >
        {/* Header */}
        <div className="shrink-0 bg-card-bg text-foreground border-b border-card-border p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Book size={28} className="text-melon-green" aria-hidden="true" />
              <div>
                <h2 id="directory-title" className="text-2xl font-semibold">Directory</h2>
                <p className="text-foreground/70 text-sm">Choose who you&apos;d like to talk with</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Close directory"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60" size={20} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search thinkers"
              autoFocus
              placeholder="Search by name, field, or culture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-background text-foreground border border-card-border placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="shrink-0 bg-card-bg border-b border-card-border px-6 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {[null, ...SHELVES.map(s => s.label)].map(label => (
              <button
                key={label ?? 'all'}
                onClick={() => setShelf(label)}
                aria-pressed={shelf === label}
                className={`px-4 py-1.5 min-h-[44px] rounded-full text-sm font-medium transition-colors ${
                  shelf === label
                    ? 'bg-melon-green text-background'
                    : 'bg-hover-bg text-foreground/80 hover:bg-card-border'
                }`}
              >
                {label ?? 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Thinkers List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredThinkers.length === 0 ? (
            <div className="text-center py-12 text-foreground/70">
              <Book size={48} className="mx-auto mb-3 opacity-50" aria-hidden="true" />
              <p>No thinkers found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredThinkers.map(thinker => (
                <div
                  key={thinker.id}
                  className="bg-card-bg border border-card-border rounded-lg p-4 hover:shadow-lg hover:border-accent/30 transition-all group cursor-pointer"
                  onClick={() => handleCall(thinker.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/games/timeless-minds/avatars/${thinker.id}.png`}
                    alt=""
                    loading="lazy"
                    className="w-20 h-20 mx-auto mb-3 rounded-full object-cover object-[center_20%] bg-gradient-to-br from-accent/20 to-success/20"
                  />

                  {/* Name & Title */}
                  <h3 className="text-center font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">
                    {thinker.name}
                  </h3>
                  <p className="text-center text-xs text-foreground/70 mb-3">{thinker.field}</p>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-foreground/70 mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-foreground/60 flex-shrink-0" aria-hidden="true" />
                      <span>{thinker.era}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe2 size={12} className="text-foreground/60 flex-shrink-0" aria-hidden="true" />
                      <span>{thinker.culture}</span>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/70 line-clamp-2 mb-3">{thinker.openingLine}</p>

                  {/* Call Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCall(thinker.id)
                    }}
                    variant="primary"
                    className="w-full px-4 py-2 flex items-center justify-center gap-2 text-sm group-hover:shadow-md"
                    aria-label={`Start call with ${thinker.name}`}
                  >
                    <Phone size={14} aria-hidden="true" />
                    Start Call
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-hover-bg border-t border-card-border px-6 py-4 text-center text-xs text-foreground/70">
          <p>
            {filteredThinkers.length} {filteredThinkers.length === 1 ? 'thinker' : 'thinkers'} available
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
        </div>
      </div>
    </div>
  )
}
