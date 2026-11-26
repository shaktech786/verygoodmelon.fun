import { OwnSupportMark } from '@/components/games/OwnSupport'
import { CareBlock } from '@/components/seedpress/CareBlock'

/** Stays in view for the rest of the visit once a visitor's words suggest they may be in danger. */
export default function TimelessMindsCarePanel({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <OwnSupportMark />
      <CareBlock lead="You don't have to hold this alone." />
    </div>
  )
}
