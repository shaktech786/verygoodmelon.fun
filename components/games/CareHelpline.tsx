'use client'

import { useCareMode } from '@/components/games/CareMode'
import { HelplineSentence } from '@/components/games/HelplineSentence'

/** The quiet helpline sentence, only while care mode lasts, for pages that show calm games outside the gentle row. */
export function CareHelpline({ className = '' }: { className?: string }) {
  const { care } = useCareMode()
  if (!care) return null
  return (
    <p className={`text-sm text-foreground/80 leading-relaxed ${className}`}>
      <HelplineSentence lead="If things feel too heavy right now, you can talk to someone." />
    </p>
  )
}
