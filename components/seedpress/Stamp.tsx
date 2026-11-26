import NextLink from 'next/link'
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { buttonClass } from './buttonClass'
import { Icon } from './icons/Icon'
import type { IconName } from './icons/glyphs'

type StampProps = { children: ReactNode; icon?: IconName; className?: string } & (
  | { href: string; scroll?: boolean }
  | (Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { href?: undefined; ref?: Ref<HTMLButtonElement> })
)

/** A secondary action: a rubber stamp with a printed edge that presses down. */
export function Stamp(props: StampProps) {
  const content = (
    <>
      {props.icon && <Icon name={props.icon} />}
      <span>{props.children}</span>
    </>
  )
  if (props.href !== undefined) {
    return (
      <NextLink href={props.href} scroll={props.scroll} className={buttonClass('stamp', props.className)}>
        {content}
      </NextLink>
    )
  }
  const { icon: _icon, children: _children, className, href: _href, ...rest } = props as Extract<StampProps, { href?: undefined }>
  return (
    <button type="button" {...rest} className={buttonClass('stamp', className)}>
      {content}
    </button>
  )
}
