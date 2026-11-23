'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { openAccessibilitySettings } from '@/components/accessibility/AccessibilityControls'

export function Header() {
  const pathname = usePathname()
  const onGames = pathname === '/games'

  return (
    <header className="border-b border-card-border bg-background/80 backdrop-blur-sm sticky top-0 z-50" role="banner">
      <nav className="container mx-auto px-4 sm:px-6 py-2 sm:py-3" aria-label="Main navigation">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 group" aria-label="VeryGoodMelon.Fun home">
            <Image
              src="/logo.png"
              alt=""
              width={51}
              height={32}
              className="pixelated shrink-0 transition-transform duration-200 group-hover:scale-110 w-10 h-6 sm:w-[51px] sm:h-8"
              priority
            />
            <span className="text-lg sm:text-2xl font-medium text-foreground truncate">VeryGoodMelon.Fun</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Link
              href="/games"
              className={cn(
                'inline-flex items-center min-h-11 px-2 font-medium text-sm sm:text-base border-b-2 transition-colors',
                onGames
                  ? 'text-foreground border-melon-green'
                  : 'text-primary-light hover:text-foreground border-transparent'
              )}
              aria-current={onGames ? 'page' : undefined}
            >
              Games
            </Link>
            <button
              type="button"
              onClick={openAccessibilitySettings}
              className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-foreground hover:bg-hover-bg transition-colors"
              aria-label="Open accessibility settings"
              aria-haspopup="dialog"
            >
              <Settings size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
