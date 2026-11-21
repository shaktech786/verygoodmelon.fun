'use client'

import { useRef, useState } from 'react'
import { useCareMode } from '@/components/games/CareMode'
import type { WordFrequency } from '@/lib/games/wordFrequency'
import { MAX_SUBMISSION_LENGTH, soundsLikeDistress } from './moderation'

export type CommunityWordsGame = 'last-words' | 'first-words'

export type CloudState =
  | { status: 'hidden' }
  | { status: 'ready'; words: WordFrequency[]; total: number }

interface Reflection {
  text: string
  pending: boolean
}

/**
 * Everything a writing game does with the player's words: shows them back at
 * once, offers them to the shared cloud through the server, and asks for a
 * reflection. Neither the cloud nor the reflection is ever waited on, so the
 * player's moment is the same whether or not the store can be reached.
 */
export function useCommunityWords(game: CommunityWordsGame) {
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [stored, setStored] = useState(false)
  const [cloud, setCloud] = useState<CloudState>({ status: 'hidden' })
  const [reflection, setReflection] = useState<Reflection>({ text: '', pending: false })
  const [care, setCare] = useState(false)
  const { enterCareMode } = useCareMode()
  const session = useRef(0)
  // A double click lands before the first click's render, so state alone cannot guard it
  const hasSubmitted = useRef(false)

  const isCurrent = (id: number) => id === session.current

  async function share(words: string, id: number) {
    try {
      const response = await fetch(`/api/${game}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words }),
      })
      const body: { stored?: boolean } = await response.json()
      if (!response.ok || body.stored !== true || !isCurrent(id)) return
      setStored(true)

      // Only read once a write has proved the store reachable
      const cloudResponse = await fetch(`/api/${game}`)
      if (!cloudResponse.ok) return
      const data: { words: WordFrequency[]; total: number } = await cloudResponse.json()
      if (isCurrent(id)) setCloud({ status: 'ready', words: data.words, total: data.total })
    } catch {
      // The moment stands on its own without the cloud
    }
  }

  async function reflect(words: string, id: number) {
    setReflection({ text: '', pending: true })
    try {
      const response = await fetch(`/api/${game}/reflect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: words }),
      })
      const data: { reflection?: string; care?: boolean } = response.ok ? await response.json() : {}
      if (!isCurrent(id)) return
      if (data.care) {
        setCare(true)
        enterCareMode()
      }
      setReflection({ text: data.reflection ?? '', pending: false })
    } catch {
      if (isCurrent(id)) setReflection({ text: '', pending: false })
    }
  }

  function submit(text: string) {
    const words = text.trim()
    if (!words || words.length > MAX_SUBMISSION_LENGTH || hasSubmitted.current) return
    hasSubmitted.current = true
    const id = ++session.current
    setSubmitted(words)
    const distressed = soundsLikeDistress(words)
    setCare(distressed)
    if (distressed) enterCareMode()
    void share(words, id)
    void reflect(words, id)
  }

  function reset() {
    session.current++
    hasSubmitted.current = false
    setSubmitted(null)
    setStored(false)
    setCloud({ status: 'hidden' })
    setReflection({ text: '', pending: false })
    setCare(false)
  }

  return { submitted, stored, cloud, reflection, care, submit, reset }
}
