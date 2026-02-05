/**
 * Resolve Avatar ID
 *
 * Maps a thinkerId to a provider-specific avatar identifier:
 *  - simli → Simli face UUID
 *  - talkinghead → GLB model URL
 *  - static → PNG image path
 */

import type { AvatarProviderType } from './types'
import { getSimliFaceId } from '../simli-faces'
import { getTalkingHeadModel } from './talkinghead-models'

export function resolveAvatarId(
  thinkerId: string,
  provider: AvatarProviderType
): string {
  switch (provider) {
    case 'simli':
      return getSimliFaceId(thinkerId)

    case 'talkinghead':
      return getTalkingHeadModel(thinkerId).modelUrl

    case 'static':
      return `/games/timeless-minds/avatars/${thinkerId}.png`

    default:
      return `/games/timeless-minds/avatars/${thinkerId}.png`
  }
}
