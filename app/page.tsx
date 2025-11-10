import { Gamepad2 } from 'lucide-react'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'
import { SHOWCASE_GAMES } from '@/lib/games/config'

/**
 * Homepage - Game Showcase
 *
 * Displays featured games in Balatro-style joker card format
 * Automatically renders all games marked as isShowcase in config
 */
export default function Home() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {/* Render all showcase games from config */}
        {SHOWCASE_GAMES.map((game, index) => (
          <GameCardShowcase
            key={game.id}
            game={game}
            priority={index < 2} // Prioritize first 2 for LCP
          />
        ))}

        {/* Coming Soon Card */}
        <div className="bg-card-bg border-2 border-dashed border-card-border rounded-2xl p-4 opacity-60 flex flex-col justify-center items-center text-center aspect-[1024/1792]">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Gamepad2 size={24} className="text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            More Coming
          </h3>
          <p className="text-xs text-primary-light">Soon</p>
        </div>
      </div>
    </div>
  )
}
