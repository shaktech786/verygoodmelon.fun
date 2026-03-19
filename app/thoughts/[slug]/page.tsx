import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { THOUGHTS, getThoughtBySlug, getRelatedThought } from '@/lib/thoughts/thoughts-data'

const THEME_LABELS: Record<string, string> = {
  patience: 'Patience',
  wonder: 'Wonder',
  impermanence: 'Impermanence',
  creativity: 'Creativity',
  rest: 'Rest',
  connection: 'Connection',
  perspective: 'Perspective',
}

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
    <div className="container mx-auto px-6 py-12 max-w-[640px]">
      <div className="animate-fade">
        {/* Back link */}
        <Link
          href="/thoughts"
          className="inline-flex items-center gap-2 text-primary-light hover:text-foreground transition-colors text-sm mb-8"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          All thoughts
        </Link>

        <article aria-labelledby="thought-title">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-4 text-sm">
            <span className="inline-block bg-accent/10 text-accent px-2.5 py-0.5 rounded-full text-xs font-medium">
              {THEME_LABELS[thought.theme]}
            </span>
            <time dateTime={thought.createdAt} className="text-primary-light/60">
              {formatDate(thought.createdAt)}
            </time>
          </div>

          {/* Title */}
          <h1
            id="thought-title"
            className="text-3xl md:text-4xl font-semibold text-foreground mb-8"
          >
            {thought.title}
          </h1>

          {/* Body */}
          <div className="space-y-6">
            {paragraphs.map((paragraph, i) => (
              <p
                key={i}
                className="text-foreground/80 text-base md:text-lg leading-[1.8]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        {/* Related thought */}
        {related && (
          <div className="mt-16 pt-8 border-t border-card-border">
            <p className="text-primary-light/60 text-xs uppercase tracking-widest mb-4">
              Keep reading
            </p>
            <Link
              href={`/thoughts/${related.slug}`}
              className="block bg-card-bg border border-card-border rounded-lg p-5 hover:border-accent/30 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            >
              <span className="inline-block bg-accent/10 text-accent px-2 py-0.5 rounded-full text-xs font-medium mb-2">
                {THEME_LABELS[related.theme]}
              </span>
              <h2 className="text-foreground font-semibold">{related.title}</h2>
            </Link>
          </div>
        )}

        {/* Bottom nav */}
        <div className="mt-12 pt-8 border-t border-card-border flex justify-between items-center">
          <Link
            href="/thoughts"
            className="inline-flex items-center gap-2 text-primary-light hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            All thoughts
          </Link>
          <Link
            href="/"
            className="text-primary-light hover:text-foreground transition-colors text-sm"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
