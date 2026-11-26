import type { Metadata } from 'next'
import { CareBlock } from '@/components/seedpress/CareBlock'
import { Prose } from '@/components/seedpress/Prose'
import { Stamp } from '@/components/seedpress/Stamp'

export const metadata: Metadata = {
  title: 'Need to talk? | VeryGoodMelon.Fun',
  description: 'Free, confidential support lines, open at any hour.',
}

export default function SupportPage() {
  return (
    <Prose
      title="Need to talk?"
      lead={
        <p>
          Some days are heavier than a game can hold, and that is nothing to be ashamed of. Talking to a person can
          help, even when it is hard to know where to start.
        </p>
      }
    >
      <CareBlock lead="You do not need to be in crisis to reach out. These lines are free and open at any hour." />
      <p className="sp-prose__actions">
        <Stamp href="/games/the-still-point">Or breathe slowly for a minute</Stamp>
      </p>
    </Prose>
  )
}
