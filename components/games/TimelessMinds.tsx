'use client'

import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { pickRandomThinker } from '@/lib/games/timeless-minds/thinkers'
import type { Thinker } from '@/lib/games/timeless-minds/thinkers'
import { getActiveProvider } from '@/lib/games/timeless-minds/avatar-providers/registry'
import { loadCustomFaceIds } from '@/lib/games/timeless-minds/simli-faces'
import { Loading } from '@/components/seedpress/Loading'
import { Note } from '@/components/seedpress/Note'
import { Stamp } from '@/components/seedpress/Stamp'
import { cn } from '@/lib/utils/cn'
import styles from './TimelessMinds.module.css'
import TimelessMindsChooser from './TimelessMindsChooser'
import { useCareMode } from './CareMode'

type SageCallComponent = ComponentType<{ firstThinker: Thinker }>

// The call (conversation, avatar, speech, directory, kept lines) is only needed once someone is chosen,
// so the first screen ships just the chooser and fetches the call while the visitor is deciding.
const loadSageCall = () => import('./SageCall').then((module) => module.default as SageCallComponent)

// Someone still deciding after this long is idle; sooner, the fetch would compete with the page settling
const PREFETCH_AFTER_MS = 8000

export default function TimelessMinds() {
  const [call, setCall] = useState<{ Call: SageCallComponent; thinker: Thinker } | null>(null)
  const [calling, setCalling] = useState<Thinker | null>(null)
  const [failed, setFailed] = useState<Thinker | null>(null)
  const { care } = useCareMode()

  const prefetchCall = useCallback(() => {
    loadSageCall().catch(() => {})
    if (getActiveProvider() === 'simli') loadCustomFaceIds()
  }, [])

  useEffect(() => {
    const timer = setTimeout(prefetchCall, PREFETCH_AFTER_MS)
    return () => clearTimeout(timer)
  }, [prefetchCall])

  // The chooser stays on screen until the call has arrived, so there is no flash of a loading state between them,
  // and a call that cannot load leaves the visitor where they were with a way to try again
  const choose = (thinker: Thinker) => {
    setFailed(null)
    setCalling(thinker)
    loadSageCall()
      .then((Call) => setCall({ Call, thinker }))
      .catch(() => setFailed(thinker))
      .finally(() => setCalling(null))
  }

  if (call) return <call.Call firstThinker={call.thinker} />

  return (
    <div className={cn(styles.call, 'max-w-2xl mx-auto p-2 sm:p-3')}>
      <div className={styles.choose}>
        <TimelessMindsChooser
          care={care}
          onChoose={choose}
          onSurprise={() => choose(pickRandomThinker({ care }))}
          onIntent={prefetchCall}
        />
        {calling && <Loading>{`Calling ${calling.name}…`}</Loading>}
        {failed && (
          <Note tone="look" role="alert" className="m-4">
            The call to {failed.name} could not connect.{' '}
            <Stamp onClick={() => choose(failed)}>Try again</Stamp>
          </Note>
        )}
      </div>
    </div>
  )
}
