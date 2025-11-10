'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' }
  ]

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
                    'font-medium transition-colors text-sm',
                    isActive
                      ? 'text-foreground'
                      : 'text-primary-light hover:text-foreground'
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
              className="text-sm text-primary-light hover:text-foreground transition-colors"
              aria-label="View source code on GitHub"
            >
              GitHub
            </a>
          </div>

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-foreground hover:bg-hover-bg rounded-lg transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-card-border pt-4">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => {
                const isActive = pathname === link.href

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'font-medium transition-colors text-base py-2 px-3 rounded-lg',
                      isActive
                        ? 'text-foreground bg-card-bg'
                        : 'text-primary-light hover:text-foreground hover:bg-hover-bg'
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
                className="text-base text-primary-light hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-hover-bg"
                aria-label="View source code on GitHub"
              >
                GitHub
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
