import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/seedpress/icons/Icon'

export const metadata: Metadata = {
  title: 'About these conversations - The Sage | VeryGoodMelon.Fun',
  description: 'What The Sage is and is not: imagined conversations, not real quotes from the person.',
}

export default function DisclaimerPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-3xl">
      <Link
        href="/games/ancient-voices"
        className="inline-flex items-center gap-2 min-h-11 text-foreground underline underline-offset-2 hover:no-underline mb-6"
      >
        <Icon name="back" size={24} />
        Back to The Sage
      </Link>

      <h1 className="text-3xl sm:text-4xl font-semibold mb-6">About these conversations</h1>

      <div className="space-y-6 text-base sm:text-lg leading-relaxed text-foreground/85">
        <section>
          <h2 className="text-xl font-semibold mb-2 text-foreground">Imagined conversations, not real quotes</h2>
          <p>
            The people you talk to in The Sage are imagined. Each reply is written by a computer program, inspired by
            what is known of the person&apos;s life and writing. They are not their real words, and not a way of
            reaching anyone, living or dead.
          </p>
        </section>

        <p>
          They are here to help you think something through with a different voice beside you. They can be wrong
          about history, and they are no substitute for a doctor, a lawyer, a counsellor or someone who knows you.
        </p>

        <p>
          What you type is sent to a text service to write each reply. Please keep very personal details to yourself.
          If you are having a hard time, you deserve a real person: someone you trust, or a local support line.
        </p>

        <details className="group rounded-lg border border-card-border bg-card-bg">
          <summary className="cursor-pointer min-h-11 flex items-center px-4 py-3 text-base font-medium text-foreground rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
            The full terms
          </summary>
          <div className="px-4 pb-5 pt-1 space-y-6 text-base text-foreground/85">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Nature of the Experience</h2>
            <p>
              Replies in The Sage are written by a computer program, drawing on:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Historical records and biographical information</li>
              <li>Published writings, speeches, and documented beliefs</li>
              <li>Research into speaking styles and philosophical frameworks</li>
              <li>Imaginative interpretation, which can be wrong</li>
            </ul>
            <p className="mt-3">
              <strong>These conversations are imagined. They are not communications with, or quotations of, the real people.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. No Endorsement or Representation</h2>
            <p>
              We do not claim to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Accurately represent what any historical figure would actually say</li>
              <li>Have endorsement from estates, families, or representatives of these individuals</li>
              <li>Provide factually accurate or complete historical information</li>
              <li>Offer spiritual, supernatural, or paranormal communication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Intended Use</h2>
            <p>
              The Sage is intended exclusively for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li><strong>Entertainment:</strong> Creative, thoughtful conversation</li>
              <li><strong>Education:</strong> Learning about historical perspectives and philosophies</li>
              <li><strong>Personal Growth:</strong> Reflection, inspiration, and reducing anxiety</li>
              <li><strong>Philosophical Exploration:</strong> Engaging with different worldviews</li>
            </ul>
            <p className="mt-3 font-semibold">
              This experience is NOT intended for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Medical, legal, financial, or professional advice</li>
              <li>Academic research or citation as authoritative sources</li>
              <li>Spiritual guidance or religious instruction</li>
              <li>Making important life decisions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Accuracy and Reliability</h2>
            <p>
              <strong>No Guarantee of Accuracy:</strong> While we strive for historical and philosophical
              accuracy in our research, the invented replies:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>May contain errors, inaccuracies, or anachronisms</li>
              <li>Are interpretations, not verified statements</li>
              <li>Should not be relied upon as factual or authoritative</li>
              <li>May reflect the limits and biases of the software that writes them</li>
            </ul>
            <p className="mt-3 font-semibold">
              Always verify important information through credible, independent sources.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. User Responsibilities</h2>
            <p>By using The Sage, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Use the service for lawful, positive purposes only</li>
              <li>Not present invented replies as real words or communications from the people depicted</li>
              <li>Not use responses for academic citation, research, or authoritative claims</li>
              <li>Exercise critical thinking and independent judgment</li>
              <li>Not share or publish conversations in a misleading manner</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Custom Requests</h2>
            <p>
              When requesting custom historical figures:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li><strong>Deceased Only:</strong> Only individuals who have passed away may be requested</li>
              <li><strong>Positive Influence:</strong> Requests must be for individuals with positive contributions</li>
              <li><strong>Donations:</strong> All fees go directly to charity (Direct Relief) and are non-refundable</li>
              <li><strong>No Guarantee:</strong> We reserve the right to decline any request</li>
              <li><strong>Research-Based:</strong> We conduct research, but the conversations remain imagined</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>VeryGoodMelon.Fun provides this service &quot;as is&quot; without warranties</li>
              <li>We are not liable for decisions made based on these imagined conversations</li>
              <li>We are not responsible for emotional distress, offense, or harm from invented replies</li>
              <li>Users assume all risks associated with using this entertainment service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Intellectual Property</h2>
            <p>
              This service respects intellectual property rights:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>We focus on deceased individuals to avoid personality rights issues</li>
              <li>Historical figures and their documented words are in the public domain or used for educational purposes</li>
              <li>Conversation content is for personal use only</li>
              <li>Do not commercialize or redistribute these conversations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Privacy and Data</h2>
            <p>
              Conversations are processed to provide the service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Conversations may be stored temporarily for service functionality</li>
              <li>We do not sell or share personal conversation data</li>
              <li>Messages are processed by third-party text services, under their privacy policies, to write replies</li>
              <li>Do not share sensitive personal information in conversations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Changes to Service</h2>
            <p>
              We reserve the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Modify, suspend, or discontinue the service at any time</li>
              <li>Update this disclaimer without prior notice</li>
              <li>Remove any historical figures from the collection</li>
              <li>Change pricing, features, or functionality</li>
            </ul>
          </section>

          </div>
        </details>

        <section className="border-t border-card-border pt-6">
          <h2 className="text-xl font-semibold mb-2 text-foreground">Questions</h2>
          <p>
            Write to{' '}
            <a href="mailto:hello@verygoodmelon.fun" className="text-foreground font-medium underline">
              hello@verygoodmelon.fun
            </a>
            . Last updated November 21, 2026.
          </p>
        </section>

        <div className="text-center pt-2">
          <Link
            href="/games/ancient-voices"
            className="inline-block px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Return to The Sage
          </Link>
        </div>
      </div>
    </div>
  )
}
