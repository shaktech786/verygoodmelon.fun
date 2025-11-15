import type { Metadata } from 'next'
import HopeDaily from '@/components/games/HopeDaily'

export const metadata: Metadata = {
  title: 'Hope Daily | VeryGoodMelon.Fun',
  description: 'A daily word puzzle about global progress and solutions. Guess the word, learn about positive change in the world.'
}

export default function HopeDailyPage() {
  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
      <div className="animate-fade">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
            Hope Daily
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
            Guess words about global progress. Learn something hopeful.
          </p>
        </div>

        <HopeDaily />

        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-card-bg text-foreground border border-card-border rounded-lg font-medium hover:bg-hover-bg transition-colors text-sm sm:text-base"
          >
            ← Back Home
          </a>
        </div>
      </div>
    </div>
  )
}
