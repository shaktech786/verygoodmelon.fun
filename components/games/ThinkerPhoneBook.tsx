'use client'

import { useState } from 'react'
import { Book, Search, X, Phone, Calendar, Globe2 } from 'lucide-react'
import type { Thinker } from '@/lib/games/timeless-minds/thinkers'

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  if (!isOpen) return null

  // Filter thinkers by search and category
  const filteredThinkers = thinkers.filter(thinker => {
    const matchesSearch = searchQuery === '' ||
      thinker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thinker.field.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thinker.culture.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || thinker.field === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(thinkers.map(t => t.field))).sort()]

  const handleCall = (thinkerId: string) => {
    onSelectThinker(thinkerId)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent to-accent/80 text-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Book size={32} className="text-white" />
              <div>
                <h2 className="text-2xl font-semibold">The Phone Book</h2>
                <p className="text-white/90 text-sm">Select who you&apos;d like to speak with</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40" size={20} />
            <input
              type="text"
              placeholder="Search by name, field, or culture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-white/30 text-foreground"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-card-bg border-b border-card-border px-6 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-accent text-white'
                    : 'bg-hover-bg text-foreground/70 hover:bg-card-border'
                }`}
              >
                {category === 'all' ? 'All' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Thinkers List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredThinkers.length === 0 ? (
            <div className="text-center py-12 text-foreground/50">
              <Book size={48} className="mx-auto mb-3 opacity-50" />
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
                  {/* Avatar Placeholder */}
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-accent/20 to-success/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    👤
                  </div>

                  {/* Name & Title */}
                  <h3 className="text-center font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">
                    {thinker.name}
                  </h3>
                  <p className="text-center text-xs text-foreground/60 mb-3">{thinker.field}</p>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-foreground/70 mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-foreground/40 flex-shrink-0" />
                      <span>{thinker.era}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe2 size={12} className="text-foreground/40 flex-shrink-0" />
                      <span>{thinker.culture}</span>
                    </div>
                  </div>

                  {/* Opening Line Preview */}
                  <p className="text-xs text-foreground/60 italic line-clamp-2 mb-3">
                    &quot;{thinker.openingLine}&quot;
                  </p>

                  {/* Call Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCall(thinker.id)
                    }}
                    className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 text-sm font-medium group-hover:shadow-md"
                  >
                    <Phone size={14} />
                    Start Call
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-hover-bg border-t border-card-border px-6 py-4 text-center text-xs text-foreground/60">
          <p>
            {filteredThinkers.length} {filteredThinkers.length === 1 ? 'thinker' : 'thinkers'} available
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
      </div>
    </div>
  )
}
