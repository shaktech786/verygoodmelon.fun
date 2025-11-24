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
    loading: () => <div className="text-center text-primary-light py-12">Loading word cloud...</div>
  }
)

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
  const supabase = createClient()

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
        <div className="bg-card-bg border border-purple-600/20 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-semibold mb-2 text-foreground">
            You&apos;ve crossed over
          </h2>
          <p className="text-primary-light">
            Your awakening has been shared with {totalSubmissions.toLocaleString()} other souls
          </p>
        </div>

        {/* Word Cloud */}
        <div className="bg-card-bg border border-card-border rounded-lg p-8">
          <h3 className="text-xl font-semibold mb-6 text-center text-foreground">
            Humanity&apos;s First Breath
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
            <div className="text-center text-primary-light py-12">
              Loading word cloud...
            </div>
          )}

          <div className="mt-6 text-center text-sm text-primary-light">
            <p>Larger words appear more frequently</p>
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
            }}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Cross Over Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card-bg border border-purple-600/20 rounded-lg p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-foreground">
            You&apos;ve just crossed over...
          </h2>
          <p className="text-primary-light text-sm sm:text-base">
            What are your first words? What do you say? What do you think?
          </p>
          <p className="text-primary-light/60 text-xs sm:text-sm mt-2 italic">
            Heaven, reincarnation, nothingness, peace... whatever you believe
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Your first words after crossing over..."
              className="
                w-full min-h-[150px] px-4 py-3
                border border-purple-600/20 rounded-lg
                bg-card-bg text-foreground
                focus:outline-none focus:ring-2 focus:ring-purple-600
                resize-vertical
                text-base sm:text-lg
              "
              maxLength={500}
              disabled={loading}
              aria-label="Enter your first words after crossing over"
            />
            <div className="mt-2 flex justify-between items-center text-sm text-primary-light">
              <span className="text-xs">Cmd/Ctrl + Enter to submit</span>
              <span>{input.length}/500 characters</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !input.trim() || input.length > 500}
            variant="primary"
            className="w-full px-6 py-3 font-medium text-lg bg-purple-600 hover:bg-purple-700"
          >
            {loading ? 'Crossing over...' : 'Share Your Awakening'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-primary-light">
          <p>Your words will be anonymous and contribute to a collective word cloud</p>
        </div>
      </div>
    </div>
  )
}
