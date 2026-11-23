import type { Metadata } from 'next'
import HardTalk from '@/components/games/HardTalk'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const metadata: Metadata = {
  title: 'The Plain Speaker | VeryGoodMelon.Fun',
  description: 'For the minute before a hard conversation. Settle your body, find what you most want to say, and walk in with one line to carry.'
}

export default function HardTalkPage() {
  return (
    <GamePageWrapper gameId="hard-talk">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        <div className="animate-fade">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
              The Plain Speaker
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
              For the minute before a hard conversation. Go at your own pace.
            </p>
          </div>

          <HardTalk />
        </div>
      </div>
    </GamePageWrapper>
  )
}
