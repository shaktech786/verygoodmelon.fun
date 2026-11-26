import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { buttonClass } from './buttonClass'

/** The quietest action: words with a rind underline. */
export function QuietButton({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button type="button" {...rest} className={buttonClass('quiet', className)}>
      {children}
    </button>
  )
}
