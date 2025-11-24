import { Metadata } from 'next'
import HardChoices from '@/components/games/HardChoices'

export const metadata: Metadata = {
  title: 'Hard Choices - VeryGoodMelon.Fun',
  description: 'Practice critical thinking through thoughtful life dilemmas. See what others chose and build your decision-making skills.',
}

export default function HardChoicesPage() {
  return <HardChoices />
}
