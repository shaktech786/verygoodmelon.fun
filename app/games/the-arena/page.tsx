import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { GameStage } from '@/components/seedpress/GameStage'
import { Loading } from '@/components/seedpress/Loading'

const MindDebate = dynamic(() => import('@/components/games/MindDebate'), {
  loading: () => <Loading />,
})

export const metadata: Metadata = {
  title: 'The Arena | VeryGoodMelon.Fun',
  description:
    'Two minds, one question, and what each got right. Pick two people and a subject, then watch the conversation unfold.',
}

export default function TheArenaPage() {
  return (
    <GameStage gameId="mind-debate" title="The Arena" lead="Two minds, one question, and what each got right" sound>
      <MindDebate />
    </GameStage>
  )
}
