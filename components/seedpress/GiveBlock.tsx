'use client'

import { useCareMode } from '@/components/games/CareMode'
import { GIVE, type GiveConfig } from '@/lib/give/config'
import { buttonClass } from './buttonClass'
import { Icon } from './icons/Icon'

interface GiveBlockProps {
  /** Where it sits: the footer's middle column, or a section at the end of a page. */
  placement: 'footer' | 'page'
  config?: GiveConfig
}

/**
 * One quiet place to give (PLAN.md 7.22): a heading, a sentence or two, and a stamp link per organisation.
 * It is never the go-action, never shown while care mode lasts, and has no totals, goals or urgency.
 */
export function GiveBlock({ placement, config = GIVE }: GiveBlockProps) {
  const { care } = useCareMode()
  if (!config.enabled || config.organisations.length === 0 || care) return null

  const footer = placement === 'footer'
  const headingId = footer ? 'footer-give' : 'give-heading'
  return (
    <section
      aria-labelledby={headingId}
      className={footer ? 'sp-footer__col sp-footer__give' : 'sp-prose__section'}
    >
      <h2 id={headingId} className={footer ? 'sp-footer__head' : 'sp-h2'}>
        Give, if you can
      </h2>
      <div className="sp-give">
        {config.message && <p>{config.message}</p>}
        <ul className="sp-give__orgs">
          {config.organisations.map((org) => (
            <li key={org.href}>
              <a href={org.href} target="_blank" rel="noopener noreferrer" className={buttonClass('stamp')}>
                <Icon name="external" />
                <span>{org.name}</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
