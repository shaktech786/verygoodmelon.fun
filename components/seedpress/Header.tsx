'use client'

import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { openAccessibilitySettings } from '@/components/accessibility/AccessibilityControls'
import { IconStamp } from './IconStamp'
import { Logo } from './Logo'
import { useSenseDial } from './useSenseDial'

/** The counter top: the same on every page, and it scrolls away with the page. */
export function Header() {
  const { sense } = useSenseDial()
  const onGames = usePathname() === '/games'
  return (
    <header className="sp-header">
      <div className="sp-shop sp-header__row">
        <NextLink href="/" className="sp-brand" aria-label="VeryGoodMelon.Fun home">
          <Logo />
          <span className="sp-wordmark">VeryGoodMelon.Fun</span>
        </NextLink>
        <nav aria-label="Main navigation" className="sp-header__nav">
          <NextLink href="/games" className="sp-nav-link" aria-current={onGames ? 'page' : undefined}>
            Games
          </NextLink>
          <IconStamp icon="settings" label="Open accessibility settings" aria-haspopup="dialog" onClick={openAccessibilitySettings}>
            <span className="sp-sense-pip" data-at={sense} aria-hidden="true" />
          </IconStamp>
        </nav>
      </div>
    </header>
  )
}
