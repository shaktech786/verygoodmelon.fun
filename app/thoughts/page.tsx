import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { THOUGHTS } from '@/lib/thoughts/thoughts-data'
import { ThoughtsList } from './ThoughtsList'

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
    <div className="container mx-auto px-6 py-12 max-w-[640px]">
      <div className="animate-fade">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-3">
            Thoughts
          </h1>
          <p className="text-primary-light text-lg leading-relaxed">
            Short reflections on thinking, feeling, and being.
          </p>
        </header>

        {/* Thought cards — client component handles staggered animation */}
        <ThoughtsList thoughts={sortedThoughts} />

        {/* Back link */}
        <div className="mt-16 pt-8 border-t border-card-border">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary-light hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back home
          </Link>
        </div>
      </div>
    </div>
  )
}
