import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Offline | VeryGoodMelon.Fun',
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6" aria-hidden="true">&#x1f349;</div>
        <h1 className="text-2xl font-semibold mb-3 text-foreground">You&apos;re Offline</h1>
        <p className="text-foreground/70 mb-6">
          It looks like you&apos;ve lost your internet connection. Some games need a connection to work their magic.
        </p>
        <p className="text-sm text-foreground/50">
          Try reconnecting and refreshing the page.
        </p>
      </div>
    </div>
  )
}
