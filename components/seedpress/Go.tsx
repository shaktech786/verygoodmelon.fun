import NextLink from 'next/link'
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { buttonClass } from './buttonClass'
import { Icon } from './icons/Icon'

interface GoBase {
  children: ReactNode
  /** Shows the trailing `next` stamp. */
  onward?: boolean
  className?: string
}

type GoProps =
  | (GoBase & { href: string })
  | (GoBase &
      Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'disabled'> & {
        href?: undefined
        /** Why it can't be pressed yet; shown beside it. The button stays focusable. */
        unavailable?: string
        loading?: boolean
        ref?: Ref<HTMLButtonElement>
      })

/**
 * The one go-action of a view: a melon-flesh slice with a rind edge. Never more than one per
 * screen, never a state (checked, chosen, pressed), never an error.
 */
export function Go(props: GoProps) {
  const { children, onward, className } = props
  const trailing = props.href === undefined && props.loading ? 'loading' : onward ? 'next' : null
  const content = (
    <>
      <span>{children}</span>
      {trailing === 'next' && <Icon name="next" />}
      {trailing === 'loading' && <span className="sp-seeds" aria-hidden="true"><i /><i /><i /></span>}
    </>
  )

  if (props.href !== undefined) {
    return (
      <NextLink href={props.href} data-go="" className={buttonClass('go', className)}>
        {content}
      </NextLink>
    )
  }

  const { unavailable, loading, onClick, href: _href, onward: _onward, ...rest } = props
  const reasonId = unavailable ? `${rest.id ?? 'go'}-why` : undefined
  const button = (
    <button
      type="button"
      {...rest}
      data-go=""
      className={buttonClass('go', className)}
      aria-disabled={unavailable || loading ? true : undefined}
      aria-describedby={reasonId ?? rest['aria-describedby']}
      aria-busy={loading || undefined}
      onClick={(event) => {
        // Still focusable, but pressing it does nothing, including submitting a form it sits in
        if (unavailable || loading) event.preventDefault()
        else onClick?.(event)
      }}
    >
      {content}
    </button>
  )
  if (!unavailable) return button
  return (
    <span className="sp-with-reason">
      {button}
      <span id={reasonId} className="sp-reason">
        {unavailable}
      </span>
    </span>
  )
}
