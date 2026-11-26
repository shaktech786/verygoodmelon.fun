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
        <MoodStamps current={mood} />
        {chosen && (
          <div className="sp-games-head__mood">
            <p role="status">
              <strong>{chosen.heading}.</strong> <span className="sp-soft">{chosen.line}</span>
            </p>
            <Stamp href="/games" icon="back">
              Show all games
            </Stamp>
          </div>
        )}
      </div>
      <GentleInCare />
      <Rack mood={mood} />
    </div>
  )
}
