import type { Recovery } from '../engine/run'

function joined(parts: string[]): string {
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

/** What the low-Resolve warning offers: only the ways to recover your next step really has, with what each restores. */
export function recoveryLine(options: Recovery[]): string {
  if (options.length === 0) return 'Nothing on your next step restores Resolve, but unspent Focus becomes Guard, so holding back is a real defence.'
  const parts = options.map((o) => (o.kind === 'rest' ? `the rest restores ${o.amount} Resolve` : `the shop’s tea (${o.price} gold) restores ${o.amount}`))
  const line = joined(parts)
  return `On your next step, ${line}.`
}
