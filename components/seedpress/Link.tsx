import NextLink from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Icon } from './icons/Icon'

interface InkLinkProps {
  href: string
  children: ReactNode
  className?: string
}

/** A link in prose: ink words over a rind underline. Never flesh. */
export function InkLink({ href, children, className }: InkLinkProps) {
  const external = /^https?:/.test(href)
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cn('sp-link', className)}>
        {children}
        <Icon name="external" className="sp-link__out" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    )
  }
  return (
    <NextLink href={href} className={cn('sp-link', className)}>
      {children}
    </NextLink>
  )
}
