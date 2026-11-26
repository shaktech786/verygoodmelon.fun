import type { Metadata } from 'next'
import { Icon } from '@/components/seedpress/icons/Icon'

export const metadata: Metadata = {
  title: 'About | VeryGoodMelon.Fun',
  description: 'Why VeryGoodMelon.Fun exists and who makes it.',
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-3xl">
      <div className="animate-fade">
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-6">
          About
        </h1>

        <div className="space-y-6 text-primary-light leading-relaxed">
          <div className="space-y-3 pb-6 border-b border-card-border text-lg text-foreground">
            <p>
              VeryGoodMelon.Fun is a small collection of quiet games for a busy mind. Every one is made with a
              single hope: that you leave a little less anxious than when you arrived.
            </p>
            <p>
              Some help you slow down, and some let you sit with a big question in a calm, low-pressure way.
              Think deeply, feel lighter.
            </p>
          </div>

          <p className="text-lg">
            I&apos;m <span className="text-foreground font-medium">Shakeel Bhamani</span>, a software consultant
            in Atlanta, and I make these in the evenings. The name is a nod to VeryGoodPizza, my gaming channel.
            Elsewhere I&apos;ve given a TEDx talk and was runner-up at a 2017 beatbox championship.
          </p>

          <p>
            No streaks, no scores to chase, nothing against the clock. Play one for a few minutes and close
            the tab whenever you like.
          </p>

          <div className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Inspiration</h2>
            <p>
              A huge thank you to{' '}
              <a
                href="https://neal.fun"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:no-underline font-medium"
              >
                Neal Agarwal
              </a>
              {' '}from{' '}
              <a
                href="https://neal.fun"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:no-underline"
              >
                neal.fun
              </a>
              . His creative, purposeful web experiments inspired me to build this site and stick to
              creating things that matter. If you haven&apos;t explored neal.fun yet, you&apos;re in for a treat.
            </p>
          </div>

          <div className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Connect</h2>
            <div className="flex flex-col gap-3">
              <a
                href="https://shak-tech.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent hover:underline transition-colors"
              >
                Website
                <Icon name="external" size={16} />
              </a>
              <a
                href="https://linkedin.com/in/shakeelbhamani"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent hover:underline transition-colors"
              >
                LinkedIn
                <Icon name="external" size={16} />
              </a>
              <a
                href="https://github.com/shaktech786"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent hover:underline transition-colors"
              >
                GitHub
                <Icon name="external" size={16} />
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-card-border">
            <p className="text-sm text-primary-light italic">
              &ldquo;Every pixel has meaning.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
