'use client'

import { useId, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { Button } from '@/components/ui/Button'
import { CommunityWordCloud } from '@/components/games/CommunityWordCloud'
import { MAX_SUBMISSION_LENGTH } from '@/lib/games/community-words/moderation'
import type { CloudState } from '@/lib/games/community-words/useCommunityWords'

const KEYBOARD_SETTLE_MS = 350

interface WritingFormProps {
  prompts: readonly string[]
  /** Accessible name of the text box; also shown above it. */
  label: string
  placeholder: string
  submitLabel: string
  onSubmit: (words: string) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

/**
 * The text box, a question to start from that changes only when asked, and the
 * button to send. On phones the on-screen keyboard covers the lower half of the
 * page, so once it opens the send button is brought back into view.
 */
export function WritingForm({ prompts, label, placeholder, submitLabel, onSubmit, textareaRef }: WritingFormProps) {
  const [input, setInput] = useState('')
  const [promptIndex, setPromptIndex] = useState(0)
  const endOfForm = useRef<HTMLDivElement>(null)
  const textareaId = useId()

  const canSend = input.trim().length > 0 && input.length <= MAX_SUBMISSION_LENGTH

  const send = (event: FormEvent | KeyboardEvent) => {
    event.preventDefault()
    if (canSend) onSubmit(input)
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
          className="shrink-0 text-xs sm:text-sm text-primary-light underline underline-offset-4 decoration-foreground/30 hover:text-foreground rounded px-1 -mx-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Another question
        </button>
      </div>

      <label className="sr-only" htmlFor={textareaId}>{label}</label>
      <textarea
        id={textareaId}
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={keepSendInView}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send(e)
        }}
        placeholder={placeholder}
        maxLength={MAX_SUBMISSION_LENGTH}
        rows={4}
        className="w-full min-h-[7.5rem] sm:min-h-[9rem] px-4 py-3 border border-card-border rounded-lg bg-background text-foreground text-base sm:text-lg leading-relaxed resize-y placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent"
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

/** Shown whenever the words sound like more than an imagined ending. */
export function CarePanel() {
  const link = 'font-medium text-foreground underline underline-offset-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
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
        <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className={link}>
          findahelpline.com
        </a>{' '}
        lists lines in most countries. In the US, call or text <a href="tel:988" className={link}>988</a>. In the UK
        and Ireland, call <a href="tel:116123" className={link}>116 123</a>.
      </p>
    </aside>
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

/** Copies the player's own words so they can send them to someone. */
export function CopyWordsButton({ words }: { words: string }) {
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
        {copied ? 'Copied' : 'Copy my words'}
      </Button>
      <span className="sr-only" aria-live="polite">{copied ? 'Your words are copied, ready to send.' : ''}</span>
    </>
  )
}
