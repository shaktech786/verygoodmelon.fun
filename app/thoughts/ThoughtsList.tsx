import Link from 'next/link'
import { THEME_LABELS, type Thought } from '@/lib/thoughts/thoughts-data'
import { FreshThought } from './FreshThought'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface ThoughtsListProps {
  thoughts: Thought[]
}

/** A slip for each thought: a flap line with its theme and date, then its title and first line. */
export function ThoughtsList({ thoughts }: ThoughtsListProps) {
  return (
    <>
      <FreshThought />
      <ul className="sp-flaps" aria-label="Thoughts">
        {thoughts.map((thought) => (
          <li key={thought.id}>
            <Link href={`/thoughts/${thought.slug}`} className="sp-flap">
              <span className="sp-flap__top">
                <span>{THEME_LABELS[thought.theme]}</span>
                <time dateTime={thought.createdAt}>{formatDate(thought.createdAt)}</time>
              </span>
              <span className="sp-flap__body">
                <h2 className="sp-flap__title">{thought.title}</h2>
                <span className="sp-flap__excerpt">{thought.body.split('\n\n')[0]}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
