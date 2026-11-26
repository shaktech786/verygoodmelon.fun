import type { Metadata } from 'next'
import { Suspense } from 'react'
import { InkLink } from '@/components/seedpress/Link'
import { Prose, ProseList, ProseSection, ProseSign, Term } from '@/components/seedpress/Prose'
import { SiteNumbers } from './SiteNumbers'

// The public numbers are live counts: render per request instead of freezing them at build time
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Privacy Policy | VeryGoodMelon.Fun',
  description:
    'How VeryGoodMelon.Fun handles your data: anonymous counts, no ads, no tracking, nothing sold.',
}

const CONTACT_EMAIL = 'hello@verygoodmelon.fun'

export default function PrivacyPage() {
  return (
    <Prose
      title="Privacy Policy"
      meta="Last updated: November 22, 2026"
      lead={
        <p>
          VeryGoodMelon.Fun exists to help you feel a little lighter. Watching you closely would
          defeat the point. This page explains, in plain language, exactly what the site learns
          about visitors and what it never does.
        </p>
      }
    >
      <ProseSection id="short-version" title="The Short Version">
        <ProseList>
          <li>We count things anonymously. We do not track people.</li>
          <li>No ads, no advertising cookies, no cross-site tracking, no profiles.</li>
          <li>
            We never sell, rent, or trade data, and we never use it for anything other than
            running and improving this site.
          </li>
          <li>There are no accounts. You can play everything without giving us anything.</li>
          <li>
            If your browser sends a <Term>Do Not Track</Term> or{' '}
            <Term>Global Privacy Control</Term> signal, we skip measuring you entirely.
          </li>
        </ProseList>
      </ProseSection>

      <ProseSection id="anonymous-measurement" title="What We Measure, Anonymously">
        <p>
          To understand which experiences are worth improving, we collect aggregate statistics.
          None of it is tied to you, and none of it uses cookies.
        </p>
        <ProseList>
          <li>
            <Term>Page traffic (Vercel Web Analytics).</Term> Which page was viewed, the referring
            site, approximate location (country and region, derived from the request and never
            stored as an IP address), and device type, browser, and operating system. Visitors are
            told apart using a short-lived anonymous hash that is discarded within 24 hours, so
            visits cannot be linked from one day to the next or across other websites.
          </li>
          <li>
            <Term>Game usage (our own database).</Term> When a game is opened we record which
            game. When it is closed we record how many seconds it was open. That is the entire
            record: there is no visitor ID, session ID, IP address, or device information, and an
            &ldquo;opened&rdquo; record cannot even be matched to its &ldquo;closed&rdquo; record.
          </li>
          <li>
            <Term>Visit total.</Term> Each visit adds one to an anonymous running total. It is
            not shown anywhere on the site except in the numbers below.
          </li>
          <li>
            <Term>Performance (Vercel Speed Insights).</Term> Anonymous page-speed measurements
            such as load time.
          </li>
        </ProseList>
        <p>
          These numbers are public. You can see the same totals we see in{' '}
          <InkLink href="#analytics">the numbers below</InkLink>.
        </p>
      </ProseSection>

      <ProseSection id="analytics" title="The Numbers, in Public">
        <p>
          Every number here is an anonymous count. Nothing in this section, or behind it, can be
          traced back to a person.
        </p>
        <Suspense fallback={<p>Counting…</p>}>
          <SiteNumbers />
        </Suspense>
      </ProseSection>

      <ProseSection id="what-you-share" title="What You Choose to Share">
        <p>Some experiences invite you to contribute. Sharing is always optional.</p>
        <ProseList>
          <li>
            <Term>Last words and first words.</Term> The text you submit is stored and shown to
            other visitors, with no name or identifier attached. Please do not include personal
            details, because what you write is public.
          </li>
          <li>
            <Term>Thoughts.</Term> Your text, its theme, and a name only if you choose to add one.
            Submissions are reviewed before they appear publicly.
          </li>
          <li>
            <Term>Votes on dilemmas.</Term> Only the dilemma and the option chosen. Your browser
            remembers which ones you answered so you are not asked twice.
          </li>
          <li>
            <Term>Requests for a new thinker.</Term> Your name, email address, and the details of
            your request, so we can reply. You will receive a confirmation email.
          </li>
          <li>
            <Term>Feedback.</Term> Feedback sent with the feedback button is posted as an issue on
            our{' '}
            <InkLink href="https://github.com/shaktech786/verygoodmelon.fun/issues">
              public GitHub repository
            </InkLink>
            , where anyone can read it. Please leave out anything personal. For a private message,
            email us instead.
          </li>
        </ProseList>
      </ProseSection>

      <ProseSection id="conversations" title="Conversations and Generated Content">
        <p>
          Several experiences respond to what you type or say. To produce a response, your input
          is sent to Google (Gemini) or OpenAI for processing, and the reply comes straight back
          to you. <Term>We do not store your conversations</Term>, and we do not use them to
          train anything. These providers process the text under their own API terms.
        </p>
        <ProseList>
          <li>
            <Term>Spoken replies.</Term> When a character speaks aloud, the text of its reply (not
            yours) is sent to ElevenLabs to generate audio, and animated portraits may be rendered
            by Simli.
          </li>
          <li>
            <Term>Your microphone.</Term> Voice input is optional and only starts when you turn it
            on. Speech is converted to text by your own browser. Some browsers, including Chrome,
            do this using their maker&rsquo;s servers. We never receive or store your audio.
          </li>
        </ProseList>
      </ProseSection>


      <ProseSection id="cookies" title="Cookies and Browser Storage">
        <ProseList>
          <li>
            <Term>No analytics or advertising cookies.</Term> None, ever.
          </li>
          <li>
            <Term>Local storage.</Term> Your accessibility settings, game progress, and some cached
            content are saved in your browser. This stays on your device and is not sent to us. Clearing your browser data
            removes it, and the accessibility panel has a reset button. If something you write
            suggests you are going through something very hard, a small flag that clears itself
            after four hours keeps the suggestions gentle and support numbers in view.
          </li>
          <li>
            <Term>Private writing.</Term> What you write in The Keeper (your sealed worries and how
            they turned out) and in The Plain Speaker (your notes before a conversation) is kept only in
            this browser and never sent to us. &ldquo;Save a copy&rdquo; in The Keeper creates a
            file on your own device. The moments you finish in The Patient One (and anything you
            wrote or ticked in them) are kept in this browser only until midnight, for the
            &ldquo;Today&rdquo; strip. Parting lines you choose to keep in The Sage stay in this
            browser until you remove them.
          </li>
          <li>
            <Term>Keepsake images.</Term> The pictures some games offer at the end are drawn by
            your own browser. &ldquo;Save image&rdquo; and &ldquo;Share&rdquo; hand the picture
            straight to your device; nothing is uploaded to us.
          </li>
          <li>
            <Term>Session storage.</Term> A single flag, erased when you close the tab, stops the
            visit total from counting you twice.
          </li>
        </ProseList>
      </ProseSection>

      <ProseSection id="reliability" title="Keeping the Site Working">
        <ProseList>
          <li>
            <Term>Error reports (Sentry).</Term> If something breaks, a report is sent with the
            error, the page it happened on, and your browser and operating system. We do not
            record your screen or your sessions.
          </li>
          <li>
            <Term>Abuse protection.</Term> To limit automated abuse, the server briefly holds the
            requesting IP address in memory for up to one minute. It is never written to a
            database or log by us.
          </li>
          <li>
            <Term>Hosting.</Term> Like every website, our host (Vercel) processes IP addresses and
            request details in order to deliver pages and defend against attacks.
          </li>
        </ProseList>
      </ProseSection>

      <ProseSection id="services" title="Services We Rely On">
        <p>
          These companies process data on our behalf, only to provide the function listed. None of
          them receive data for advertising.
        </p>
        <ProseList>
          <li>
            <InkLink href="https://vercel.com/legal/privacy-policy">Vercel</InkLink> &mdash;
            hosting, anonymous traffic and performance measurement
          </li>
          <li>
            <InkLink href="https://supabase.com/privacy">Supabase</InkLink> &mdash; database
          </li>
          <li>
            <InkLink href="https://policies.google.com/privacy">Google</InkLink> and{' '}
            <InkLink href="https://openai.com/policies/privacy-policy">OpenAI</InkLink>{' '}
            &mdash; generating responses
          </li>
          <li>
            <InkLink href="https://elevenlabs.io/privacy-policy">ElevenLabs</InkLink> and{' '}
            <InkLink href="https://www.simli.com/legal">Simli</InkLink> &mdash; voice
            and animated portraits
          </li>
          <li>
            <InkLink href="https://sentry.io/privacy/">Sentry</InkLink> &mdash; error reports
          </li>
          <li>
            <InkLink href="https://resend.com/legal/privacy-policy">Resend</InkLink> &mdash;
            sending confirmation emails
          </li>
          <li>
            <InkLink href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
              GitHub
            </InkLink>{' '}
            &mdash; public feedback
          </li>
          <li>
            <InkLink href="https://esm.sh">esm.sh</InkLink> &mdash; delivers an open-source 3D
            library used for animated portraits
          </li>
        </ProseList>
      </ProseSection>

      <ProseSection id="never" title="What We Never Do">
        <ProseList>
          <li>Sell, rent, share, or trade data with anyone, for any price or purpose.</li>
          <li>Show ads, or use advertising, remarketing, or social media tracking pixels.</li>
          <li>Build profiles of visitors or follow you to other websites.</li>
          <li>Use what you write to train models.</li>
          <li>Use data for anything other than running and improving this site.</li>
        </ProseList>
      </ProseSection>

      <ProseSection id="retention" title="How Long Things Are Kept">
        <ProseList>
          <li>Anonymous counts are kept indefinitely. They describe no one.</li>
          <li>Public submissions stay until they are removed. Ask and we will remove yours.</li>
          <li>Thinker requests are kept until you ask us to delete them.</li>
          <li>Error reports are deleted automatically within 90 days.</li>
        </ProseList>
      </ProseSection>

      <ProseSection id="your-choices" title="Your Choices and Rights">
        <p>
          Wherever you live, you can ask what we hold about you, ask for a copy, ask us to correct
          it, or ask us to delete it. Because almost everything here is anonymous, this usually
          applies only to a thinker request or something you submitted. Email{' '}
          <InkLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</InkLink> and we will
          respond within 30 days. We will never treat you differently for asking.
        </p>
        <p>
          To opt out of anonymous measurement, turn on Do Not Track or Global Privacy Control in
          your browser. No banner and no dark patterns.
        </p>
      </ProseSection>

      <ProseSection id="children" title="Children">
        <p>
          This site is not directed at children under 13, and we do not knowingly collect personal
          information from them. Some experiences explore themes such as mortality. If you believe
          a child has sent us personal information, email us and we will delete it.
        </p>
      </ProseSection>

      <ProseSection id="changes" title="Changes to This Policy">
        <p>
          If how we handle data changes, this page changes first, and the date at the top is
          updated. We will never quietly start collecting more.
        </p>
      </ProseSection>

      <ProseSection id="contact" title="Contact">
        <p>
          Questions or requests:{' '}
          <InkLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</InkLink>. See also our{' '}
          <InkLink href="/terms">Terms of Use</InkLink>.
        </p>
      </ProseSection>

      <ProseSign>
        &ldquo;Every pixel has meaning &mdash; but none of them track you.&rdquo;
      </ProseSign>
    </Prose>
  )
}
