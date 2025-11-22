import type { Metadata } from 'next'
import Link from 'next/link'
import CloudWatcher from '@/components/games/CloudWatcher'

export const metadata: Metadata = {
  title: 'Cloud Watcher | VeryGoodMelon.Fun',
  description: 'Watch clouds drift by and name the shapes you see. Peaceful observation and childlike wonder.'
}

export default function CloudWatcherPage() {
  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 max-w-5xl">
      <div className="animate-fade">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
            Cloud Watcher
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
            Look up. Slow down. Wonder.
          </p>
        </div>

        <CloudWatcher />

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
