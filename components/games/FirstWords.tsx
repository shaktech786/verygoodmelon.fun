'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/Button'

// Dynamically import WordCloud to avoid SSR issues
const WordCloud = dynamic(
  () => import('@isoterik/react-word-cloud').then((mod) => mod.WordCloud),
  {
    ssr: false,
    loading: () => <div className="text-center text-purple-400/60 py-12">Gathering the whispers...</div>
  }
)

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

interface WordFrequency {
  word: string
  count: number
}

export default function FirstWords() {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [wordCloud, setWordCloud] = useState<WordFrequency[]>([])
  const [totalSubmissions, setTotalSubmissions] = useState(0)
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const supabase = createClient()

  // Rotate prompts slowly for ethereal feel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromptIndex(prev => (prev + 1) % AWAKENING_PROMPTS.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  // Load word cloud data
  useEffect(() => {
    if (submitted) {
      loadWordCloud()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted])

  const loadWordCloud = async () => {
    try {
      // Fetch all first words
      const { data, error } = await supabase
        .from('first_words')
        .select('words')
        .order('created_at', { ascending: false })
        .limit(1000) // Get recent 1000 submissions

      if (error) throw error

      if (data) {
        setTotalSubmissions(data.length)

        // Process words to create frequency map
        const wordFreq = new Map<string, number>()

        data.forEach((submission: { words: string }) => {
          // Split into words, normalize, and count
          const words = submission.words
            .toLowerCase()
            .replace(/[^\w\s']/g, '') // Keep apostrophes for contractions
            .split(/\s+/)
            .filter(word => word.length > 2) // Filter out very short words

          words.forEach(word => {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
          })
        })

        // Convert to array and sort by frequency
        const sortedWords = Array.from(wordFreq.entries())
          .map(([word, count]) => ({ word, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 50) // Top 50 words

        setWordCloud(sortedWords)
      }
    } catch (error) {
      console.error('Error loading word cloud:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || input.length > 500) {
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('first_words')
        .insert([{ words: input.trim() }])

      if (error) throw error

      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting first words:', error)
      alert('Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        {/* Thank you message */}
        <div className="bg-gradient-to-b from-purple-950/30 to-card-bg border border-purple-500/20 rounded-lg p-6 text-center relative overflow-hidden">
          {/* Ethereal glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-purple-500/5" />
          <div className="relative">
            <div className="text-3xl mb-3" aria-hidden="true">🌟</div>
            <h2 className="text-2xl font-semibold mb-2 text-foreground">
              You&apos;ve arrived
            </h2>
            <p className="text-purple-300/70">
              Your voice echoes with {totalSubmissions.toLocaleString()} other souls
            </p>
          </div>
        </div>

        {/* Word Cloud */}
        <div className="bg-gradient-to-b from-card-bg to-purple-950/10 border border-purple-500/10 rounded-lg p-8">
          <h3 className="text-xl font-semibold mb-6 text-center text-foreground">
            What Awaits Us All
          </h3>

          {wordCloud.length > 0 ? (
            <div className="min-h-[400px] w-full flex items-center justify-center">
              <WordCloud
                words={wordCloud.map(({ word, count }) => ({
                  text: word,
                  value: count
                }))}
                width={800}
                height={400}
              />
            </div>
          ) : (
            <div className="text-center text-purple-400/60 py-12">
              Gathering the whispers...
            </div>
          )}

          <div className="mt-6 text-center text-sm text-purple-300/50">
            <p>The most spoken words glow brightest</p>
            <p className="mt-1">
              From {totalSubmissions.toLocaleString()} {totalSubmissions === 1 ? 'awakening' : 'awakenings'}
            </p>
          </div>
        </div>

        {/* Share another */}
        <div className="text-center">
          <button
            onClick={() => {
              setSubmitted(false)
              setInput('')
              setCurrentPromptIndex(0)
            }}
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
      <div className="bg-gradient-to-b from-purple-950/20 to-card-bg border border-purple-500/20 rounded-lg p-6 sm:p-8 relative overflow-hidden">
        {/* Ethereal glow effects */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />

        <div className="relative mb-6 text-center">
          <div className="text-4xl mb-4" aria-hidden="true">✨</div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-foreground">
            You&apos;ve crossed over...
          </h2>
          <p className="text-purple-300/70 text-sm sm:text-base">
            The journey is complete. What greets you on the other side?
          </p>
          <p className="text-purple-400/50 text-xs sm:text-sm mt-2 italic">
            Heaven, rebirth, starlight, peace... whatever you believe awaits
          </p>
        </div>

        {/* Contemplative prompt */}
        <div className="relative mb-4 p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg text-center">
          <p className="text-sm text-purple-400/80 italic transition-opacity duration-700" key={currentPromptIndex}>
            ✦ {AWAKENING_PROMPTS[currentPromptIndex]}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-4">
          <div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit(e as unknown as React.FormEvent)
                }
              }}
              placeholder="What do you say? What do you see? What do you feel?"
              className="
                w-full min-h-[150px] px-4 py-3
                border border-purple-500/20 rounded-lg
                bg-purple-950/10 text-foreground
                focus:outline-none focus:ring-2 focus:ring-purple-500/50
                resize-vertical
                text-base sm:text-lg
                placeholder:text-purple-300/30
              "
              maxLength={500}
              disabled={loading}
              aria-label="Enter your first words after crossing over"
            />
            <div className="mt-2 flex justify-between items-center text-sm text-purple-300/50">
              <span className="text-xs">Cmd/Ctrl + Enter to submit</span>
              <span>{input.length}/500 characters</span>
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

        <div className="relative mt-6 text-center text-sm text-purple-400/40">
          <p>Join the chorus of souls. Anonymous. Timeless.</p>
        </div>
      </div>
    </div>
  )
}
