import { InkLink } from '@/components/seedpress/Link'
import { createClient } from '@/lib/supabase/server'
import { ALL_GAMES } from '@/lib/games/config'

const USAGE_WINDOW_DAYS = 30

interface VisitTotals {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
}

const NO_VISITS: VisitTotals = { total: 0, today: 0, thisWeek: 0, thisMonth: 0 }

interface GameUsage {
  gameId: string
  title: string
  slug: string
  opens: number
  medianSeconds: number | null
}

const databaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function getVisitTotals(): Promise<VisitTotals> {
  if (!databaseConfigured()) return NO_VISITS

  try {
    const supabase = await createClient()

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const visitsSince = (since?: string) => {
      const query = supabase.from('site_visits').select('*', { count: 'exact', head: true })
      return since ? query.gte('visited_at', since) : query
    }

    const [total, today, thisWeek, thisMonth] = await Promise.all([
      visitsSince(),
      visitsSince(startOfToday),
      visitsSince(startOfWeek.toISOString()),
      visitsSince(startOfMonth),
    ])

    return {
      total: total.count ?? 0,
      today: today.count ?? 0,
      thisWeek: thisWeek.count ?? 0,
      thisMonth: thisMonth.count ?? 0,
    }
  } catch (error) {
    console.warn('Failed to fetch visit totals:', error)
    return NO_VISITS
  }
}

async function getGameUsage(): Promise<GameUsage[]> {
  if (!databaseConfigured()) return []

  try {
    const supabase = await createClient()
    const since = new Date(Date.now() - USAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase.rpc('game_usage_summary', { since })

    if (error) {
      console.warn('Failed to fetch game usage:', error)
      return []
    }

    return data.flatMap((row) => {
      const game = ALL_GAMES.find((g) => g.id === row.game_id)
      if (!game || row.opens === 0) return []
      return [{ gameId: game.id, title: game.title, slug: game.slug, opens: row.opens, medianSeconds: row.median_seconds }]
    })
  } catch (error) {
    console.warn('Failed to fetch game usage:', error)
    return []
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`
  return `${Math.round(seconds / 60)} min`
}

// Counts are a nicety, so an unreachable database is a warning and the section shows zeros
/** The same anonymous totals the site's makers see, read live from the database. */
export async function SiteNumbers() {
  const [visits, gameUsage] = await Promise.all([getVisitTotals(), getGameUsage()])

  const periods = [
    ['Total visits', visits.total],
    ['Today', visits.today],
    ['This week', visits.thisWeek],
    ['This month', visits.thisMonth],
  ] as const

  return (
    <>
      <div className="sp-table-wrap">
        <table className="sp-table">
          <caption>Visits to the site</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col" className="sp-table__num">
                Visits
              </th>
            </tr>
          </thead>
          <tbody>
            {periods.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td className="sp-table__num">{value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gameUsage.length > 0 && (
        <>
          <h3 id="game-usage-heading" className="sp-h3 sp-prose__subhead">
            What people explore
          </h3>
          <p>Last {USAGE_WINDOW_DAYS} days. Time spent is the typical (median) visit.</p>
          <div className="sp-table-wrap">
            <table className="sp-table" aria-labelledby="game-usage-heading">
              <thead>
                <tr>
                  <th scope="col">Game</th>
                  <th scope="col" className="sp-table__num">
                    Times opened
                  </th>
                  <th scope="col" className="sp-table__num">
                    Time spent
                  </th>
                </tr>
              </thead>
              <tbody>
                {gameUsage.map((game) => (
                  <tr key={game.gameId}>
                    <th scope="row">
                      <InkLink href={`/games/${game.slug}`}>{game.title}</InkLink>
                    </th>
                    <td className="sp-table__num">{game.opens.toLocaleString()}</td>
                    <td className="sp-table__num">
                      {game.medianSeconds === null ? '\u2014' : formatDuration(game.medianSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
