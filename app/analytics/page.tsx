import { Metadata } from 'next'
import { Eye, Calendar, CalendarDays, CalendarRange } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

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

export default async function AnalyticsPage() {
  const stats = await getAnalytics()

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
      </div>
    </div>
  )
}
