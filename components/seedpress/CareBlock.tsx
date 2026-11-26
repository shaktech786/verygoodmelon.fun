import { useId } from 'react'
import { HELPLINES, type Helpline } from '@/lib/care/helplines'
import { cn } from '@/lib/utils/cn'
import { Icon } from './icons/Icon'

interface CareBlockProps {
  /** One sentence that opens the block, in a gentle voice. */
  lead?: string
  /** `section` is for a page whose main content is the helplines: a region with its own heading, not an aside. */
  as?: 'aside' | 'section'
  /** The heading a `section` carries. */
  heading?: string
  className?: string
}

function HelplineRow({ line }: { line: Helpline }) {
  return (
    <a
      href={line.href}
      className="sp-care__row"
      {...(line.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <Icon name={line.external ? 'globe' : 'phone'} className="sp-care__mark" />
      <span className="sp-care__words">
        {line.action} <strong className="sp-care__number">{line.label}</strong>
        {line.region && ` (${line.region})`}
        {line.external && <span className="sr-only"> (opens in a new tab)</span>}
      </span>
    </a>
  )
}

/**
 * "The lamp": what a visitor sees when their words suggest danger. The helplines come first and large,
 * then a line of reassurance. It is still: no motion, no go-action, no illustration, no donation slot.
 * Focus is never moved here; it sits before the page's next content in reading order instead.
 */
export function CareBlock({ lead = "You don't have to hold this alone.", as = 'aside', heading = 'Free support lines', className }: CareBlockProps) {
  const headingId = useId()
  const Region = as
  return (
    <Region
      {...(as === 'section' ? { 'aria-labelledby': headingId } : { 'aria-label': 'Support' })}
      className={cn('sp-care', className)}
    >
      {as === 'section' && (
        <h2 id={headingId} className="sp-h3">
          {heading}
        </h2>
      )}
      <p className="sp-care__lead">{lead}</p>
      <ul className="sp-care__lines">
        {HELPLINES.map((line) => (
          <li key={line.id}>
            <HelplineRow line={line} />
          </li>
        ))}
      </ul>
      <p className="sp-care__after">You can stop whenever you like. They listen.</p>
    </Region>
  )
}
