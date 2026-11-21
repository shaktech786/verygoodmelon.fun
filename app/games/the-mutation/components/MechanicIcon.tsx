import { Move, MousePointer2, Star, Gem, Ghost, Waves, Sparkles, Wind, Music2, Magnet, Flower2, type LucideIcon } from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  arrow_keys: Move,
  mouse_follow: MousePointer2,
  stars: Star,
  pulse_gems: Gem,
  chasers: Ghost,
  sweepers: Waves,
  blaster: Sparkles,
  phase_dash: Wind,
  combo_chain: Music2,
  gravity_well: Magnet,
  score_rush: Flower2,
}

export function MechanicIcon({ id, size = 16 }: { id: string; size?: number }) {
  const Icon = ICONS[id] ?? Sparkles
  return <Icon size={size} aria-hidden="true" />
}
