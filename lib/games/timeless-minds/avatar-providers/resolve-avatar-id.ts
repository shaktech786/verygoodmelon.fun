/**
 * Resolve Avatar ID
 *
 * Maps a thinkerId to a provider-specific avatar identifier:
 *  - simli → Simli face UUID
 *  - talkinghead → GLB model URL
 *  - static → the thinker id; the duotone portrait is picked per theme
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
      return thinkerId

    default:
      return thinkerId
  }
}
