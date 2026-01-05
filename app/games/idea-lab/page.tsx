import { Metadata } from 'next'
import IdeaLab from '@/components/games/IdeaLab'

export const metadata: Metadata = {
  title: 'The Idea Lab - VeryGoodMelon.Fun',
  description: 'Combine philosophical concepts to discover new ideas. Mix Love with Fear, Time with Death, Freedom with Order—what emerges might surprise you.',
}

export default function IdeaLabPage() {
  return <IdeaLab />
}
