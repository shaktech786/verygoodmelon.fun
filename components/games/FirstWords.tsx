'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { CommunityWordCloud } from '@/components/games/CommunityWordCloud'
import { countWords, type WordFrequency } from '@/lib/games/wordFrequency'

// Contemplative prompts for the afterlife reflection
const AWAKENING_PROMPTS = [
  "Do you recognize this place?",
  "Who do you hope to see?",
  "What do you feel now?",
  "Is it what you expected?",
  "What finally makes sense?",
  "What do you wish you'd known?",
  "Are you ready?",
  "What remains of you here?",
]

type CloudState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; words: WordFrequency[]; total: number }

export default function FirstWords() {
  const [input, setInput] = useState('')
  const [submittedWords, setSubmittedWords] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cloud, setCloud] = useState<CloudState>({ status: 'loading' })
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [reflection, setReflection] = useState<string | null>(null)
  const [reflectionLoading, setReflectionLoading] = useState(false)
  const [reflectionVisible, setReflectionVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const reflectionRequest = useRef(0)
  const thanksRef = useRef<HTMLHeadingElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const returningToWrite = useRef(false)
  const supabase = createClient()

  // Prompts drift while the page is idle, and hold still once the player is writing
  const isWriting = input.length > 0
  useEffect(() => {
    if (isWriting) return
    const interval = setInterval(() => {
      setCurrentPromptIndex(prev => (prev + 1) % AWAKENING_PROMPTS.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [isWriting])

  // Keep keyboard and screen-reader users oriented when the view swaps
  useEffect(() => {
    if (submittedWords !== null) {
      thanksRef.current?.focus()
    } else if (returningToWrite.current) {
      returningToWrite.current = false
      textareaRef.current?.focus()
    }
  }, [submittedWords])

  const loadWordCloud = async () => {
    setCloud({ status: 'loading' })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('first_words')
        .select('words')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error || !data) throw error

      setCloud({
        status: 'ready',
        words: countWords(data.map((submission: { words: string }) => submission.words)),
        total: data.length,
      })
    } catch {
      setCloud({ status: 'unavailable' })
    }
  }

  const fetchReflection = async (message: string) => {
    const request = ++reflectionRequest.current
    setReflectionLoading(true)
    try {
      const res = await fetch('/api/first-words/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (res.ok && request === reflectionRequest.current) {
        const data = await res.json()
        if (data.reflection) {
          setReflection(data.reflection)
          // Delay visibility for fade-in effect
          setTimeout(() => setReflectionVisible(true), 100)
        }
      }
    } catch {
      // Graceful degradation - show nothing on failure
    } finally {
      if (request === reflectionRequest.current) setReflectionLoading(false)
    }
  }

  const handleCopyReflection = async () => {
    if (!reflection) return
    try {
      await navigator.clipboard.writeText(reflection)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable - silent fail
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const words = input.trim()
    if (!words || input.length > 500 || loading) {
      return
    }

    setLoading(true)

    // The reflection never depends on the words being stored: if they can't
    // be saved, the player still gets their moment, without the shared cloud.
    let stored = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('first_words')
        .insert([{ words }])
      stored = !error
    } catch {
      stored = false
    }

    setSaved(stored)
    setSubmittedWords(words)
    setLoading(false)
    fetchReflection(words)
    // A failed save means the store is unreachable; reading it would only keep
    // a loading card on screen through several retries before it disappears.
    if (stored) {
      loadWordCloud()
    } else {
      setCloud({ status: 'unavailable' })
    }
  }

  const handleReflectAgain = () => {
    reflectionRequest.current++
    returningToWrite.current = true
    setSubmittedWords(null)
    setInput('')
    setReflection(null)
    setReflectionVisible(false)
    setReflectionLoading(false)
    setCopied(false)
  }

  if (submittedWords !== null) {
    const otherVoices = cloud.status === 'ready' && saved ? cloud.total - 1 : null

    return (
      <div className="space-y-6">
        {/* Thank you message */}
        <div className="bg-gradient-to-b from-purple-500/10 to-card-bg border border-purple-500/20 rounded-lg p-6 text-center">
          <div className="text-3xl mb-3" aria-hidden="true">🌟</div>
          <h2
            ref={thanksRef}
            tabIndex={-1}
            className="text-2xl font-semibold mb-2 text-foreground focus:outline-none"
          >
            You&apos;ve arrived
          </h2>
          <p className="text-primary-light">
            {otherVoices === null
              ? 'Rest a moment with what you said.'
              : otherVoices > 0
                ? `Your voice echoes with ${otherVoices.toLocaleString()} other ${otherVoices === 1 ? 'soul' : 'souls'}`
                : 'Yours is the first voice here.'}
          </p>
          <blockquote className="mt-4 text-foreground text-base sm:text-lg whitespace-pre-wrap break-words">
            &ldquo;{submittedWords}&rdquo;
          </blockquote>
        </div>

        {/* Reflection */}
        <div aria-live="polite">
          {reflectionLoading && (
            <div className="text-center py-4">
              <span className="text-primary-light text-sm animate-pulse">
                Contemplating your words...
              </span>
            </div>
          )}
          {reflection && (
            <div
              className={`
                bg-gradient-to-b from-purple-500/10 to-card-bg border border-purple-500/15 rounded-lg p-6
                transition-opacity duration-700 ease-out
                ${reflectionVisible ? 'opacity-100' : 'opacity-0'}
              `}
              style={{ transitionProperty: 'opacity' }}
            >
              <p className="text-foreground/80 text-center italic leading-relaxed">
                {reflection}
              </p>
              <div className="mt-3 flex justify-center">
                <button
                  onClick={handleCopyReflection}
                  aria-label={copied ? 'Copied to clipboard' : 'Copy reflection to clipboard'}
                  className="
                    text-xs text-primary-light hover:text-foreground
                    transition-colors duration-75
                    px-3 py-1 rounded
                    hover:bg-purple-500/10
                    focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2
                  "
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Word Cloud */}
        {cloud.status !== 'unavailable' && (
          <div className="bg-gradient-to-b from-card-bg to-purple-500/5 border border-purple-500/15 rounded-lg p-4 sm:p-8">
            <h3 className="text-xl font-semibold mb-6 text-center text-foreground">
              What Awaits Us All
            </h3>

            {cloud.status === 'loading' && (
              <div className="text-center text-primary-light py-12">
                Gathering the whispers...
              </div>
            )}

            {cloud.status === 'ready' && cloud.words.length === 0 && (
              <div className="text-center text-primary-light py-12">
                The first whispers are still gathering. Come back soon.
              </div>
            )}

            {cloud.status === 'ready' && cloud.words.length > 0 && (
              <>
                <CommunityWordCloud words={cloud.words} label="Most common first words" />
                <div className="mt-6 text-center text-sm text-primary-light">
                  <p>The more often a word is spoken, the larger it appears</p>
                  <p className="mt-1">
                    From {cloud.total.toLocaleString()} {cloud.total === 1 ? 'awakening' : 'awakenings'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Share another */}
        <div className="text-center">
          <button
            onClick={handleReflectAgain}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors border border-purple-500/30"
          >
            Cross Over Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-b from-purple-500/10 to-card-bg border border-purple-500/20 rounded-lg p-6 sm:p-8 relative overflow-hidden">
        {/* Ethereal glow effects */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />

        <div className="relative mb-6 text-center">
          <div className="text-4xl mb-4" aria-hidden="true">✨</div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-foreground">
            You&apos;ve crossed over...
          </h2>
          <p className="text-primary-light text-sm sm:text-base">
            The journey is complete. What greets you on the other side?
          </p>
          <p className="text-primary-light text-xs sm:text-sm mt-2 italic">
            Heaven, rebirth, starlight, peace... whatever you believe awaits
          </p>
        </div>

        {/* Contemplative prompt */}
        <div className="relative mb-4 p-3 bg-purple-500/5 border border-purple-500/15 rounded-lg text-center">
          <p className="text-sm text-primary-light italic" key={currentPromptIndex}>
            <span aria-hidden="true">✦ </span>{AWAKENING_PROMPTS[currentPromptIndex]}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-4">
          <div>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  handleSubmit(e)
                }
              }}
              placeholder="What do you say? What do you see? What do you feel?"
              className="
                w-full min-h-[150px] px-4 py-3
                border border-purple-500/30 rounded-lg
                bg-card-bg/60 text-foreground
                focus:outline-none focus:ring-2 focus:ring-purple-500/50
                resize-vertical
                text-base sm:text-lg
                placeholder:text-foreground/50
              "
              maxLength={500}
              disabled={loading}
              aria-label="Enter your first words after crossing over"
            />
            <div className="mt-2 flex justify-between items-center text-sm text-primary-light">
              <span className="text-xs hidden sm:inline">Cmd/Ctrl + Enter to submit</span>
              <span className="ml-auto">{input.length}/500 characters</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !input.trim() || input.length > 500}
            variant="primary"
            className="w-full px-6 py-3 font-medium text-lg bg-purple-600 hover:bg-purple-700 border-purple-500/30"
          >
            {loading ? 'Ascending...' : 'Share Your Vision'}
          </Button>
        </form>

        <div className="relative mt-6 text-center text-sm text-primary-light">
          <p>Join the chorus of souls. Anonymous. Timeless.</p>
        </div>
      </div>
    </div>
  )
}
