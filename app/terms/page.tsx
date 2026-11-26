import type { Metadata } from 'next'
import { InkLink } from '@/components/seedpress/Link'
import { Prose, ProseList, ProseSection, ProseSign, Term } from '@/components/seedpress/Prose'

export const metadata: Metadata = {
  title: 'Terms of Use | VeryGoodMelon.Fun',
  description: 'The simple, human-readable terms for using VeryGoodMelon.Fun.',
}

const CONTACT_EMAIL = 'hello@verygoodmelon.fun'

export default function TermsPage() {
  return (
    <Prose
      title="Terms of Use"
      meta="Last updated: November 21, 2026"
      lead={
        <p>
          VeryGoodMelon.Fun is a free collection of thoughtful games. These terms are short on
          purpose. By using the site you agree to them. If you do not agree, please do not use the
          site.
        </p>
      }
    >
      <ProseSection id="what-this-is" title="What This Is">
        <p>
          A personal, experimental project offered for free, with no ads and no purchases. Games
          may change, break, or disappear as the project evolves. We do our best, but we cannot
          promise the site will always be available or error-free.
        </p>
      </ProseSection>

      <ProseSection id="not-professional-care" title="This Is Not Professional Care">
        <p>
          The experiences here are made to help you slow down and reflect. Some touch on heavy
          subjects such as mortality, grief, and hard choices. They are{' '}
          <Term>not therapy, medical advice, or crisis support</Term>, and nothing a character
          says should be treated as professional guidance.
        </p>
        <p>
          If you are struggling or in danger, please reach out to someone who can help right now.
          In the US and Canada you can call or text <Term>988</Term>. Elsewhere,{' '}
          <InkLink href="https://findahelpline.com">findahelpline.com</InkLink> lists free
          support in your country. If it is an emergency, contact your local emergency services.
        </p>
      </ProseSection>

      <ProseSection id="generated-content" title="Replies and Characters">
        <p>
          Some responses are written in the moment and can be wrong, incomplete, or out of
          character. Conversations with historical figures are creative simulations, not the real
          words or views of those people. Please do not rely on them for facts or for important
          decisions. The{' '}
          <InkLink href="/games/ancient-voices/disclaimer">character disclaimer</InkLink> has
          the details.
        </p>
      </ProseSection>

      <ProseSection id="your-contributions" title="What You Contribute">
        <p>
          Some games let you share words that other visitors will see. What you write remains
          yours. By submitting it, you give us permission to store it and display it on the site,
          anonymously, for as long as the site runs. You can ask us to remove it at any time.
        </p>
        <p>Please keep this a calm place. Do not submit anything that:</p>
        <ProseList>
          <li>reveals personal information about you or anyone else</li>
          <li>harasses, threatens, or demeans people</li>
          <li>is illegal, sexually explicit, or spam</li>
          <li>belongs to someone else and is not yours to share</li>
        </ProseList>
        <p>We may review, decline, or remove submissions to keep the site gentle for everyone.</p>
      </ProseSection>

      <ProseSection id="fair-use" title="Using the Site Fairly">
        <ProseList>
          <li>Do not attack, overload, or try to break the site or the services behind it.</li>
          <li>
            Do not use scripts or bots to flood submissions, votes, or conversations, or to get
            around rate limits.
          </li>
          <li>Do not use the site to make content that harms others.</li>
        </ProseList>
        <p>We may limit or block access that puts the site or its visitors at risk.</p>
      </ProseSection>


      <ProseSection id="privacy" title="Privacy">
        <p>
          We measure the site anonymously and never sell or misuse data. The full details are in
          the <InkLink href="/privacy">Privacy Policy</InkLink>, which is part of these terms.
        </p>
      </ProseSection>

      <ProseSection id="ownership" title="Ownership">
        <p>
          The games, writing, artwork, and watermelon are ours. You are welcome to play, share
          links, and post screenshots. Please do not copy the site or its games wholesale or pass
          them off as your own.
        </p>
      </ProseSection>

      <ProseSection id="age" title="Age">
        <p>
          The site is intended for people aged 13 and older. If you are under 18, please use it
          with the knowledge of a parent or guardian, since some themes are mature.
        </p>
      </ProseSection>

      <ProseSection id="no-warranty" title="No Warranty and Limited Liability">
        <p>
          The site is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
          warranties of any kind. To the fullest extent the law allows, VeryGoodMelon.Fun and its
          creator are not liable for any indirect, incidental, or consequential damages arising
          from your use of the site. Because the site is free, our total liability for any claim
          is limited to the greatest extent permitted by law. Nothing here limits rights you have
          that cannot legally be waived.
        </p>
      </ProseSection>

      <ProseSection id="changes" title="Changes">
        <p>
          We may update these terms as the site grows. The date at the top will change when we
          do. Continuing to use the site after a change means you accept the updated terms.
        </p>
      </ProseSection>

      <ProseSection id="contact" title="Contact">
        <p>
          Questions, removal requests, or concerns:{' '}
          <InkLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</InkLink>.
        </p>
      </ProseSection>

      <ProseSign>
        &ldquo;Think deeply, feel lighter.&rdquo;
      </ProseSign>
    </Prose>
  )
}
