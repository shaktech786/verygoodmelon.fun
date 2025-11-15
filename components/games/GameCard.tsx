import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Game } from '@/types/database'
import { Users, Sparkles } from 'lucide-react'

interface GameCardProps {
  game: Game
}

export function GameCard({ game }: GameCardProps) {
  const difficultyColors: Record<string, 'success' | 'warning' | 'danger'> = {
    easy: 'success' as const,
    medium: 'warning' as const,
    hard: 'danger' as const
  }

  const difficulty = game.difficulty || 'medium'
  const difficultyVariant = difficultyColors[difficulty] || 'warning'

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-xl"
      aria-label={`Play ${game.title} - ${difficulty} difficulty, ${game.play_count} plays, ${game.points_reward} points reward`}
    >
      <Card hover className="h-full">
        <div className="aspect-video bg-hover-bg rounded-xl mb-4 overflow-hidden relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={game.thumbnail_url}
            alt=""
            role="presentation"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Overlay on hover for better visual feedback */}
          <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors duration-300" />
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-accent transition-colors">
              {game.title}
            </h3>
            <Badge variant={difficultyVariant} aria-label={`Difficulty: ${difficulty}`}>
              {difficulty}
            </Badge>
          </div>

          <p className="text-primary-light text-sm line-clamp-2 leading-relaxed">
            {game.description}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-card-border">
            <div className="flex items-center gap-3 text-xs text-primary-light">
              <div className="flex items-center gap-1" aria-label={`${game.play_count} plays`}>
                <Users size={14} aria-hidden="true" />
                <span>{game.play_count}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-medium text-accent" aria-label={`${game.points_reward} points reward`}>
              <Sparkles size={14} aria-hidden="true" />
              <span>+{game.points_reward}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
