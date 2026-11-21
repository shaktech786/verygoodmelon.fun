'use client'

import { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { WordFrequency } from '@/lib/games/wordFrequency'

const WordCloud = dynamic(
  () => import('@isoterik/react-word-cloud').then((mod) => mod.WordCloud),
  { ssr: false }
)

const MAX_WIDTH = 800
const NARROW_WIDTH = 480
const MIN_FONT_SIZE = 14
const SPOKEN_WORD_COUNT = 10
const FILLS = ['var(--foreground)', 'var(--accent)', 'var(--melon-green)', 'var(--primary-light)']

const upright = () => 0
const fillByRank = (_: unknown, index: number) => FILLS[index % FILLS.length]

interface CommunityWordCloudProps {
  words: WordFrequency[]
  /** Read to screen-reader users, followed by the most common words. */
  label: string
}

export function CommunityWordCloud({ words, label }: CommunityWordCloudProps) {
  const [width, setWidth] = useState(0)
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (node) setWidth(Math.min(node.clientWidth, MAX_WIDTH))
  }, [])

  const isNarrow = width < NARROW_WIDTH
  const height = isNarrow ? 280 : 400
  const maxFontSize = isNarrow ? 34 : 56

  const cloudWords = useMemo(
    () => words.map(({ word, count }) => ({ text: word, value: count })),
    [words]
  )

  const fontSize = useMemo(() => {
    const counts = words.map((w) => w.count)
    const least = Math.min(...counts)
    const most = Math.max(...counts)
    return ({ value }: { value: number }) => {
      const weight = most === least ? 0.5 : Math.sqrt((value - least) / (most - least))
      return MIN_FONT_SIZE + (maxFontSize - MIN_FONT_SIZE) * weight
    }
  }, [words, maxFontSize])

  const svgProps = useMemo(
    () => ({
      role: 'img',
      'aria-label': `${label}: ${words.slice(0, SPOKEN_WORD_COUNT).map((w) => w.word).join(', ')}`,
      style: { maxWidth: '100%', height: 'auto' },
    }),
    [label, words]
  )

  return (
    <div ref={measure} className="w-full flex items-center justify-center" style={{ minHeight: height }}>
      {width > 0 && (
        <WordCloud
          words={cloudWords}
          width={width}
          height={height}
          font="system-ui, sans-serif"
          fontWeight={600}
          fontSize={fontSize}
          rotate={upright}
          fill={fillByRank}
          padding={3}
          svgProps={svgProps}
        />
      )}
    </div>
  )
}
