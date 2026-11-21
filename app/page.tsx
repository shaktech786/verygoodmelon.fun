'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useCareMode } from '@/components/games/CareMode'
import { GentleGames } from '@/components/games/CrossGameSuggestions'
import { MoodDoors } from '@/components/home/MoodDoors'
import { PersonalizedSuggestions } from '@/components/home/PersonalizedSuggestions'
import { TodaysPick } from '@/components/home/TodaysPick'
import { dailyPick } from '@/lib/games/daily-pick'
import { usePresence } from '@/lib/hooks/usePresence'
import { useDailyWisdom } from '@/lib/hooks/useDailyWisdom'
import { lineForCare } from '@/lib/care/gentle-line'

const fadeIn = (mounted: boolean, delayMs: number) => ({
  className: `transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`,
  style: { transitionDelay: mounted ? `${delayMs}ms` : '0ms' },
})

/**
 * Homepage: one game for today and three ways in by mood. The full list lives on /games,
 * so a busy mind meets one invitation here instead of fifteen.
 */
export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { count: presenceCount, isLoaded: presenceLoaded } = usePresence()
  const { wisdom, isLoaded: wisdomLoaded } = useDailyWisdom()
  const { care } = useCareMode()
  // Picked after mount so the server's date can never disagree with the visitor's
  const pick = mounted ? dailyPick(new Date()) : undefined

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  const intro = fadeIn(mounted, 0)
  const hero = fadeIn(mounted, 150)
  const moods = fadeIn(mounted, 300)

  return (
    <div className="min-h-[80vh] flex flex-col items-center px-4 sm:px-6 py-10 sm:py-14">
      <div className={`text-center mb-8 sm:mb-10 ${intro.className}`} style={intro.style}>
        <p className="text-primary-light text-sm sm:text-base tracking-widest uppercase mb-2">
          Think deeply
        </p>
        <h1 className="text-3xl sm:text-4xl font-light text-foreground">
          Feel <span className="text-melon-green font-medium">lighter</span>
        </h1>
        <p className="mt-4 max-w-md mx-auto text-base sm:text-lg text-primary-light leading-relaxed">
          Small, quiet games for a busy mind. Play one for a few minutes and leave a little lighter than you came.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-10 sm:space-y-12">
        {/* After words of danger the gentle games and the helplines take the pick's place */}
        <div className={hero.className} style={hero.style}>
          {care ? (
            <GentleGames />
          ) : (
            <section aria-label="Today's pick" className="min-h-[166px] sm:min-h-[222px]">
              {pick && <TodaysPick pick={pick} />}
            </section>
          )}
        </div>

        <div className={moods.className} style={moods.style}>
          <MoodDoors />
          <p className="mt-6 text-center">
            <Link
              href="/games"
              className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm sm:text-base text-primary-light hover:text-foreground underline-offset-4 hover:underline rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              See every game
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </p>
        </div>
      </div>

      {presenceLoaded && presenceCount > 0 && (
        <p className="mt-8 text-primary-light text-xs sm:text-sm flex items-center justify-center gap-2" aria-live="polite">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse-slow" aria-hidden="true" />
          {presenceCount === 1 ? 'Someone else is here too' : `${presenceCount} others exploring right now`}
        </p>
      )}

      <PersonalizedSuggestions />

      {/* Daily wisdom - ambient, quiet, appears last */}
      {wisdomLoaded && wisdom && (
        <div className="mt-10 sm:mt-14 max-w-lg text-center px-6 animate-fade">
          <div className="border-t border-card-border pt-6">
            <p className="text-primary-light text-sm italic leading-relaxed">{care ? lineForCare(wisdom) : wisdom}</p>
          </div>
        </div>
      )}
    </div>
  )
}
