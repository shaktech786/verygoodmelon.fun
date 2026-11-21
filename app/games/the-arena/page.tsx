import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

const MindDebate = dynamic(() => import('@/components/games/MindDebate'), {
  loading: () => (
    <div className="min-h-[400px] flex items-center justify-center text-foreground/70">
      Loading...
    </div>
  ),
})

export const metadata: Metadata = {
  title: 'The Arena | VeryGoodMelon.Fun',
  description:
    'Two minds, one question, and what each got right. Pick two people and a subject, then watch the conversation unfold.',
}

export default function TheArenaPage() {
  return (
    <GamePageWrapper gameId="mind-debate">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="animate-fade">
          <div className="text-center mb-3 sm:mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-1 sm:mb-2 text-foreground">
              The Arena
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
              Two minds, one question, and what each got right
            </p>
          </div>

          <MindDebate />

          <div className="mt-4 sm:mt-6 text-center">
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
