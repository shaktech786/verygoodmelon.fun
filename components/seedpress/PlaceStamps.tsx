import { cn } from '@/lib/utils/cn'
import { Icon } from './icons/Icon'

interface PlaceStampsProps {
  /** Where the visitor is, said as a word each. Never numbered, never a count. */
  places: readonly string[]
  /** The place they are at, or -1 before the first and after the last. */
  here: number
  label: string
  className?: string
}

/** A stamp row of places: the ones behind are ticked, the one here is rind. Not pressable. */
export function PlaceStamps({ places, here, label, className }: PlaceStampsProps) {
  return (
    <ol aria-label={label} className={cn('sp-places', className)}>
      {places.map((place, index) => (
        <li key={place} aria-current={index === here ? 'step' : undefined} className={cn('sp-place', index < here && 'is-done', index === here && 'is-here')}>
          {index < here && <Icon name="done" />}
          {place}
        </li>
      ))}
    </ol>
  )
}
