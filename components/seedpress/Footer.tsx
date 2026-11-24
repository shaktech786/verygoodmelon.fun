'use client'

import { openFeedback } from '@/components/FeedbackDialog'
import { InkLink } from './Link'
import { QuietButton } from './QuietButton'

const SHOP_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/thoughts', label: 'Thoughts' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const

/** The back of the packet: someone to talk to first, then the shop. The give column stays hidden until it has content. */
export function Footer() {
  return (
    <footer className="sp-footer">
      <div className="sp-shop sp-footer__cols">
        <section aria-labelledby="footer-talk" className="sp-footer__col">
          <h2 id="footer-talk" className="sp-footer__head">
            Talk to someone
          </h2>
          <InkLink href="/support" className="sp-footer__talk">
            Need to talk?
          </InkLink>
        </section>
        <section aria-labelledby="footer-shop" className="sp-footer__col">
          <h2 id="footer-shop" className="sp-footer__head">
            The shop
          </h2>
          <ul className="sp-footer__links">
            {SHOP_LINKS.map((link) => (
              <li key={link.href}>
                <InkLink href={link.href}>{link.label}</InkLink>
              </li>
            ))}
            <li>
              <QuietButton onClick={openFeedback} aria-haspopup="dialog">
                Feedback
              </QuietButton>
            </li>
            <li>
              <InkLink href="https://github.com/shaktech786/verygoodmelon.fun">GitHub</InkLink>
            </li>
          </ul>
        </section>
      </div>
      <p className="sp-shop sp-footer__printer">
        Printed by ShakTech Labs · © <span suppressHydrationWarning>{new Date().getFullYear()}</span>
      </p>
    </footer>
  )
}
