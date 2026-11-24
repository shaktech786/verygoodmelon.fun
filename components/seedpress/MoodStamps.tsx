import NextLink from 'next/link'
import { MOODS, moodHref, type MoodId } from '@/lib/games/moods'
import { Icon } from './icons/Icon'
import type { IconName } from './icons/glyphs'

const GLYPH: Readonly<Record<MoodId, IconName>> = { restless: 'restless', heavy: 'heavy', play: 'playful' }

/** Three ways in by mood. Each opens the games page filtered to that mood. */
export function MoodStamps() {
  return (
    <nav aria-labelledby="mood-stamps-line" className="sp-moods">
      <p id="mood-stamps-line" className="sp-moods__line">
        Start from how you feel
      </p>
      <ul className="sp-moods__row">
        {MOODS.map((mood) => (
          <li key={mood.id}>
            <NextLink href={moodHref(mood.id)} className="sp-mood">
              <Icon name={GLYPH[mood.id]} size={36} />
              <span>{mood.label}</span>
            </NextLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
