import { Metadata } from 'next'
import { Eye, Calendar, CalendarDays, CalendarRange } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ALL_GAMES } from '@/lib/games/config'

// Live counts: render per request instead of freezing numbers at build time
export const dynamic = 'force-dynamic'

const USAGE_WINDOW_DAYS = 30

export const metadata: Metadata = {
  title: 'Analytics - VeryGoodMelon.Fun',
  description: 'A transparent look at who visits and what they explore.',
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div
      className="bg-card-bg border border-card-border rounded-xl p-6 flex flex-col gap-2"
      aria-label={`${value.toLocaleString()} ${label.toLowerCase()}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-primary-light">{label}</span>
        <span className="text-primary-light/50" aria-hidden="true">
          {icon}
        </span>
      </div>
      <span className="text-4xl font-bold text-foreground">
        {value.toLocaleString()}
      </span>
    </div>
  )
}

async function getAnalytics() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { total: 0, today: 0, thisWeek: 0, thisMonth: 0 }
  }

  try {
    const supabase = await createClient()

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfWeekISO = startOfWeek.toISOString()

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [totalResult, todayResult, weekResult, monthResult] = await Promise.all([
      supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visited_at', startOfToday),
      supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visited_at', startOfWeekISO),
      supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visited_at', startOfMonth),
    ])

    return {
      total: totalResult.count ?? 0,
      today: todayResult.count ?? 0,
      thisWeek: weekResult.count ?? 0,
      thisMonth: monthResult.count ?? 0,
    }
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return { total: 0, today: 0, thisWeek: 0, thisMonth: 0 }
  }
}

interface GameUsage {
  gameId: string
  title: string
  slug: string
  opens: number
  medianSeconds: number | null
}

async function getGameUsage(): Promise<GameUsage[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return []
  }

  try {
    const supabase = await createClient()
    const since = new Date(Date.now() - USAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase.rpc('game_usage_summary', { since })

    if (error) {
      console.error('Failed to fetch game usage:', error)
      return []
    }

    return data.flatMap((row) => {
      const game = ALL_GAMES.find((g) => g.id === row.game_id)
      if (!game || row.opens === 0) return []
      return [{
        gameId: game.id,
        title: game.title,
        slug: game.slug,
        opens: row.opens,
        medianSeconds: row.median_seconds,
      }]
    })
  } catch (error) {
    console.error('Failed to fetch game usage:', error)
    return []
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`
  return `${Math.round(seconds / 60)} min`
}

export default async function AnalyticsPage() {
  const [stats, gameUsage] = await Promise.all([getAnalytics(), getGameUsage()])

  return (
    <div className="container mx-auto px-6 py-12 max-w-3xl">
      <div className="animate-fade">
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-2">
          How We&apos;re Doing
        </h1>
        <p className="text-primary-light mb-10">
          A transparent look at who visits and what they explore.
        </p>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          role="region"
          aria-label="Site visit statistics"
        >
          <StatCard
            label="Total Visits"
            value={stats.total}
            icon={<Eye size={20} />}
          />
          <StatCard
            label="Today"
            value={stats.today}
            icon={<Calendar size={20} />}
          />
          <StatCard
            label="This Week"
            value={stats.thisWeek}
            icon={<CalendarDays size={20} />}
          />
          <StatCard
            label="This Month"
            value={stats.thisMonth}
            icon={<CalendarRange size={20} />}
          />
        </div>

        {gameUsage.length > 0 && (
          <section className="mt-12" aria-labelledby="game-usage-heading">
            <h2 id="game-usage-heading" className="text-2xl font-semibold text-foreground mb-2">
              What People Explore
            </h2>
            <p className="text-primary-light mb-6">
              Last {USAGE_WINDOW_DAYS} days. Time spent is the typical (median) visit.
            </p>
            <div className="bg-card-bg border border-card-border rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-sm text-primary-light border-b border-card-border">
                    <th scope="col" className="px-6 py-3 font-medium">Game</th>
                    <th scope="col" className="px-6 py-3 font-medium text-right">Times opened</th>
                    <th scope="col" className="px-6 py-3 font-medium text-right">Time spent</th>
                  </tr>
                </thead>
                <tbody>
                  {gameUsage.map((game) => (
                    <tr key={game.gameId} className="border-b border-card-border last:border-b-0">
                      <th scope="row" className="px-6 py-3 font-medium">
                        <Link
                          href={`/games/${game.slug}`}
                          className="text-foreground hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded"
                        >
                          {game.title}
                        </Link>
                      </th>
                      <td className="px-6 py-3 text-right font-mono text-foreground">
                        {game.opens.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-primary-light">
                        {game.medianSeconds === null ? '—' : formatDuration(game.medianSeconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="mt-12 text-sm text-primary-light">
          Every number here is an anonymous count. Nothing on this page, or behind it, can be
          traced back to a person.{' '}
          <Link href="/privacy" className="text-accent hover:underline">
            How we handle data
          </Link>
        </p>
      </div>
    </div>
  )
}
