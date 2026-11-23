import type { Metadata } from 'next'
import FirstWords from '@/components/games/FirstWords'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The Awakening | VeryGoodMelon.Fun',
  description: 'Imagine the moment after your life ends, say your first words, and wake at dawn with one small thing to bring back into tomorrow.'
}

export default function FirstBreathPage() {
  return (
    <GamePageWrapper gameId="first-words">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        <div className="animate-fade">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
              The Awakening
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
              Imagine the moment after your life ends. Say your first words, then wake up with something for tomorrow.
            </p>
          </div>

          <FirstWords />
        </div>
      </div>
    </GamePageWrapper>
  )
}
