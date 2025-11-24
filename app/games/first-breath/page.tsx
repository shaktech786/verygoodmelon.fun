import type { Metadata } from 'next'
import Link from 'next/link'
import FirstWords from '@/components/games/FirstWords'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'First Breath | VeryGoodMelon.Fun',
  description: 'What would your first words be after crossing over? Share your awakening and see what others would say in a beautiful word cloud.'
}

export default function FirstBreathPage() {
  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
      <div className="animate-fade">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
            First Breath
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
            You&apos;ve just crossed over. What are your first words?
          </p>
        </div>

        <FirstWords />

        <div className="mt-6 text-center">
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
