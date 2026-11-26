import { CounterOrCare } from '@/components/seedpress/CounterOrCare'
import { MoodStamps } from '@/components/seedpress/MoodStamps'
import { Rack } from '@/components/seedpress/Rack'
import { dailyPick } from '@/lib/games/daily-pick'

// Today's packet is printed on the server for the server's day, so the page is reprinted hourly
export const revalidate = 3600

/** The homepage (docs/design-system/PLAN.md section 8.1): the sign, today's packet, the moods, then the rack. */
export default function Home() {
  return (
    <div className="sp-shop sp-home">
      <div className="sp-band">
        <div className="sp-sign">
          <h1 className="sp-sign__title">Small, quiet games for a busy mind</h1>
          <p className="sp-sign__motto">Think deeply, feel lighter.</p>
        </div>
        <CounterOrCare serverGameId={dailyPick(new Date())?.game.id ?? ''} />
        <MoodStamps />
      </div>
      <Rack />
    </div>
  )
}
