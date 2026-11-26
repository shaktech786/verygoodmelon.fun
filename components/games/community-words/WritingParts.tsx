'use client'

import { useId, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { OwnSupportMark } from '@/components/games/OwnSupport'
import { CareBlock } from '@/components/seedpress/CareBlock'
import { Go } from '@/components/seedpress/Go'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { Stamp } from '@/components/seedpress/Stamp'
import { StickyTray } from '@/components/seedpress/StickyTray'
import { WritingSlip } from '@/components/seedpress/WritingSlip'
import { DIRECTORY_LINE, UK_IE_LINE, US_LINE } from '@/lib/care/helplines'
import { CARE_GAMES } from '@/components/games/CrossGameSuggestions'
import { CommunityWordCloud } from '@/components/games/CommunityWordCloud'
import { clearDraft, readDraft, saveDraft } from '@/lib/games/community-words/draft'
import { MAX_SUBMISSION_LENGTH } from '@/lib/games/community-words/moderation'
import type { CloudState } from '@/lib/games/community-words/useCommunityWords'

const KEYBOARD_SETTLE_MS = 350

/**
 * For a heading or line that only code moves focus to, so screen readers follow
 * the change. The focus ring would read as an error on text that cannot be
 * acted on; real controls keep it.
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
 * The writing slip, a question to start from that changes only when asked, and the
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
    <form onSubmit={send} className="sp-form">
      <div className="sp-asks">
        <p className="sp-asks__line" aria-live="polite">
          {prompts[promptIndex]}
        </p>
        <QuietButton onClick={() => setPromptIndex((i) => (i + 1) % prompts.length)}>Another question</QuietButton>
      </div>

      <WritingSlip
        label={label}
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
        note={
          <>
            <span className="hidden sm:inline">Ctrl or ⌘ + Enter to send</span>
            <span className="ml-auto">{input.length}/{MAX_SUBMISSION_LENGTH} characters</span>
          </>
        }
      />

      <StickyTray ref={endOfForm}>
        <Go type="submit" unavailable={canSend ? undefined : 'Write a few words first.'}>
          {submitLabel}
        </Go>
      </StickyTray>
    </form>
  )
}

/**
 * For when no one could tell whether the words carry danger: support within
 * reach, said softly enough that it never reads as an accusation.
 */
export function QuietSupport() {
  return (
    <p className="sp-quiet-support">
      If any of this is close to home, there are people to talk to at any hour: call or text{' '}
      <a href={US_LINE.href} className="sp-link">{US_LINE.label}</a> in the {US_LINE.region}, call{' '}
      <a href={UK_IE_LINE.href} className="sp-link">{UK_IE_LINE.label}</a> in the {UK_IE_LINE.region}, or find a line near you at{' '}
      <a href={DIRECTORY_LINE.href} target="_blank" rel="noopener noreferrer" className="sp-link">
        {DIRECTORY_LINE.label}
      <span className="sr-only"> (opens in a new tab)</span></a>
      .
    </p>
  )
}

/** Shown whenever the words sound like more than an imagined ending. */
export function CarePanel() {
  return (
    <>
      <OwnSupportMark />
      <CareBlock lead="If these words are closer to home than an imagined ending, you don't have to hold them alone." />
    </>
  )
}

/** In place of writing again, while the words are not known to be safe: somewhere calm to go next. */
export function GentleExit() {
  return (
    <nav aria-label="Somewhere calm to go next" className="sp-gentle-exit">
      <p>When you are ready, somewhere calm:</p>
      <ul className="sp-gentle-exit__list">
        {CARE_GAMES.map((game) => (
          <li key={game.id}>
            <Stamp href={`/games/${game.slug}`}>
              {game.title}: {game.description}
            </Stamp>
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
}

/** Others' words, drawn only once they have actually arrived. */
export function CloudSection({ cloud, heading, label }: CloudSectionProps) {
  const headingId = useId()
  if (cloud.status !== 'ready' || cloud.words.length === 0) return null
  return (
    <section aria-labelledby={headingId} className="sp-sheet sp-cloud">
      <h3 id={headingId} className="sp-h3">
        {heading}
      </h3>
      <CommunityWordCloud words={cloud.words} label={label} />
      <p className="sp-soft">The more people who wrote a word, the larger it appears.</p>
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
      <Stamp icon="copy" onClick={copy}>
        {copied ? 'Copied' : label}
      </Stamp>
      <span className="sr-only" aria-live="polite">{copied ? copiedMessage : ''}</span>
    </>
  )
}
