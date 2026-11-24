'use client'

import NextLink from 'next/link'
import { openAccessibilitySettings } from '@/components/accessibility/AccessibilityControls'
import { IconStamp } from './IconStamp'
import { Logo } from './Logo'
import { useSenseDial } from './SenseContext'

/**
 * The counter top: the same on every page, and it scrolls away with the page. Until Phase 2 it sits
 * inside the site's <main>, where a <header> is no landmark, so the banner role is set outright.
 */
export function Header({ home, current }: { home: string; current?: 'games' }) {
  const { sense } = useSenseDial()
  return (
    <header className="sp-header" role="banner">
      <div className="sp-shop sp-header__row">
        <NextLink href={home} className="sp-brand">
          <Logo />
          <span className="sp-wordmark">VeryGoodMelon.Fun</span>
        </NextLink>
        <nav aria-label="Main navigation" className="sp-header__nav">
          <NextLink href="/games" className="sp-nav-link" aria-current={current === 'games' ? 'page' : undefined}>
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
