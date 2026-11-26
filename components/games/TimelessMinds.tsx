'use client'

import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { pickRandomThinker } from '@/lib/games/timeless-minds/thinkers'
import type { Thinker } from '@/lib/games/timeless-minds/thinkers'
import { Loading } from '@/components/seedpress/Loading'
import { cn } from '@/lib/utils/cn'
import styles from './TimelessMinds.module.css'
import TimelessMindsChooser from './TimelessMindsChooser'
import { useCareMode } from './CareMode'

// The call (conversation, avatar, speech, directory, kept lines) is only needed once someone is chosen,
// so the first screen ships just the chooser and fetches the call while the visitor is deciding.
const loadSageCall = () => import('./SageCall')
const SageCall = lazy(loadSageCall)

// Someone still deciding after this long is idle; sooner, the fetch would compete with the page settling
const PREFETCH_AFTER_MS = 8000

export default function TimelessMinds() {
  const [firstThinker, setFirstThinker] = useState<Thinker | null>(null)
  const { care } = useCareMode()

  const prefetchCall = useCallback(() => {
    loadSageCall().catch(() => {})
  }, [])


  useEffect(() => {
    const timer = setTimeout(prefetchCall, PREFETCH_AFTER_MS)
    return () => clearTimeout(timer)
  }, [prefetchCall])

  if (!firstThinker) {
    return (
      <div className={cn(styles.call, 'max-w-2xl mx-auto p-2 sm:p-3')}>
        <div className={styles.choose}>
          <TimelessMindsChooser
            care={care}
            onChoose={setFirstThinker}
            onSurprise={() => setFirstThinker(pickRandomThinker({ care }))}
            onIntent={prefetchCall}
          />
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<Loading />}>
      <SageCall firstThinker={firstThinker} />
    </Suspense>
  )
}
