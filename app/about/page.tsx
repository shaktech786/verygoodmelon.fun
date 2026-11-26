import type { Metadata } from 'next'
import { GiveBlock } from '@/components/seedpress/GiveBlock'
import { InkLink } from '@/components/seedpress/Link'
import { Prose, ProseSection, ProseSign, Term } from '@/components/seedpress/Prose'

export const metadata: Metadata = {
  title: 'About | VeryGoodMelon.Fun',
  description: 'Why VeryGoodMelon.Fun exists and who makes it.',
}

export default function AboutPage() {
  return (
    <Prose
      title="About"
      lead={
        <>
          <p>
            VeryGoodMelon.Fun is a small collection of quiet games for a busy mind. Every one is made with a
            single hope: that you leave a little less anxious than when you arrived.
          </p>
          <p>
            Some help you slow down, and some let you sit with a big question in a calm, low-pressure way.
            Think deeply, feel lighter.
          </p>
        </>
      }
    >
      <p>
        I&apos;m <Term>Shakeel Bhamani</Term>, a software consultant in Atlanta, and I make these in the evenings.
        The name is a nod to VeryGoodPizza, my gaming channel. Elsewhere I&apos;ve given a TEDx talk and was
        runner-up at a 2017 beatbox championship.
      </p>

      <p>
        No streaks, no scores to chase, nothing against the clock. Play one for a few minutes and close the tab
        whenever you like.
      </p>

      <ProseSection id="inspiration" title="Inspiration">
        <p>
          A huge thank you to <InkLink href="https://neal.fun">Neal Agarwal</InkLink> from{' '}
          <InkLink href="https://neal.fun">neal.fun</InkLink>. His creative, purposeful web experiments inspired me
          to build this site and stick to creating things that matter. If you haven&apos;t explored neal.fun yet,
          you&apos;re in for a treat.
        </p>
      </ProseSection>

      <ProseSection id="connect" title="Connect">
        <ul className="sp-prose__links">
          <li>
            <InkLink href="https://shak-tech.com">Website</InkLink>
          </li>
          <li>
            <InkLink href="https://linkedin.com/in/shakeelbhamani">LinkedIn</InkLink>
          </li>
          <li>
            <InkLink href="https://github.com/shaktech786">GitHub</InkLink>
          </li>
        </ul>
      </ProseSection>

      <ProseSign>&ldquo;Every pixel has meaning.&rdquo;</ProseSign>

      <GiveBlock placement="page" />
    </Prose>
  )
}
