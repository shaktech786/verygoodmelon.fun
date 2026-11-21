import type { Metadata } from 'next'
import Link from 'next/link'
import { HelplineSentence } from '@/components/games/HelplineSentence'

export const metadata: Metadata = {
  title: 'Need to talk? | VeryGoodMelon.Fun',
  description: 'Free, confidential support lines, open at any hour.',
}

export default function SupportPage() {
  return (
    <div className="container mx-auto px-6 py-16 max-w-2xl animate-fade">
      <h1 className="text-3xl sm:text-4xl font-light text-foreground mb-6">Need to talk?</h1>
      <div className="space-y-5 text-base sm:text-lg text-foreground/85 leading-relaxed">
        <p>
          Some days are heavier than a game can hold, and that is nothing to be ashamed of. Talking to a person can help,
          even when it is hard to know where to start.
        </p>
        <p>
          <HelplineSentence lead="You do not need to be in crisis to reach out." />
        </p>
        <p>The people on these lines are kind, they listen, and you can stop whenever you like.</p>
      </div>
      <p className="mt-10">
        <Link
          href="/games/the-still-point"
          className="inline-flex items-center min-h-11 px-5 rounded-lg border border-card-border bg-card-bg text-foreground font-medium hover:bg-hover-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Or breathe slowly for a minute
        </Link>
      </p>
    </div>
  )
}
