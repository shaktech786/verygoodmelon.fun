'use client'

import { useEffect, useRef, useState } from 'react'
import { useCareMode } from '@/components/games/CareMode'
import type { WordFrequency } from '@/lib/games/wordFrequency'
import { isUnsettled, judgementOf, verdictOf, type ReflectReply, type Verdict } from './judgement'
import { MAX_SUBMISSION_LENGTH, soundsLikeDistress } from './moderation'

export type CommunityWordsGame = 'last-words' | 'first-words'

export type CloudState =
  | { status: 'hidden' }
  | { status: 'ready'; words: WordFrequency[]; total: number }

const HIDDEN_CLOUD: CloudState = { status: 'hidden' }

const REFLECT_TIMEOUT_MS = 20_000

interface Reflection {
  text: string
  /** A small thing to carry back into tomorrow, for a game that offers one. */
  intention: string
  /** Null until a reply has come back (or failed to). */
  verdict: Verdict | null
}

const NO_REFLECTION: Reflection = { text: '', intention: '', verdict: null }

/**
 * Everything a writing game does with the player's words: shows them back at
 * once, asks for a reflection, and only once that reply has judged them safe
 * offers them to the shared cloud through the server. The returned judgement is
 * the one gate every game uses: nothing that celebrates, keeps, quotes back or
 * shares the words may appear before it is "safe".
 */
export function useCommunityWords(game: CommunityWordsGame) {
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [stored, setStored] = useState(false)
  const [cloud, setCloud] = useState<CloudState>(HIDDEN_CLOUD)
  const [reflection, setReflection] = useState<Reflection>(NO_REFLECTION)
  const [wordsNeedCare, setWordsNeedCare] = useState(false)
  const { care: visitNeedsCare, enterCareMode, setAwaitingJudgement } = useCareMode()
  const care = wordsNeedCare || visitNeedsCare
  const judgement = judgementOf({ submitted: submitted !== null, care, verdict: reflection.verdict })
  const unsettled = isUnsettled(judgement)

  useEffect(() => {
    setAwaitingJudgement(unsettled)
  }, [unsettled, setAwaitingJudgement])
  useEffect(() => () => setAwaitingJudgement(false), [setAwaitingJudgement])
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

  /** Resolves to the reply's verdict on the words, even if the player has moved on. */
  async function reflect(words: string, id: number): Promise<Verdict> {
    let reply: ReflectReply | null = null
    try {
      const response = await fetch(`/api/${game}/reflect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: words }),
        // A reply that never comes must still end in the gentle exit, not an endless wait
        signal: AbortSignal.timeout(REFLECT_TIMEOUT_MS),
      })
      if (response.ok) reply = await response.json()
    } catch {
      // No reply is no verdict, never a safe one
    }
    const verdict = verdictOf(reply)
    if (verdict === 'care') enterCareMode()
    if (isCurrent(id)) {
      if (verdict === 'care') setWordsNeedCare(true)
      setReflection({
        text: reply?.reflection ?? '',
        intention: verdict === 'safe' ? reply?.intention ?? '' : '',
        verdict,
      })
    }
    return verdict
  }

  async function respond(words: string, id: number, distressed: boolean) {
    // Someone already in care is not asked to picture endings again by a fresh reflection
    if (visitNeedsCare && !distressed) return
    const verdict = await reflect(words, id)
    if (!distressed && verdict === 'safe') await share(words, id)
  }

  function submit(text: string) {
    const words = text.trim()
    if (!words || words.length > MAX_SUBMISSION_LENGTH || hasSubmitted.current) return
    hasSubmitted.current = true
    const id = ++session.current
    setSubmitted(words)
    setReflection(NO_REFLECTION)
    const distressed = soundsLikeDistress(words)
    setWordsNeedCare(distressed)
    if (distressed) enterCareMode()
    void respond(words, id, distressed)
  }

  function reset() {
    session.current++
    hasSubmitted.current = false
    setSubmitted(null)
    setStored(false)
    setCloud(HIDDEN_CLOUD)
    setReflection(NO_REFLECTION)
    setWordsNeedCare(false)
  }

  /** For words written after the reflection, such as what a player chooses to carry back. */
  function noticeDistress(text: string): boolean {
    if (!soundsLikeDistress(text)) return false
    setWordsNeedCare(true)
    enterCareMode()
    return true
  }

  const safe = judgement === 'safe'
  return {
    submitted,
    // What others wrote, and that these words joined them, only ever follows a safe verdict
    stored: safe && stored,
    cloud: safe ? cloud : HIDDEN_CLOUD,
    reflection: { text: reflection.text, intention: reflection.intention },
    care,
    judgement,
    submit,
    reset,
    noticeDistress,
  }
}
