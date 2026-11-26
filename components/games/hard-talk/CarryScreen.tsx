'use client'

import { useEffect, useRef } from 'react'
import { NoteDialog } from '@/components/seedpress/NoteDialog'
import { Stamp } from '@/components/seedpress/Stamp'
import styles from './HardTalk.module.css'

interface CarryScreenProps {
  line: string
  begin: string | null
  onClose: () => void
}

/** The line alone, large and still on a small card, to glance at on a phone held low on the way in. */
export function CarryScreen({ line, begin, onClose }: CarryScreenProps) {
  const doneRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let closed = false
    if ('wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (closed) void sentinel.release()
          else lock = sentinel
        })
        .catch(() => {
          // Without the lock the screen may dim as usual; the line is still there.
        })
    }
    return () => {
      closed = true
      void lock?.release()
    }
  }, [])

  return (
    <NoteDialog
      title="Your line to carry in"
      size="wide"
      onClose={onClose}
      initialFocusRef={doneRef}
      actions={
        <Stamp ref={doneRef} onClick={onClose}>
          Done
        </Stamp>
      }
    >
      <figure className={styles.printCard}>
        {begin && (
          <p className={styles.printBegin}>
            <span className={styles.printBeginLabel}>Begin with</span>
            {begin}
          </p>
        )}
        <p className={styles.printLine}>{line}</p>
      </figure>
    </NoteDialog>
  )
}
