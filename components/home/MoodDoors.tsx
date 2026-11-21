import Link from 'next/link'
import { MOODS, moodHref, type MoodId } from '@/lib/games/moods'

const GLYPHS: Record<MoodId, readonly string[]> = {
  restless: [
    '...........',
    '......XXX..',
    '.....X...X.',
    '.........X.',
    'XXXXXXXXX..',
    '...........',
    'XXXXXXXXXX.',
    '..........X',
    '......X...X',
    '.......XXX.',
    '...........',
  ],
  heavy: [
    '...........',
    '....XXX....',
    '..XX...X...',
    '.X......XX.',
    '.X........X',
    'X.........X',
    '.XXXXXXXXX.',
    '...........',
    '..X...X....',
    '.X...X...X.',
    '.........X.',
  ],
  play: [
    '.....X.....',
    '....X.X....',
    '....X.X....',
    'XXXX...XXXX',
    'X.........X',
    '.X.......X.',
    '..X.....X..',
    '.X...X...X.',
    '.X..X.X..X.',
    'X..X...X..X',
    'XXX.....XXX',
  ],
}

function pixels(rows: readonly string[]): string {
  return rows
    .flatMap((row, y) => Array.from(row, (cell, x) => (cell === 'X' ? `M${x} ${y}h1v1h-1z` : '')))
    .join('')
}

export function MoodGlyph({ mood, className }: { mood: MoodId; className?: string }) {
  return (
    <svg viewBox="0 0 11 11" shapeRendering="crispEdges" className={className} aria-hidden="true">
      <path d={pixels(GLYPHS[mood])} fill="currentColor" />
    </svg>
  )
}

/** Three ways in, each opening the games page filtered to that mood. */
export function MoodDoors() {
  return (
    <section aria-labelledby="moods-heading" className="w-full">
      <h2 id="moods-heading" className="text-center text-sm sm:text-base text-primary-light mb-3 sm:mb-4">
        Or start from how you feel
      </h2>
      <ul className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {MOODS.map((mood) => (
          <li key={mood.id}>
            <Link
              href={moodHref(mood.id)}
              className="
                group flex h-full min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl
                bg-card-bg border border-card-border px-2 py-3 text-center
                hover:border-melon-green/50 hover:bg-hover-bg transition-colors duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
              "
            >
              <MoodGlyph
                mood={mood.id}
                className="w-7 h-7 sm:w-8 sm:h-8 text-melon-green motion-safe:group-hover:-translate-y-0.5 transition-transform duration-200"
              />
              <span className="text-[15px] sm:text-base font-medium text-foreground leading-tight">{mood.label}</span>
              <span className="sr-only">: {mood.heading.toLowerCase()}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
