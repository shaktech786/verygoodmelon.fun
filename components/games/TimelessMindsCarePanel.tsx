import { OwnSupportMark } from '@/components/games/OwnSupport'
import { HelplineSentence } from '@/components/games/HelplineSentence'

/** Stays in view for the rest of the visit once a visitor's words suggest they may be in danger. */
export default function TimelessMindsCarePanel({ className = '' }: { className?: string }) {
  return (
    <aside
      aria-label="Support"
      className={`border border-card-border border-l-4 border-l-[var(--melon-green)] bg-card-bg text-foreground text-sm leading-relaxed ${className}`}
    >
      <OwnSupportMark />
      <p>
        <HelplineSentence lead={"You don't have to hold this alone."} />
      </p>
    </aside>
  )
}
