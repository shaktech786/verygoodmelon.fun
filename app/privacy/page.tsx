import type { Metadata } from 'next'
import { LegalLink, LegalList, LegalPage, LegalSection, Term } from '@/components/ui/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy | VeryGoodMelon.Fun',
  description:
    'How VeryGoodMelon.Fun handles your data: anonymous counts, no ads, no tracking, nothing sold.',
}

const CONTACT_EMAIL = 'hello@verygoodmelon.fun'

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="September 21, 2026">
      <p className="text-lg">
        VeryGoodMelon.Fun exists to help you feel a little lighter. Watching you closely would
        defeat the point. This page explains, in plain language, exactly what the site learns
        about visitors and what it never does.
      </p>

      <LegalSection id="short-version" title="The Short Version">
        <LegalList>
          <li>We count things anonymously. We do not track people.</li>
          <li>No ads, no advertising cookies, no cross-site tracking, no profiles.</li>
          <li>
            We never sell, rent, or trade data, and we never use it for anything other than
            running and improving this site.
          </li>
          <li>You can play everything without an account.</li>
          <li>
            If your browser sends a <Term>Do Not Track</Term> or{' '}
            <Term>Global Privacy Control</Term> signal, we skip measuring you entirely.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="anonymous-measurement" title="What We Measure, Anonymously">
        <p>
          To understand which experiences are worth improving, we collect aggregate statistics.
          None of it is tied to you, and none of it uses cookies.
        </p>
        <LegalList>
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
            <Term>Visit counter.</Term> A running total of visits, shown in the footer.
          </li>
          <li>
            <Term>Performance (Vercel Speed Insights).</Term> Anonymous page-speed measurements
            such as load time.
          </li>
        </LegalList>
        <p>
          These numbers are public. You can see the same totals we see on the{' '}
          <LegalLink href="/analytics">analytics page</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection id="what-you-share" title="What You Choose to Share">
        <p>Some experiences invite you to contribute. Sharing is always optional.</p>
        <LegalList>
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
            <LegalLink href="https://github.com/shaktech786/verygoodmelon.fun/issues">
              public GitHub repository
            </LegalLink>
            , where anyone can read it. Please leave out anything personal. For a private message,
            email us instead.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="conversations" title="Conversations and Generated Content">
        <p>
          Several experiences respond to what you type or say. To produce a response, your input
          is sent to Google (Gemini) or OpenAI for processing, and the reply comes straight back
          to you. <Term>We do not store your conversations</Term>, and we do not use them to
          train anything. These providers process the text under their own API terms.
        </p>
        <LegalList>
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
        </LegalList>
      </LegalSection>

      <LegalSection id="accounts" title="Optional Accounts">
        <p>
          You never need an account. If you choose to sign in, by email link or with GitHub, we
          store your email address and, for GitHub sign-in, your public display name and avatar.
          This is used only to sign you in and show your profile. Email{' '}
          <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink> and we will
          delete your account and everything attached to it.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and Browser Storage">
        <LegalList>
          <li>
            <Term>No analytics or advertising cookies.</Term> None, ever.
          </li>
          <li>
            <Term>Sign-in cookie.</Term> Set only if you sign in, and used only to keep you signed
            in.
          </li>
          <li>
            <Term>Local storage.</Term> Your accessibility settings, game progress, play history
            (used for the suggestions on the homepage), and some cached content are saved in your
            browser. This stays on your device and is not sent to us. Clearing your browser data
            removes it, and the accessibility panel has a reset button.
          </li>
          <li>
            <Term>Session storage.</Term> A single flag, erased when you close the tab, stops the
            visit counter from counting you twice.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="reliability" title="Keeping the Site Working">
        <LegalList>
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
        </LegalList>
      </LegalSection>

      <LegalSection id="services" title="Services We Rely On">
        <p>
          These companies process data on our behalf, only to provide the function listed. None of
          them receive data for advertising.
        </p>
        <LegalList>
          <li>
            <LegalLink href="https://vercel.com/legal/privacy-policy">Vercel</LegalLink> &mdash;
            hosting, anonymous traffic and performance measurement
          </li>
          <li>
            <LegalLink href="https://supabase.com/privacy">Supabase</LegalLink> &mdash; database
            and optional sign-in
          </li>
          <li>
            <LegalLink href="https://policies.google.com/privacy">Google</LegalLink> and{' '}
            <LegalLink href="https://openai.com/policies/privacy-policy">OpenAI</LegalLink>{' '}
            &mdash; generating responses
          </li>
          <li>
            <LegalLink href="https://elevenlabs.io/privacy-policy">ElevenLabs</LegalLink> and{' '}
            <LegalLink href="https://www.simli.com/legal">Simli</LegalLink> &mdash; voice
            and animated portraits
          </li>
          <li>
            <LegalLink href="https://sentry.io/privacy/">Sentry</LegalLink> &mdash; error reports
          </li>
          <li>
            <LegalLink href="https://resend.com/legal/privacy-policy">Resend</LegalLink> &mdash;
            sending confirmation emails
          </li>
          <li>
            <LegalLink href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
              GitHub
            </LegalLink>{' '}
            &mdash; optional sign-in and public feedback
          </li>
          <li>
            <LegalLink href="https://esm.sh">esm.sh</LegalLink> &mdash; delivers an open-source 3D
            library used for animated portraits
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="never" title="What We Never Do">
        <LegalList>
          <li>Sell, rent, share, or trade data with anyone, for any price or purpose.</li>
          <li>Show ads, or use advertising, remarketing, or social media tracking pixels.</li>
          <li>Build profiles of visitors or follow you to other websites.</li>
          <li>Use what you write to train models.</li>
          <li>Use data for anything other than running and improving this site.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="retention" title="How Long Things Are Kept">
        <LegalList>
          <li>Anonymous counts are kept indefinitely. They describe no one.</li>
          <li>Public submissions stay until they are removed. Ask and we will remove yours.</li>
          <li>Thinker requests and accounts are kept until you ask us to delete them.</li>
          <li>Error reports are deleted automatically within 90 days.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="your-choices" title="Your Choices and Rights">
        <p>
          Wherever you live, you can ask what we hold about you, ask for a copy, ask us to correct
          it, or ask us to delete it. Because almost everything here is anonymous, this usually
          applies only to an account, a thinker request, or something you submitted. Email{' '}
          <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink> and we will
          respond within 30 days. We will never treat you differently for asking.
        </p>
        <p>
          To opt out of anonymous measurement, turn on Do Not Track or Global Privacy Control in
          your browser. No banner, no dark patterns, no account needed.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          This site is not directed at children under 13, and we do not knowingly collect personal
          information from them. Some experiences explore themes such as mortality. If you believe
          a child has sent us personal information, email us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to This Policy">
        <p>
          If how we handle data changes, this page changes first, and the date at the top is
          updated. We will never quietly start collecting more.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Questions or requests:{' '}
          <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>. See also our{' '}
          <LegalLink href="/terms">Terms of Use</LegalLink>.
        </p>
      </LegalSection>

      <div className="pt-6 border-t border-card-border">
        <p className="text-sm text-primary-light italic">
          &ldquo;Every pixel has meaning &mdash; but none of them track you.&rdquo;
        </p>
      </div>
    </LegalPage>
  )
}
