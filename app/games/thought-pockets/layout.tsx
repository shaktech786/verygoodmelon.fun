import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Philosopher | VeryGoodMelon.Fun',
  description: 'Build arguments, defeat cognitive biases in this philosophical deckbuilder roguelike.',
  openGraph: {
    title: 'The Philosopher | VeryGoodMelon.Fun',
    description: 'Build arguments, defeat cognitive biases in this philosophical deckbuilder roguelike.',
    type: 'website',
  },
}

export default function ThoughtPocketsLayout({ children }: { children: React.ReactNode }) {
  return children
}
