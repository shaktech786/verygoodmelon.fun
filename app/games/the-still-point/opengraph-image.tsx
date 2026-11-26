import { OG_SIZE, gameCardImage } from '@/lib/og/game-card'

export const alt = 'The Harmonist - VeryGoodMelon.Fun'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function OGImage() {
  return gameCardImage({
    title: 'The Harmonist',
    description: 'Guided breathing patterns to calm your nervous system',
    gameId: 'breathing-patterns',
  })
}
