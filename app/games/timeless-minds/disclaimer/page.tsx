import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Legal Disclaimer - Timeless Minds',
  description: 'Important legal information about the Timeless Minds AI experience',
}

export default function DisclaimerPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <Link
        href="/games/timeless-minds"
        className="inline-flex items-center gap-2 text-accent hover:underline mb-6"
      >
        <ArrowLeft size={16} />
        Back to Timeless Minds
      </Link>

      <h1 className="text-4xl font-semibold mb-4">Legal Disclaimer</h1>
      <p className="text-foreground/70 mb-8">Last Updated: November 5, 2024</p>

      <div className="prose prose-slate max-w-none space-y-6">
        <section className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <h2 className="text-xl font-semibold mb-2 text-foreground">⚠️ Important Notice</h2>
          <p className="text-foreground/80">
            Timeless Minds is an <strong>AI-powered simulation</strong> created solely for entertainment,
            education, and personal growth purposes. These are <strong>NOT real conversations</strong> with
            deceased individuals.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Nature of the Experience</h2>
          <p>
            Timeless Minds uses artificial intelligence (AI) to generate conversations based on:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>Historical records and biographical information</li>
            <li>Published writings, speeches, and documented beliefs</li>
            <li>Research into speaking styles and philosophical frameworks</li>
            <li>AI interpretation and creative generation</li>
          </ul>
          <p className="mt-3">
            <strong>These conversations are simulations, not communications with actual deceased persons.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. No Endorsement or Representation</h2>
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
          <h2 className="text-2xl font-semibold mb-3">3. Intended Use</h2>
          <p>
            Timeless Minds is intended exclusively for:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li><strong>Entertainment:</strong> Creative and engaging AI interactions</li>
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
          <h2 className="text-2xl font-semibold mb-3">4. Accuracy and Reliability</h2>
          <p>
            <strong>No Guarantee of Accuracy:</strong> While we strive for historical and philosophical
            accuracy in our research, AI-generated responses:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>May contain errors, inaccuracies, or anachronisms</li>
            <li>Are interpretations, not verified statements</li>
            <li>Should not be relied upon as factual or authoritative</li>
            <li>May reflect AI limitations and biases</li>
          </ul>
          <p className="mt-3 font-semibold">
            Always verify important information through credible, independent sources.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. User Responsibilities</h2>
          <p>By using Timeless Minds, you agree to:</p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>Use the service for lawful, positive purposes only</li>
            <li>Not misrepresent AI responses as real communications from deceased individuals</li>
            <li>Not use responses for academic citation, research, or authoritative claims</li>
            <li>Exercise critical thinking and independent judgment</li>
            <li>Not share or publish conversations in a misleading manner</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Custom Requests</h2>
          <p>
            When requesting custom historical figures:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li><strong>Deceased Only:</strong> Only individuals who have passed away may be requested</li>
            <li><strong>Positive Influence:</strong> Requests must be for individuals with positive contributions</li>
            <li><strong>Donations:</strong> All fees go directly to charity (Direct Relief) and are non-refundable</li>
            <li><strong>No Guarantee:</strong> We reserve the right to decline any request</li>
            <li><strong>Research-Based:</strong> We conduct research but results are still AI simulations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>VeryGoodMelon.Fun provides this service &quot;as is&quot; without warranties</li>
            <li>We are not liable for decisions made based on AI-generated conversations</li>
            <li>We are not responsible for emotional distress, offense, or harm from AI responses</li>
            <li>Users assume all risks associated with using this entertainment service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Intellectual Property</h2>
          <p>
            This service respects intellectual property rights:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>We focus on deceased individuals to avoid personality rights issues</li>
            <li>Historical figures and their documented words are in the public domain or used for educational purposes</li>
            <li>AI-generated content is for personal use only</li>
            <li>Do not commercialize or redistribute AI conversations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Privacy and Data</h2>
          <p>
            Conversations are processed to provide the service:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>Conversations may be stored temporarily for service functionality</li>
            <li>We do not sell or share personal conversation data</li>
            <li>AI providers may process data according to their privacy policies</li>
            <li>Do not share sensitive personal information in conversations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Changes to Service</h2>
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

        <section className="bg-accent/5 border-l-4 border-accent p-4">
          <h2 className="text-xl font-semibold mb-2">Contact</h2>
          <p className="text-foreground/80">
            Questions about this disclaimer? Contact us at{' '}
            <a href="mailto:hello@verygoodmelon.fun" className="text-accent hover:underline">
              hello@verygoodmelon.fun
            </a>
          </p>
        </section>

        <section className="text-center pt-6 border-t">
          <p className="text-sm text-foreground/60">
            By using Timeless Minds, you acknowledge that you have read, understood, and agree to this disclaimer.
          </p>
          <Link
            href="/games/timeless-minds"
            className="inline-block mt-4 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            Return to Timeless Minds
          </Link>
        </section>
      </div>
    </div>
  )
}
