'use client'

/**
 * Mind Architect - Card Component
 * Following the visual design system with paper texture and ink aesthetics
 */

import { Card as CardType } from '@/types/mind-architect'
import { cn } from '@/lib/utils'

interface CardProps {
  card: CardType
  onClick?: () => void
  isPlayable?: boolean
  isSelected?: boolean
  isInHand?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  style?: React.CSSProperties
}

const TYPE_COLORS: Record<CardType['type'], string> = {
  evidence: 'bg-emerald-700',
  logic: 'bg-amber-600',
  framework: 'bg-slate-600',
  meta: 'bg-purple-700',
  flaw: 'bg-red-800',
}

const TYPE_BORDER_COLORS: Record<CardType['type'], string> = {
  evidence: 'border-emerald-800',
  logic: 'border-amber-700',
  framework: 'border-slate-700',
  meta: 'border-purple-800',
  flaw: 'border-red-900',
}

const SIZE_CLASSES = {
  sm: 'w-20 h-28 text-[9px]',
  md: 'w-32 h-44 text-xs',
  lg: 'w-48 h-64 text-sm',
}

export function Card({
  card,
  onClick,
  isPlayable = true,
  isSelected = false,
  isInHand = false,
  size = 'md',
  className,
  style,
}: CardProps) {
  const handleClick = () => {
    if (isPlayable && onClick) {
      onClick()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isPlayable && onClick) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={isPlayable ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${card.name} - ${card.type} card, cost ${card.cost}`}
      aria-pressed={isSelected}
      aria-disabled={!isPlayable}
      className={cn(
        // Base styles
        'relative flex flex-col overflow-hidden rounded-lg border-2 transition-all duration-150',
        // Paper texture background
        'bg-[#F7F3EB]',
        // Size
        SIZE_CLASSES[size],
        // Border color by type
        TYPE_BORDER_COLORS[card.type],
        // Interactive states
        isPlayable && 'cursor-pointer hover:-translate-y-2 hover:shadow-lg',
        !isPlayable && 'opacity-60 saturate-50 cursor-not-allowed',
        isSelected && '-translate-y-3 scale-105 ring-2 ring-amber-400 shadow-xl',
        // Focus styles for accessibility
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
        className
      )}
      style={{
        boxShadow: isSelected
          ? '0 12px 32px rgba(232, 197, 108, 0.3)'
          : '0 4px 12px rgba(45, 42, 38, 0.15)',
        ...style,
      }}
    >
      {/* Header bar (card type color) */}
      <div
        className={cn(
          'h-1.5 w-full',
          TYPE_COLORS[card.type],
          'shadow-inner'
        )}
      />

      {/* Card content */}
      <div className="flex-1 flex flex-col p-2">
        {/* Cost indicator */}
        <div className="absolute top-2 right-2 flex gap-0.5">
          {Array.from({ length: card.cost }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#2D2A26]"
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Card name */}
        <h3
          className={cn(
            'font-serif font-bold text-[#2D2A26] text-center leading-tight',
            size === 'sm' && 'text-[10px]',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base'
          )}
        >
          {card.name}
          {card.upgraded && <span className="text-amber-600">+</span>}
        </h3>

        {/* Card type */}
        <p className="text-[#8A847A] text-center capitalize italic text-[80%]">
          {card.type}
        </p>

        {/* Illustration area */}
        <div className="flex-1 my-1 rounded border border-[#D4C9B5] bg-[#EDE6D6] flex items-center justify-center min-h-[40px]">
          <span className="text-2xl opacity-50" aria-hidden="true">
            {getCardIcon(card)}
          </span>
        </div>

        {/* Stats */}
        {(card.weight || card.multiplier) && (
          <div className="flex justify-around py-1 px-1 bg-[#D4C9B5] rounded text-[#2D2A26]">
            {card.weight && (
              <div className="text-center">
                <div className="text-[8px] uppercase tracking-wide text-[#5A5550]">
                  Weight
                </div>
                <div className="font-mono font-bold">{card.weight}</div>
              </div>
            )}
            {card.multiplier && (
              <div className="text-center">
                <div className="text-[8px] uppercase tracking-wide text-[#5A5550]">
                  Multi
                </div>
                <div className="font-mono font-bold">×{card.multiplier}</div>
              </div>
            )}
          </div>
        )}

        {/* Effect text */}
        <p className="text-[#2D2A26] leading-tight mt-1 text-[90%]">
          {card.description}
        </p>

        {/* Flavor text */}
        {card.flavorText && size !== 'sm' && (
          <p className="text-[#8A847A] italic text-[80%] border-t border-dashed border-[#D4C9B5] pt-1 mt-auto">
            {card.flavorText}
          </p>
        )}
      </div>

      {/* Upgrade ribbon */}
      {card.upgraded && (
        <div
          className="absolute top-0 right-0 w-0 h-0"
          style={{
            borderTop: '16px solid #E8C56C',
            borderRight: '16px solid #E8C56C',
            borderBottom: '16px solid transparent',
            borderLeft: '16px solid transparent',
          }}
          aria-label="Upgraded"
        />
      )}
    </div>
  )
}

function getCardIcon(card: CardType): string {
  switch (card.type) {
    case 'evidence':
      return '📊'
    case 'logic':
      return '🔗'
    case 'framework':
      return '📐'
    case 'meta':
      return '🔮'
    case 'flaw':
      return '💔'
    default:
      return '📄'
  }
}

// =============================================================================
// CARD HAND COMPONENT
// =============================================================================

interface CardHandProps {
  cards: CardType[]
  onCardClick: (index: number) => void
  canPlayCard: (card: CardType) => boolean
  selectedIndex?: number
  className?: string
}

export function CardHand({
  cards,
  onCardClick,
  canPlayCard,
  selectedIndex,
  className,
}: CardHandProps) {
  return (
    <div
      className={cn(
        'flex justify-center items-end gap-0 py-4',
        className
      )}
      role="group"
      aria-label="Your hand"
    >
      {cards.map((card, index) => {
        // Calculate fan angle and offset
        const middleIndex = (cards.length - 1) / 2
        const offset = index - middleIndex
        const angle = offset * 3 // 3 degrees per card
        const yOffset = Math.abs(offset) * 4 // Vertical offset for arc

        return (
          <div
            key={`${card.id}-${index}`}
            className="relative transition-all duration-150"
            style={{
              transform: `rotate(${angle}deg) translateY(${yOffset}px)`,
              transformOrigin: 'bottom center',
              marginLeft: index === 0 ? 0 : '-24px', // Overlap cards
              zIndex: selectedIndex === index ? 100 : index,
            }}
          >
            <Card
              card={card}
              onClick={() => onCardClick(index)}
              isPlayable={canPlayCard(card)}
              isSelected={selectedIndex === index}
              isInHand
              size="md"
            />
          </div>
        )
      })}
    </div>
  )
}
