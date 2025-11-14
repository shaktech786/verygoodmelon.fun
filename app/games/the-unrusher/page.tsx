import type { Metadata } from 'next'
import TheUnrusher from '@/components/games/TheUnrusher'

export const metadata: Metadata = {
  title: 'The Unrusher | VeryGoodMelon.Fun',
  description: 'An anti-game about slowing down. Choose tasks that reward patience and presence. No rush, just calm.'
}

export default function TheUnrusherPage() {
  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
      <div className="animate-fade">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
            The Unrusher
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
            The fastest way to reduce anxiety is to stop rushing.
          </p>
        </div>

        <TheUnrusher />

        <div className="mt-6 text-center">
          <a
            href="/games"
            className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base"
          >
            ← Back to Games
          </a>
        </div>
      </div>
    </div>
  )
}
