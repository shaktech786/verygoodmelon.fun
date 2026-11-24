import { cn } from '@/lib/utils/cn'

/** The slice stamp: melon flesh in one ink, its rind in another, printed a pixel out of register. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" width="36" height="24" className={cn('sp-logo', className)} aria-hidden="true" focusable="false">
      <g className="sp-logo__flesh">
        <path d="M3 3 L21 3 A9 9 0 0 1 3 3 Z" fill="currentColor" />
      </g>
      <g className="sp-logo__rind">
        <path d="M1.5 3 A10.5 10.5 0 0 0 22.5 3" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="8" y="6" width="1.5" height="2" fill="currentColor" />
        <rect x="11.25" y="8" width="1.5" height="2" fill="currentColor" />
        <rect x="14.5" y="6" width="1.5" height="2" fill="currentColor" />
      </g>
    </svg>
  )
}
