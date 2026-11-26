import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Icon } from './icons/Icon'

interface NoteProps {
  /** `look` is a gentle problem, in seed ink; `info` is a plain heads-up, in rind. Never red. */
  tone?: 'look' | 'info'
  children: ReactNode
  /** Only for a failed send that loses work. Everything else is read in its place. */
  role?: 'alert'
  className?: string
}

/** What happened, then the one thing to do, in plain words. */
export function Note({ tone = 'info', children, role, className }: NoteProps) {
  return (
    <div role={role} className={cn('sp-note', `sp-note--${tone}`, className)}>
      <Icon name="note" className="sp-note__mark" />
      <div className="sp-note__words">{children}</div>
    </div>
  )
}
