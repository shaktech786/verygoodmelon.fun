'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface LoadingProps {
  /** What the wait is for, in place of the default words. */
  children?: string
  className?: string
}

/** Three seeds settling while something gets ready. Quiet and reduced motion hold them still. */
export function Loading({ children = 'Getting it ready…', className }: LoadingProps) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const later = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(later)
  }, [])
  return (
    <div role="status" className={cn('sp-loading', className)}>
      <span className="sp-loading__seeds" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <p>{children}</p>
      {slow && <p className="sp-soft">Still working on it. Nothing is lost.</p>}
    </div>
  )
}
