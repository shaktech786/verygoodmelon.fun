import type { ReactNode } from 'react'

interface LegalPageProps {
  title: string
  lastUpdated: string
  children: ReactNode
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="container mx-auto px-6 py-12 max-w-3xl">
      <div className="animate-fade">
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-6">{title}</h1>
        <p className="text-primary-light mb-2 text-sm">Last updated: {lastUpdated}</p>
        <div className="space-y-8 text-primary-light leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

interface LegalSectionProps {
  id: string
  title: string
  children: ReactNode
}

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section className="pt-6 border-t border-card-border space-y-3" aria-labelledby={id}>
      <h2 id={id} className="text-xl font-semibold text-foreground mb-4">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="space-y-2 list-disc pl-5">{children}</ul>
}

export function Term({ children }: { children: ReactNode }) {
  return <strong className="text-foreground">{children}</strong>
}

interface LegalLinkProps {
  href: string
  children: ReactNode
}

export function LegalLink({ href, children }: LegalLinkProps) {
  const isExternal = href.startsWith('http')
  return (
    <a
      href={href}
      {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
      className="text-accent underline underline-offset-2 hover:no-underline transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded"
    >
      {children}
      {isExternal && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  )
}
