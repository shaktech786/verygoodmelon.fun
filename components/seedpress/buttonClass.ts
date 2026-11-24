import { cn } from '@/lib/utils/cn'

export type ButtonKind = 'go' | 'stamp' | 'quiet'

/** The look of a Seedpress button, for a link that navigates but should read as a button. */
export function buttonClass(kind: ButtonKind, className?: string): string {
  return cn(`sp-${kind}`, className)
}
