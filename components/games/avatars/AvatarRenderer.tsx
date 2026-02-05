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
    <div className="w-full h-full flex items-center justify-center bg-black/20">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-white/50 text-xs">Loading avatar...</p>
      </div>
    </div>
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
