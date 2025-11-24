import type { Metadata } from 'next'
import Link from 'next/link'
import TheUntangler from '@/components/games/TheUntangler'

export const metadata: Metadata = {
  title: 'The Untangler | VeryGoodMelon.Fun',
  description: 'Untangle complex knots by moving nodes so no lines cross. Find clarity through perspective.'
}

export default function TheUntanglerPage() {
  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
      <div className="animate-fade">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
            The Untangler
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
            Clarity through perspective.
          </p>
        </div>

        <TheUntangler />

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
