import type { Metadata } from 'next'
import { GentleInCare } from '@/components/seedpress/GentleInCare'
import { MoodStamps } from '@/components/seedpress/MoodStamps'
import { Rack } from '@/components/seedpress/Rack'
import { Stamp } from '@/components/seedpress/Stamp'
import { getMood, parseMood } from '@/lib/games/moods'

export const metadata: Metadata = {
  title: 'Games | VeryGoodMelon.Fun',
  description: 'Small, quiet games for a busy mind, to play at your own pace.',
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const mood = parseMood((await searchParams).mood)
  const chosen = mood ? getMood(mood) : undefined

  return (
    <div className="sp-shop sp-home">
      <div className="sp-games-head">
        <div className="sp-sign">
          <h1 className="sp-h1">Games</h1>
          <p className="sp-sign__motto">Think deeply, feel lighter.</p>
        </div>
        <MoodStamps current={mood} stay />
        {/* One status line for every view, so clearing the mood is announced as well as choosing one */}
        <div className={chosen ? 'sp-games-head__mood' : 'sp-games-head__all'}>
          <p role="status" className={chosen ? undefined : 'sr-only'}>
            {chosen ? (
              <>
                <strong>{chosen.heading}.</strong> <span className="sp-soft">{chosen.line}</span>
              </>
            ) : (
              'Every game'
            )}
          </p>
          {chosen && (
            <Stamp href="/games" scroll={false} icon="back">
              Show all games
            </Stamp>
          )}
        </div>
      </div>
      <GentleInCare />
      <Rack mood={mood} />
    </div>
  )
}
