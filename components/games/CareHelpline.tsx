'use client'

import { useCareMode } from '@/components/games/CareMode'
import { CareBlock } from '@/components/seedpress/CareBlock'

/** The helplines, only while care mode lasts, for pages that show calm games outside the gentle row. */
export function CareHelpline({ className }: { className?: string }) {
  const { care } = useCareMode()
  if (!care) return null
  return <CareBlock lead="If things feel too heavy right now, you can talk to someone." className={className} />
}
