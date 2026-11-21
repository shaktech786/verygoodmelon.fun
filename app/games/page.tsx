import type { Metadata } from 'next'
import { GameDirectory } from '@/components/games/GameDirectory'

export const metadata: Metadata = {
  title: 'Games | VeryGoodMelon.Fun',
  description: 'Small, quiet games for a busy mind, to play at your own pace.',
}

export default function GamesPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="mb-10 animate-fade">
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-3">
          Games
        </h1>
        <p className="text-lg text-primary-light">
          Small, quiet games for a busy mind, to play at your own pace.
        </p>
      </div>

      <GameDirectory />
    </div>
  )
}
