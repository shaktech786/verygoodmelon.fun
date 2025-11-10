'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

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

export default function LastWords() {
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
      // Fetch all last words
      const { data, error } = await supabase
        .from('last_words')
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
        .from('last_words')
        .insert([{ words: input.trim() }])

      if (error) throw error

      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting last words:', error)
      alert('Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        {/* Thank you message */}
        <div className="bg-card-bg border border-card-border rounded-lg p-6 text-center">
          <h2 className="text-2xl font-semibold mb-2 text-foreground">
            Thank you for sharing
          </h2>
          <p className="text-primary-light">
            Your words have been added to {totalSubmissions.toLocaleString()} other voices
          </p>
        </div>

        {/* Word Cloud */}
        <div className="bg-card-bg border border-card-border rounded-lg p-8">
          <h3 className="text-xl font-semibold mb-6 text-center text-foreground">
            What Matters Most to Humanity
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
              From {totalSubmissions.toLocaleString()} {totalSubmissions === 1 ? 'submission' : 'submissions'}
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
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Reflect Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card-bg border border-card-border rounded-lg p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-foreground">
            If you could leave one final message...
          </h2>
          <p className="text-primary-light text-sm sm:text-base">
            What would you want the world to know?
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
              placeholder="Your last words..."
              className="
                w-full min-h-[150px] px-4 py-3
                border border-card-border rounded-lg
                bg-card-bg text-foreground
                focus:outline-none focus:ring-2 focus:ring-accent
                resize-vertical
                text-base sm:text-lg
              "
              maxLength={500}
              disabled={loading}
              aria-label="Enter your last words"
            />
            <div className="mt-2 flex justify-between items-center text-sm text-primary-light">
              <span className="text-xs">Cmd/Ctrl + Enter to submit</span>
              <span>{input.length}/500 characters</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !input.trim() || input.length > 500}
            className="
              w-full px-6 py-3
              bg-accent text-white rounded-lg
              font-medium text-lg
              hover:bg-accent/90
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-accent
            "
          >
            {loading ? 'Submitting...' : 'Share Your Words'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-primary-light">
          <p>Your message will be anonymous and contribute to a collective word cloud</p>
        </div>
      </div>
    </div>
  )
}
