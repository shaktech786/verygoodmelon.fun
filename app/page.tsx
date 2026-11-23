'use client'

import { useEffect, useState } from 'react'
import { useCareMode } from '@/components/games/CareMode'
import { GentleGames } from '@/components/games/CrossGameSuggestions'
import { AllGames } from '@/components/games/GameDirectory'
import { MoodDoors } from '@/components/home/MoodDoors'
import { PersonalizedSuggestions } from '@/components/home/PersonalizedSuggestions'
import { TodaysPick } from '@/components/home/TodaysPick'
import { dailyPick } from '@/lib/games/daily-pick'
import { usePresence } from '@/lib/hooks/usePresence'

const fadeIn = (mounted: boolean, delayMs: number) => ({
  className: `transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`,
  style: { transitionDelay: mounted ? `${delayMs}ms` : '0ms' },
})

/**
 * Homepage: one game for today, three ways in by mood, then every game.
 */
export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { count: presenceCount, isLoaded: presenceLoaded } = usePresence()
  const { care } = useCareMode()
  // Picked after mount so the server's date can never disagree with the visitor's
  const pick = mounted ? dailyPick(new Date()) : undefined

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  const intro = fadeIn(mounted, 0)
  const hero = fadeIn(mounted, 150)
  const moods = fadeIn(mounted, 300)
  const games = fadeIn(mounted, 450)

  return (
    <div className="min-h-[80vh] flex flex-col items-center px-4 sm:px-6 py-10 sm:py-14">
      <div className={`text-center mb-8 sm:mb-10 ${intro.className}`} style={intro.style}>
        <h1 className="max-w-xl mx-auto text-2xl sm:text-3xl font-light text-foreground leading-snug">
          Small, quiet games for a busy mind, to leave you a little <span className="text-melon-green font-medium">lighter</span>
        </h1>
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
        </div>

        <div className={games.className} style={games.style}>
          <AllGames />
        </div>
      </div>

      {presenceLoaded && presenceCount > 0 && (
        <p className="mt-8 text-primary-light text-xs sm:text-sm flex items-center justify-center gap-2" aria-live="polite">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse-slow" aria-hidden="true" />
          {presenceCount === 1 ? 'Someone else is here too' : `${presenceCount} others exploring right now`}
        </p>
      )}

      <PersonalizedSuggestions />
    </div>
  )
}
