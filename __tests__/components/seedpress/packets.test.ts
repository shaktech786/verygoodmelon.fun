import { describe, expect, it } from 'vitest'
import { PRINTS } from '@/components/seedpress/packets/art'
import { PACKET_INKS } from '@/components/seedpress/shelves'
import { SHOWCASE_GAMES } from '@/lib/games/config'

describe('packets', () => {
  it.each(SHOWCASE_GAMES.map((game) => [game.title, game.id]))('%s has a two-ink print and its inks', (_title, id) => {
    expect(PRINTS[id]).toBeTypeOf('function')
    expect(PACKET_INKS[id]).toHaveLength(2)
  })
})
