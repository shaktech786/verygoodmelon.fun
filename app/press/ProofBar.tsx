import { SenseDial } from '@/components/seedpress/SenseDial'
import { Stamp } from '@/components/seedpress/Stamp'
import type { IconName } from '@/components/seedpress/icons/glyphs'

/** Only on the proof pages: the dial within reach, and the way between the two pages. */
export function ProofBar({ other }: { other: { href: string; label: string; icon: IconName } }) {
  return (
    <aside aria-label="Proof controls" className="sp-proof-bar">
      <div className="sp-shop sp-proof-bar__row">
        <SenseDial compact />
        <Stamp href={other.href} icon={other.icon}>
          {other.label}
        </Stamp>
      </div>
    </aside>
  )
}
