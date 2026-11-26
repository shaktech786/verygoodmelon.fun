import { ALL_GAMES } from '@/lib/games/config'
import { OG_SIZE, gameCardImage } from '@/lib/og/game-card'

export const alt = 'VeryGoodMelon.Fun Game'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const game = ALL_GAMES.find((g) => g.slug === slug)
  return gameCardImage({
    title: game?.title ?? 'VeryGoodMelon.Fun',
    description: game?.description ?? 'Thoughtful games to reduce anxiety',
    gameId: game?.id,
  })
}
