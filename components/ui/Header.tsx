'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, Settings, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { openAccessibilitySettings } from '@/components/accessibility/AccessibilityControls'

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/games', label: 'Games' },
    { href: '/thoughts', label: 'Thoughts' },
    { href: '/about', label: 'About' }
  ]

  useEffect(() => {
    if (!mobileMenuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen])

  return (
    <header className="border-b border-card-border bg-background/80 backdrop-blur-sm sticky top-0 z-50" role="banner">
      <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4" role="navigation" aria-label="Main navigation">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Mobile: Logo on left, hamburger on right */}
          {/* Desktop: Spacer, centered logo, right nav */}

          {/* Left spacer for desktop balance (hidden on mobile) */}
          <div className="hidden lg:block w-[200px]" />

          {/* Logo and title - left aligned on mobile, centered on desktop */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 group"
            aria-label="VeryGoodMelon.Fun home"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Image
              src="/logo.png"
              alt=""
              width={51}
              height={32}
              className="pixelated transition-transform duration-200 group-hover:scale-110 w-10 h-6 sm:w-[51px] sm:h-8"
              priority
            />
            <span className="text-lg sm:text-2xl font-medium text-foreground">
              VeryGoodMelon.Fun
            </span>
          </Link>

          {/* Desktop nav links - hidden on mobile */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'font-medium transition-all text-sm pb-1 border-b-2',
                    isActive
                      ? 'text-foreground border-accent'
                      : 'text-primary-light hover:text-foreground border-transparent hover:border-accent/30'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              )
            })}
            <a
              href="https://github.com/shaktech786/verygoodmelon.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sm pb-1 border-b-2 border-transparent text-primary-light hover:text-foreground hover:border-accent/30 transition-all"
              aria-label="View source code on GitHub"
            >
              GitHub
            </a>

          </div>

          {/* Mobile hamburger menu button */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 text-foreground hover:bg-hover-bg rounded-lg transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="lg:hidden mt-4 pb-4 border-t border-card-border pt-4">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => {
                const isActive = pathname === link.href

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'font-medium transition-all text-base py-2 px-3 rounded-lg border-l-4',
                      isActive
                        ? 'text-foreground bg-card-bg border-accent'
                        : 'text-primary-light hover:text-foreground hover:bg-hover-bg border-transparent hover:border-accent/30'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <a
                href="https://github.com/shaktech786/verygoodmelon.fun"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="font-medium text-base text-primary-light hover:text-foreground transition-all py-2 px-3 rounded-lg border-l-4 border-transparent hover:bg-hover-bg hover:border-accent/30"
                aria-label="View source code on GitHub"
              >
                GitHub
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  // The panel hands focus back to whatever had it, and this button is about to disappear
                  menuButtonRef.current?.focus()
                  openAccessibilitySettings()
                }}
                className="sm:hidden flex items-center gap-2 font-medium text-base text-primary-light hover:text-foreground transition-all py-2 px-3 rounded-lg border-l-4 border-transparent hover:bg-hover-bg hover:border-accent/30 text-left"
              >
                <Settings size={18} aria-hidden="true" />
                Accessibility settings
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
