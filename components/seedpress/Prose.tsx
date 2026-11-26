import type { ReactNode } from 'react'

interface ProseProps {
  title: string
  /** The page's opening line or two, a little larger than the body. */
  lead?: ReactNode
  /** Small print under the title, such as when a policy was last changed. */
  meta?: ReactNode
  children: ReactNode
}

/**
 * The content-page template (PLAN.md 8.3): a title, an optional lead, then reading text at the prose
 * measure, left-aligned, in sections that a hairline and 48 px keep apart. It never widens.
 */
export function Prose({ title, lead, meta, children }: ProseProps) {
  return (
    <div className="sp-shop">
      <article className="sp-prose">
        <header className="sp-prose__head">
          <h1 className="sp-h1">{title}</h1>
          {meta && <p className="sp-prose__meta">{meta}</p>}
          {lead && <div className="sp-prose__lead">{lead}</div>}
        </header>
        {children}
      </article>
    </div>
  )
}

interface ProseSectionProps {
  id: string
  title: string
  children: ReactNode
}

export function ProseSection({ id, title, children }: ProseSectionProps) {
  return (
    <section className="sp-prose__section" aria-labelledby={id}>
      <h2 id={id} className="sp-h2">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function ProseList({ children }: { children: ReactNode }) {
  return <ul className="sp-prose__list">{children}</ul>
}

/** A word or phrase that carries the meaning, in weight 700. */
export function Term({ children }: { children: ReactNode }) {
  return <strong>{children}</strong>
}

/** A closing line, set apart from the sections and quiet. */
export function ProseSign({ children }: { children: ReactNode }) {
  return <p className="sp-prose__sign">{children}</p>
}
