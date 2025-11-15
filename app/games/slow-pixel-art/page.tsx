import type { Metadata } from 'next'
import Link from 'next/link'
import SlowPixelArt from '@/components/games/SlowPixelArt'

export const metadata: Metadata = {
  title: 'Slow Pixel Art | VeryGoodMelon.Fun',
  description: 'A collaborative pixel art canvas. Place one pixel every minute. Watch art emerge slowly, together.'
}

export default function SlowPixelArtPage() {
  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
      <div className="animate-fade">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
            Slow Pixel Art
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
            One pixel at a time. Patience rewarded.
          </p>
        </div>

        <SlowPixelArt />

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
