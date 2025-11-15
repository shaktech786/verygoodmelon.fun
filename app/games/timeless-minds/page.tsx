import type { Metadata } from 'next'
import Link from 'next/link'
import TimelessMinds from '@/components/games/TimelessMinds'

export const metadata: Metadata = {
  title: 'Timeless Minds | VeryGoodMelon.Fun',
  description: 'Have a meaningful video conversation with a great mind from history. Each conversation is unique, supportive, and growth-oriented.'
}

export default function TimelessMindsPage() {
  return (
    <div className="container mx-auto px-4 py-3 sm:py-4">
      <div className="animate-fade">
        <div className="text-center mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-1 sm:mb-2 text-foreground">
            Timeless Minds
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
            Connect with a great thinker from history
          </p>
        </div>

        <TimelessMinds />

        <div className="mt-4 sm:mt-6 text-center">
          <Link
            href="/"
            className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-card-bg text-foreground border border-card-border rounded-lg font-medium hover:bg-hover-bg transition-colors text-sm sm:text-base"
          >
            ← Back Home
          </Link>
        </div>
      </div>
    </div>
  )
}
