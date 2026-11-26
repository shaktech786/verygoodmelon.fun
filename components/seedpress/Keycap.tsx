import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/** One key on the keyboard, printed as a small cap. */
export function Keycap({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn('sp-keycap', className)}>{children}</kbd>
}
