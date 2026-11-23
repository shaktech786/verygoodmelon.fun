'use client'

import { useId, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { CARE_GAMES } from '@/components/games/CrossGameSuggestions'
import { CommunityWordCloud } from '@/components/games/CommunityWordCloud'
import { clearDraft, readDraft, saveDraft } from '@/lib/games/community-words/draft'
import { MAX_SUBMISSION_LENGTH } from '@/lib/games/community-words/moderation'
import type { CloudState } from '@/lib/games/community-words/useCommunityWords'

const KEYBOARD_SETTLE_MS = 350

/**
 * For a heading or line that only code moves focus to, so screen readers follow
 * the change. The site's red focus ring would read as an error on text that
 * cannot be acted on; real controls keep it.
 */
export const FOCUS_TARGET = { tabIndex: -1, style: { outline: 'none', boxShadow: 'none' } } as const

const subscribeToNothing = () => () => {}

interface WritingFormProps {
  prompts: readonly string[]
  /** Accessible name of the text box; also shown above it. */
  label: string
  placeholder: string
  submitLabel: string
  /** Receives the words and the question that was showing as they were sent. */
  onSubmit: (words: string, prompt: string) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  /** Where the unsent words wait if the page reloads. */
  draftKey: string
}

/**
 * The text box, a question to start from that changes only when asked, and the
 * button to send. On phones the on-screen keyboard covers the lower half of the
 * page, so once it opens the send button is brought back into view.
 */
export function WritingForm({ prompts, label, placeholder, submitLabel, onSubmit, textareaRef, draftKey }: WritingFormProps) {
  // Read after hydration, so the server's empty box and the browser's saved draft never disagree
  const savedDraft = useSyncExternalStore(subscribeToNothing, () => readDraft(draftKey), () => '')
  const [typed, setTyped] = useState<string | null>(null)
  const input = typed ?? savedDraft
  const [promptIndex, setPromptIndex] = useState(0)
  const endOfForm = useRef<HTMLDivElement>(null)
  const textareaId = useId()

  const canSend = input.trim().length > 0 && input.length <= MAX_SUBMISSION_LENGTH

  const send = (event: FormEvent | KeyboardEvent) => {
    event.preventDefault()
    if (!canSend) return
    clearDraft(draftKey)
    onSubmit(input, prompts[promptIndex])
  }

  const write = (text: string) => {
    setTyped(text)
    saveDraft(draftKey, text)
  }

  const keepSendInView = () => {
    const viewport = window.visualViewport
    if (!viewport) return
    const reveal = () => endOfForm.current?.scrollIntoView({ block: 'nearest' })
    viewport.addEventListener('resize', reveal, { once: true })
    setTimeout(() => viewport.removeEventListener('resize', reveal), KEYBOARD_SETTLE_MS * 3)
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <div className="flex items-start justify-between gap-3 rounded-lg bg-foreground/[0.04] px-4 py-3">
        <p className="text-sm sm:text-base text-foreground/80 italic" aria-live="polite">
          {prompts[promptIndex]}
        </p>
        <button
          type="button"
          onClick={() => setPromptIndex((i) => (i + 1) % prompts.length)}
          className="shrink-0 text-xs sm:text-sm text-primary-light underline underline-offset-4 decoration-foreground/30 hover:text-foreground rounded px-1 -mx-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Another question
        </button>
      </div>

      <label className="sr-only" htmlFor={textareaId}>{label}</label>
      <textarea
        id={textareaId}
        ref={textareaRef}
        value={input}
        onChange={(e) => write(e.target.value)}
        onFocus={keepSendInView}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send(e)
        }}
        placeholder={placeholder}
        maxLength={MAX_SUBMISSION_LENGTH}
        rows={4}
        className="w-full min-h-[7.5rem] sm:min-h-[9rem] px-4 py-3 border border-card-border rounded-lg bg-background text-foreground text-base sm:text-lg leading-relaxed resize-y placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-focus-ring"
      />
      <div className="flex justify-between items-center text-xs sm:text-sm text-primary-light">
        <span className="hidden sm:inline">Ctrl or ⌘ + Enter to send</span>
        <span className="ml-auto">{input.length}/{MAX_SUBMISSION_LENGTH} characters</span>
      </div>

      <Button type="submit" disabled={!canSend} variant="primary" className="w-full py-3 text-lg">
        {submitLabel}
      </Button>
      <div ref={endOfForm} />
    </form>
  )
}

const HELPLINE_LINK = 'font-medium text-foreground underline underline-offset-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

/**
 * For when no one could tell whether the words carry danger: support within
 * reach, said softly enough that it never reads as an accusation.
 */
export function QuietSupport() {
  return (
    <p className="text-center text-sm text-foreground/80 leading-relaxed">
      If any of this is close to home, there are people to talk to at any hour: call or text{' '}
      <a href="tel:988" className={HELPLINE_LINK}>988</a> in the US, call{' '}
      <a href="tel:116123" className={HELPLINE_LINK}>116 123</a> in the UK and Ireland, or find a line near you at{' '}
      <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className={HELPLINE_LINK}>
        findahelpline.com
      </a>
      .
    </p>
  )
}

/** Shown whenever the words sound like more than an imagined ending. */
export function CarePanel() {
  return (
    <aside
      aria-label="Support"
      className="rounded-lg border border-card-border border-l-4 border-l-[var(--melon-green)] bg-card-bg p-5 text-left text-foreground leading-relaxed"
    >
      <p>
        If these words are closer to home than an imagined ending, you don&apos;t have to hold them alone.
      </p>
      <p className="mt-2 text-sm text-foreground/80">
        Free, confidential support at any hour:{' '}
        <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className={HELPLINE_LINK}>
          findahelpline.com
        </a>{' '}
        lists lines in most countries. In the US, call or text <a href="tel:988" className={HELPLINE_LINK}>988</a>. In the UK
        and Ireland, call <a href="tel:116123" className={HELPLINE_LINK}>116 123</a>.
      </p>
    </aside>
  )
}

/** In place of writing again, while the words are not known to be safe: somewhere calm to go next. */
export function GentleExit() {
  return (
    <nav aria-label="Somewhere calm to go next" className="text-center">
      <p className="text-foreground/85">When you are ready, somewhere calm:</p>
      <ul className="mt-3 flex flex-wrap justify-center gap-3">
        {CARE_GAMES.map((game) => (
          <li key={game.id}>
            <Link
              href={`/games/${game.slug}`}
              className="inline-flex items-center min-h-11 px-5 rounded-lg border border-card-border bg-card-bg text-foreground font-medium hover:bg-hover-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {game.title}: {game.description}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

interface CloudSectionProps {
  cloud: CloudState
  heading: string
  label: string
  /** "From 120 people" style line, given the number of submissions. */
  source: (total: number) => string
}

/** Others' words, drawn only once they have actually arrived. */
export function CloudSection({ cloud, heading, label, source }: CloudSectionProps) {
  const headingId = useId()
  if (cloud.status !== 'ready' || cloud.words.length === 0) return null
  return (
    <section aria-labelledby={headingId} className="bg-card-bg border border-card-border rounded-lg p-4 sm:p-6">
      <h3 id={headingId} className="text-lg sm:text-xl font-semibold text-center text-foreground">
        {heading}
      </h3>
      <CommunityWordCloud words={cloud.words} label={label} />
      <p className="mt-2 text-center text-sm text-primary-light">
        The more people who wrote a word, the larger it appears. {source(cloud.total)}
      </p>
    </section>
  )
}

interface CopyWordsButtonProps {
  words: string
  label: string
  /** Announced once the words are on the clipboard. */
  copiedMessage: string
}

/** Copies the player's own words so they can keep them or send them to someone. */
export function CopyWordsButton({ words, label, copiedMessage }: CopyWordsButtonProps) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(words)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <>
      <Button type="button" variant="secondary" onClick={copy}>
        {copied ? 'Copied' : label}
      </Button>
      <span className="sr-only" aria-live="polite">{copied ? copiedMessage : ''}</span>
    </>
  )
}
