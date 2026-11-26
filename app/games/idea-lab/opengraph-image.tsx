import { gameImage } from '@/lib/og/game-card'

export const alt = 'The Alchemist - VeryGoodMelon.Fun'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return gameImage('idea-lab')
}
