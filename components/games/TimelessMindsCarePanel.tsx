const link = 'font-semibold text-foreground underline underline-offset-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'

/** Stays in view for the rest of the visit once a visitor's words suggest they may be in danger. */
export default function TimelessMindsCarePanel({ className = '' }: { className?: string }) {
  return (
    <aside
      aria-label="Support"
      className={`border border-card-border border-l-4 border-l-[var(--melon-green)] bg-card-bg text-foreground text-sm leading-relaxed ${className}`}
    >
      <p>
        You don&apos;t have to hold this alone. Free support, any hour: call or text{' '}
        <a href="tel:988" className={link}>988</a> (US), call <a href="tel:116123" className={link}>116 123</a> (UK
        and Ireland), or{' '}
        <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className={link}>
          findahelpline.com
        </a>
        .
      </p>
    </aside>
  )
}
