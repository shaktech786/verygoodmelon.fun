import type { ReactNode } from 'react'
import { Note } from './Note'

interface ErrorNoteProps {
  title: string
  /** What happened and the one thing to do, in plain words. */
  children: ReactNode
  /** The actions row: the Go first, stamps after. */
  actions: ReactNode
  /** Shown beneath, folded away. */
  details?: ReactNode
  help?: string
}

/** The gentle error as a whole page (PLAN.md 7.17): seed ink, a glyph and words, never red. */
export function ErrorNote({ title, children, actions, details, help }: ErrorNoteProps) {
  return (
    <div className="sp-error">
      <Note tone="look">
        <h1 className="sp-h3 sp-error__title">{title}</h1>
        <p className="sp-error__words">{children}</p>
      </Note>
      <div className="sp-error__actions">{actions}</div>
      {details}
      {help && <p className="sp-error__help">{help}</p>}
    </div>
  )
}
