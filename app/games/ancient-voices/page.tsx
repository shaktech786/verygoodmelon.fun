import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { GameStage } from '@/components/seedpress/GameStage'
import { Loading } from '@/components/seedpress/Loading'

const TimelessMinds = dynamic(() => import('@/components/games/TimelessMinds'), {
  loading: () => <Loading />,
})

export const metadata: Metadata = {
  title: 'The Sage | VeryGoodMelon.Fun',
  description: 'Imagined conversations with great minds from history, for reflection and calm. Not real quotes from the person.'
}

export default function TheSagePage() {
  return (
    <GameStage gameId="timeless-minds" title="The Sage" lead="Talk through what is on your mind with a great thinker from history" wide sound>
      <TimelessMinds />
    </GameStage>
  )
}
