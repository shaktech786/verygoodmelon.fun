'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface CarryScreenProps {
  line: string
  begin: string | null
  onClose: () => void
}

/** The line alone, large and still, to glance at on a phone held low on the way in. */
export function CarryScreen({ line, begin, onClose }: CarryScreenProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
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
    // Closing here would fire onClose; unmounting removes the dialog from the top layer anyway.
    return () => {
      closed = true
      void lock?.release()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label="Your line to carry in"
      onClose={onClose}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-background p-0 text-foreground backdrop:bg-background"
    >
      <div className="flex min-h-full flex-col px-6 pb-8 pt-10 sm:px-12">
        <div aria-hidden="true" className="mx-auto flex w-24 flex-col gap-1">
          <span className="h-1.5 rounded-full bg-melon-green" />
          <span className="h-1 rounded-full bg-success" />
        </div>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 py-10">
          {begin && (
            <p className="text-xl sm:text-2xl leading-snug text-foreground/80 [overflow-wrap:anywhere]">
              <span className="block text-base font-medium text-foreground/75">Begin with</span>
              {begin}
            </p>
          )}
          <p className="text-[clamp(2rem,9vw,4rem)] font-semibold leading-tight text-foreground [overflow-wrap:anywhere] [text-wrap:balance]">
            {line}
          </p>
        </div>
        <Button size="lg" variant="secondary" onClick={() => ref.current?.close()} className="mx-auto w-full max-w-xs">
          Done
        </Button>
      </div>
    </dialog>
  )
}
