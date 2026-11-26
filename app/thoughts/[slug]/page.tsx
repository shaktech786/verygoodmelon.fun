import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { THEME_LABELS, THOUGHTS, getThoughtBySlug, getRelatedThought } from '@/lib/thoughts/thoughts-data'
import { Prose, ProseSection } from '@/components/seedpress/Prose'
import { Stamp } from '@/components/seedpress/Stamp'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return THOUGHTS.map((t) => ({ slug: t.slug }))
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const thought = getThoughtBySlug(slug)
  if (!thought) return {}

  const description = thought.body.split('\n\n')[0].slice(0, 160)

  return {
    title: `${thought.title} - Thoughts - VeryGoodMelon.Fun`,
    description,
    openGraph: {
      title: thought.title,
      description,
      url: `https://verygoodmelon.fun/thoughts/${thought.slug}`,
      type: 'article',
      publishedTime: thought.createdAt,
    },
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ThoughtPage({ params }: PageProps) {
  const { slug } = await params
  const thought = getThoughtBySlug(slug)
  if (!thought) notFound()

  const related = getRelatedThought(thought)

  // Split body into paragraphs for rendering
  const paragraphs = thought.body.split('\n\n').filter(Boolean)

  return (
    <Prose
      title={thought.title}
      meta={
        <>
          {THEME_LABELS[thought.theme]} &middot; <time dateTime={thought.createdAt}>{formatDate(thought.createdAt)}</time>
        </>
      }
    >
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}

      {related && (
        <ProseSection id="keep-reading" title="Keep reading">
          <Link href={`/thoughts/${related.slug}`} className="sp-flap">
            <span className="sp-flap__top">
              <span>{THEME_LABELS[related.theme]}</span>
            </span>
            <span className="sp-flap__body">
              <span className="sp-flap__title">{related.title}</span>
            </span>
          </Link>
        </ProseSection>
      )}

      <p className="sp-prose__actions sp-prose__row">
        <Stamp href="/thoughts" icon="back">
          All thoughts
        </Stamp>
        <Stamp href="/">Home</Stamp>
      </p>
    </Prose>
  )
}
