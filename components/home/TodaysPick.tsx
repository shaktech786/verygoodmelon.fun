import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { DailyPick } from '@/lib/games/daily-pick'

/** The one game the homepage offers today, with the reason it is worth today. */
export function TodaysPick({ pick }: { pick: DailyPick }) {
  const { game, reason } = pick
  return (
    <Link
      href={`/games/${game.slug}`}
      aria-label={`Today's pick: ${game.title}. ${reason}`}
      className="
        group relative block rounded-3xl bg-card-bg border border-card-border
        px-5 py-6 sm:px-8 sm:py-8
        soft-shadow hover:soft-shadow-md transition-[box-shadow,border-color] duration-200
        hover:border-melon-green/40
        focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background
      "
    >
      <div className="flex items-center gap-5 sm:gap-8">
        <div className="relative shrink-0 w-[76px] h-[114px] sm:w-[104px] sm:h-[156px]">
          {/* A second card behind, like the next one in a deck: today's is the one on top */}
          <span
            className="absolute inset-0 rounded-xl bg-success/30 rotate-6 translate-x-1.5"
            aria-hidden="true"
          />
          <Image
            src={game.cardImage}
            alt=""
            width={104}
            height={156}
            priority
            aria-hidden="true"
            className="relative w-full h-full rounded-xl object-cover shadow-md -rotate-2 motion-safe:group-hover:rotate-0 transition-transform duration-300 ease-out"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-widest text-melon-green">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-melon-green" aria-hidden="true" />
            Today&rsquo;s pick
          </p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
            {game.title}
          </h2>
          <p className="mt-2 text-base sm:text-lg text-foreground/85 leading-snug">{reason}</p>
          <span
            className="mt-4 inline-flex items-center gap-2 min-h-11 px-5 rounded-full bg-accent text-white font-medium text-base group-hover:bg-accent-hover transition-colors"
            aria-hidden="true"
          >
            Play
            <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  )
}
