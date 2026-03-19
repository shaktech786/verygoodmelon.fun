'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthContext } from '@/components/auth/AuthProvider'

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isAuthenticated, isLoading, openAuthModal, signOut } = useAuthContext()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  const userInitial = user?.email?.[0]?.toUpperCase() ?? '?'
  const userDisplayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/thoughts', label: 'Thoughts' },
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
              className="text-sm text-primary-light hover:text-foreground transition-colors"
              aria-label="View source code on GitHub"
            >
              GitHub
            </a>

            {/* Auth: Sign in / User menu */}
            {!isLoading && (
              isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 text-sm text-primary-light hover:text-foreground transition-colors"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                    aria-label={`Account menu for ${userDisplayName}`}
                  >
                    {user?.user_metadata?.avatar_url ? (
                      <Image
                        src={user.user_metadata.avatar_url}
                        alt=""
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold">
                        {userInitial}
                      </span>
                    )}
                  </button>
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-48 bg-card-bg border border-card-border rounded-lg shadow-lg py-1 z-50 animate-fade"
                      role="menu"
                    >
                      <div className="px-3 py-2 border-b border-card-border">
                        <p className="text-xs text-primary-light truncate">{user?.email}</p>
                      </div>
                      <button
                        onClick={async () => {
                          setUserMenuOpen(false)
                          await signOut()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-light hover:text-foreground hover:bg-hover-bg transition-colors"
                        role="menuitem"
                      >
                        <LogOut size={14} aria-hidden="true" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="text-sm text-primary-light hover:text-foreground transition-colors"
                >
                  Sign in
                </button>
              )
            )}
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
                className="text-base text-primary-light hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-hover-bg"
                aria-label="View source code on GitHub"
              >
                GitHub
              </a>

              {/* Mobile auth */}
              {!isLoading && (
                isAuthenticated ? (
                  <div className="border-t border-card-border pt-3 mt-1">
                    <div className="flex items-center gap-2 px-3 py-1 mb-1">
                      {user?.user_metadata?.avatar_url ? (
                        <Image
                          src={user.user_metadata.avatar_url}
                          alt=""
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-semibold">
                          {userInitial}
                        </span>
                      )}
                      <span className="text-xs text-primary-light truncate">{user?.email}</span>
                    </div>
                    <button
                      onClick={async () => {
                        setMobileMenuOpen(false)
                        await signOut()
                      }}
                      className="flex items-center gap-2 text-base text-primary-light hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-hover-bg w-full"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      openAuthModal()
                    }}
                    className="flex items-center gap-2 text-base text-primary-light hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-hover-bg border-t border-card-border pt-3 mt-1 w-full"
                  >
                    <User size={16} aria-hidden="true" />
                    Sign in
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
