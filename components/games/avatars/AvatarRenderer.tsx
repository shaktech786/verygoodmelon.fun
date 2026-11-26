'use client'

import { Suspense, lazy, forwardRef, useMemo } from 'react'
import type { AvatarComponentProps, AvatarHandle } from '@/lib/games/timeless-minds/avatar-providers/types'
import { getActiveProvider } from '@/lib/games/timeless-minds/avatar-providers/registry'

// Lazy-load provider components — only downloads the active one
const TalkingHeadAvatar = lazy(() => import('./TalkingHeadAvatar'))
const SimliAvatar = lazy(() => import('./SimliAvatar'))
const StaticAvatar = lazy(() => import('./StaticAvatar'))

function AvatarLoadingPlaceholder() {
  return (
    <div className="w-full h-full bg-ink/10" aria-hidden="true" />
  )
}

/**
 * AvatarRenderer — dynamic provider switcher.
 *
 * Reads the active provider from env and lazy-loads the right component.
 * All providers share the same props interface and expose AvatarHandle.
 */
const AvatarRenderer = forwardRef<AvatarHandle, AvatarComponentProps>(
  function AvatarRenderer(props, ref) {
    const provider = useMemo(() => getActiveProvider(), [])

    return (
      <Suspense fallback={<AvatarLoadingPlaceholder />}>
        {provider === 'talkinghead' && <TalkingHeadAvatar ref={ref} {...props} />}
        {provider === 'simli' && <SimliAvatar ref={ref} {...props} />}
        {provider === 'static' && <StaticAvatar ref={ref} {...props} />}
      </Suspense>
    )
  }
)

export default AvatarRenderer
