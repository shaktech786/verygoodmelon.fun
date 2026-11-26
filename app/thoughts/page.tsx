import type { Metadata } from 'next'
import { THOUGHTS } from '@/lib/thoughts/thoughts-data'
import { ThoughtsList } from './ThoughtsList'
import { SubmitThought } from './SubmitThought'
import { Prose } from '@/components/seedpress/Prose'
import { Stamp } from '@/components/seedpress/Stamp'

export const metadata: Metadata = {
  title: 'Thoughts - VeryGoodMelon.Fun',
  description:
    'Short reflections on patience, wonder, impermanence, creativity, rest, connection, and perspective. Thoughtful prose to slow you down.',
  openGraph: {
    title: 'Thoughts - VeryGoodMelon.Fun',
    description: 'Short reflections on thinking, feeling, and being.',
    url: 'https://verygoodmelon.fun/thoughts',
  },
}

// Sort thoughts newest-first
const sortedThoughts = [...THOUGHTS].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
)

export default function ThoughtsPage() {
  return (
    <Prose title="Thoughts" lead={<p>Short reflections on thinking, feeling, and being.</p>}>
      <ThoughtsList thoughts={sortedThoughts} />
      <SubmitThought />
      <p className="sp-prose__actions">
        <Stamp href="/" icon="back">
          Back home
        </Stamp>
      </p>
    </Prose>
  )
}
