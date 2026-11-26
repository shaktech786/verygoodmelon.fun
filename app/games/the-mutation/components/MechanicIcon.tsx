import { Icon } from '@/components/seedpress/icons/Icon'
import type { IconName } from '@/components/seedpress/icons/glyphs'

const ICONS: Record<string, IconName> = {
  arrow_keys: 'move',
  mouse_follow: 'cursor',
  stars: 'star',
  pulse_gems: 'gem',
  chasers: 'ghost',
  sweepers: 'waves',
  blaster: 'sparkles',
  phase_dash: 'wind',
  combo_chain: 'music',
  gravity_well: 'magnet',
  score_rush: 'flower',
}

export function MechanicIcon({ id }: { id: string }) {
  return <Icon name={ICONS[id] ?? 'sparkles'} size={12} />
}
