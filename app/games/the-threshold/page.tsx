import type { Metadata } from 'next'
import HardTalk from '@/components/games/HardTalk'
import { GameStage } from '@/components/seedpress/GameStage'

export const metadata: Metadata = {
  title: 'The Plain Speaker | VeryGoodMelon.Fun',
  description: 'For the minute before a hard conversation. Settle your body, find what you most want to say, and walk in with one line to carry.'
}

export default function HardTalkPage() {
  return (
    <GameStage gameId="hard-talk" title="The Plain Speaker" lead="For the minute before a hard conversation. Go at your own pace." sound>
      <HardTalk />
    </GameStage>
  )
}
