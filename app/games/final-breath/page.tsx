import type { Metadata } from 'next'
import Link from 'next/link'
import LastWords from '@/components/games/LastWords'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The Final Word | VeryGoodMelon.Fun',
  description: 'If you had one last thing to say to the world, what would it be? Write it, hear it back, and find out why it does not have to wait.'
}

export default function LastWordsPage() {
  return (
    <GamePageWrapper gameId="last-words">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        <div className="animate-fade">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
              The Final Word
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
              If you had one last thing to say to the world, what would it be?
            </p>
          </div>

          <LastWords />

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-card-bg text-foreground border border-card-border rounded-lg font-medium hover:bg-hover-bg transition-colors text-sm sm:text-base"
            >
              &larr; Back Home
            </Link>
          </div>
        </div>
      </div>
    </GamePageWrapper>
  )
}
