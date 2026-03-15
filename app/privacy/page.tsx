import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | VeryGoodMelon.Fun',
  description: 'How VeryGoodMelon.Fun handles your data — spoiler: we collect almost nothing.',
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-3xl">
      <div className="animate-fade">
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-6">
          Privacy Policy
        </h1>

        <p className="text-primary-light mb-2 text-sm">
          Last updated: March 15, 2026
        </p>

        <div className="space-y-8 text-primary-light leading-relaxed">
          <p className="text-lg">
            VeryGoodMelon.Fun is built with respect for your privacy. We collect as little data as
            possible and never sell, share, or monetize any information.
          </p>

          {/* Data Collection */}
          <section className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Data Collection</h2>
            <p>
              We track a single, anonymous visit count using Supabase. This count is a running total
              with no way to identify individual visitors. No IP addresses, device fingerprints, or
              personally identifiable information are recorded.
            </p>
          </section>

          {/* AI Usage */}
          <section className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">AI-Powered Experiences</h2>
            <p>
              Some games use Google Gemini and OpenAI to create interactive experiences. When you
              interact with these features, your inputs are sent to these services to generate
              responses in real time.{' '}
              <strong className="text-foreground">Your inputs are not stored</strong> by
              VeryGoodMelon.Fun. Refer to{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline transition-colors"
              >
                Google&apos;s
              </a>{' '}
              and{' '}
              <a
                href="https://openai.com/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline transition-colors"
              >
                OpenAI&apos;s
              </a>{' '}
              privacy policies for how they handle data processed through their APIs.
            </p>
          </section>

          {/* Cookies & Storage */}
          <section className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Cookies &amp; Storage</h2>
            <p>
              We do not use cookies. The site uses <code className="text-foreground text-sm bg-foreground/5 px-1.5 py-0.5 rounded">sessionStorage</code> solely
              to prevent counting the same visit twice in a single browser session. This data is
              automatically cleared when you close your browser tab and is never sent to any server.
            </p>
          </section>

          {/* Analytics */}
          <section className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Analytics</h2>
            <p>
              We use Vercel Speed Insights to monitor site performance. This collects anonymous,
              aggregated performance metrics (page load times, web vitals) with no personally
              identifiable information. No advertising trackers or third-party analytics scripts are
              present on this site.
            </p>
          </section>

          {/* Third-Party Services */}
          <section className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Third-Party Services</h2>
            <p className="mb-3">The following services are used to power the site:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong className="text-foreground">Google Gemini</strong> &mdash; generates interactive game content
              </li>
              <li>
                <strong className="text-foreground">OpenAI</strong> &mdash; fallback for game content generation
              </li>
              <li>
                <strong className="text-foreground">ElevenLabs</strong> &mdash; provides text-to-speech for audio experiences
              </li>
              <li>
                <strong className="text-foreground">Supabase</strong> &mdash; stores the anonymous visit counter
              </li>
              <li>
                <strong className="text-foreground">Vercel</strong> &mdash; hosts the site and provides performance analytics
              </li>
            </ul>
            <p className="mt-3">
              Each service has its own privacy policy governing how it processes data. We encourage
              you to review them if you have concerns.
            </p>
          </section>

          {/* No Accounts */}
          <section className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">No Accounts or Authentication</h2>
            <p>
              VeryGoodMelon.Fun does not require or offer user accounts, logins, or any form of
              authentication. There are no passwords, emails, or profile data to manage.
            </p>
          </section>

          {/* No Advertising */}
          <section className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">No Advertising or Tracking</h2>
            <p>
              There are no ads, affiliate links, remarketing pixels, or cross-site tracking scripts
              on this site. We do not build user profiles or sell data to anyone.
            </p>
          </section>

          {/* Contact */}
          <section className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Contact</h2>
            <p>
              If you have questions about this privacy policy, use the feedback button on the site
              to get in touch.
            </p>
          </section>

          <div className="pt-6 border-t border-card-border">
            <p className="text-sm text-primary-light italic">
              &ldquo;Every pixel has meaning &mdash; but none of them track you.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
