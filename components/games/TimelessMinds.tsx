'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { pickRandomThinker, thinkers as allThinkers, getThinkerById } from '@/lib/games/timeless-minds/thinkers'
import type { Thinker } from '@/lib/games/timeless-minds/thinkers'
import ThinkerPhoneBook from './ThinkerPhoneBook'
import RequestThinkerModal from './RequestThinkerModal'
import { Button } from '@/components/ui/Button'
import { Go } from '@/components/seedpress/Go'
import { NoteDialog } from '@/components/seedpress/NoteDialog'
import { Stamp } from '@/components/seedpress/Stamp'
import { synthesizeSpeech, stopSpeech, isSpeechSynthesisSupported } from '@/lib/games/timeless-minds/speech-synthesis'
import { SpeechRecognitionManager } from '@/lib/games/timeless-minds/speech-recognition'
import type { AvatarEmotion } from '@/lib/games/timeless-minds/avatar-provider'
import type { AvatarHandle } from '@/lib/games/timeless-minds/avatar-providers/types'
import { getActiveProvider, getProviderMeta } from '@/lib/games/timeless-minds/avatar-providers/registry'
import { resolveAvatarId } from '@/lib/games/timeless-minds/avatar-providers/resolve-avatar-id'
import { loadCustomFaceIds } from '@/lib/games/timeless-minds/simli-faces'
import AvatarRenderer from './avatars/AvatarRenderer'
import TimelessMindsCarePanel from './TimelessMindsCarePanel'
import { useCareMode } from './CareMode'
import { MAX_MESSAGE_LENGTH, farewellFallback } from '@/lib/games/timeless-minds/conversation'
import { plainText } from '@/lib/games/timeless-minds/plain-text'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { isKept, keepLine, loadKeptLines, removeLine, saveKeptLines, type KeptLine } from '@/lib/games/timeless-minds/kept-lines'
import TimelessMindsKeptLines from './TimelessMindsKeptLines'
import TimelessMindsChooser from './TimelessMindsChooser'
import { REPLY_TIMEOUT_MS } from '@/lib/games/reply-timeout'
import { Icon } from '@/components/seedpress/icons/Icon'

interface Message {
  role: 'user' | 'assistant'
  content: string
  emotion?: AvatarEmotion
  /** A message that never reached the thinker, or the apology for it: kept on screen, left out of the talk itself. */
  unanswered?: boolean
}

const REPLY_TROUBLE = 'Forgive me, my thoughts drifted for a moment. Your words are back in the box below, if you would send them again.'
const VOICE_INPUT_UNAVAILABLE = 'Speaking is not available here, so please type your message instead.'
const IMAGINED_NOTE = 'Imagined conversations, not real quotes from the person.'
const CARE_FAREWELL = 'Thank you for staying with me. Please let one of the people below hear you too; you deserve that kind of company.'
const KEYBOARD_SETTLE_MS = 1000
const MENU_ID = 'sage-call-menu'
// Long enough to feel the call open, short enough never to keep anyone waiting
const CONNECTING_MS = 1400
// By then a goodbye is a natural next step, so it waits beside the conversation instead of inside the menu
const GOODBYE_AFTER_EXCHANGES = 3

// A calm video call with someone from history: their large tile, your small one, a meeting chat and a bar of call controls.
// The stage stays a deep, warm dusk in both themes, as video calls do; the chat panel follows the site's theme.
const SAGE_CALL_CSS = `
.sage-call {
  --call-stage: #2b2622;
  --call-tile: #3a332d;
  --call-self: #4a4139;
  --call-avatar: #6b5a4a;
  --call-control: #463e37;
  --call-ink: #f4ede4;
  --call-ink-soft: #d2c6b8;
  --call-on: #b8dcc6;
  --call-on-ink: #17301f;
  --call-leave: #a84d2a;
  --call-speaking: #9fd3b5;
}
html[data-contrast="high"] .sage-call,
html[data-contrast="extra-high"] .sage-call {
  --call-stage: #000000;
  --call-tile: #141414;
  --call-ink: #ffffff;
  --call-ink-soft: #ffffff;
}
.call-stage { background-color: var(--call-stage); color: var(--call-ink); }
.call-tile { background-color: var(--call-tile); box-shadow: inset 0 0 0 2px transparent; transition: box-shadow 600ms ease; }
.call-tile-speaking { box-shadow: inset 0 0 0 3px var(--call-speaking); }
.call-self { background-color: var(--call-self); color: var(--call-ink); }
.call-avatar { background-color: var(--call-avatar); color: var(--call-ink); }
.call-label { background-color: color-mix(in srgb, var(--call-stage) 78%, transparent); color: var(--call-ink); }
.call-ink { color: var(--call-ink); }
.call-ink-soft { color: var(--call-ink-soft); }
.call-control { background-color: var(--call-control); color: var(--call-ink); transition: filter 150ms ease; }
.call-control-on { background-color: var(--call-on); color: var(--call-on-ink); }
.call-leave { background-color: var(--call-leave); color: #ffffff; transition: filter 150ms ease; }
.call-button:hover:not(:disabled) .call-control,
.call-button:hover:not(:disabled) .call-leave { filter: brightness(1.15); }
.call-connecting { opacity: 0; pointer-events: none; transition: opacity 700ms ease; }
.call-connecting.is-on { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .call-tile, .call-connecting, .call-control, .call-leave { transition: none; }
}
`

// A reply let go after its time limit is an expected pause, not a fault worth logging
function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'TimeoutError'
}

function openingMessage(thinker: Thinker): Message {
  return { role: 'assistant', content: thinker.openingLine, emotion: 'happy' }
}

const GENTLE_TOPICS = ['What helps you on a hard day?', 'Tell me about something you love.', 'How do you rest?']

function getTopicSuggestions(thinker: Thinker, care: boolean): string[] {
  if (care) return GENTLE_TOPICS
  const domain = thinker.name.toLowerCase()

  if (domain.includes('socrates') || domain.includes('plato') || domain.includes('aristotle')) {
    return ["What is virtue?", "How should we live?", "What is wisdom?"]
  }
  if (domain.includes('buddha') || domain.includes('confucius') || domain.includes('lao')) {
    return ["How do I let go?", "What is enlightenment?", "How do I find inner peace?"]
  }
  if (domain.includes('einstein') || domain.includes('curie') || domain.includes('darwin')) {
    return ["What drives discovery?", "What surprised you most?", "What should we explore next?"]
  }
  if (domain.includes('aurelius') || domain.includes('seneca') || domain.includes('epictetus')) {
    return ["How do I control my emotions?", "What can I actually control?", "How do I face hardship?"]
  }
  if (domain.includes('gandhi') || domain.includes('king') || domain.includes('mandela')) {
    return ["How do you stay hopeful?", "What makes change possible?", "How do you forgive?"]
  }
  if (domain.includes('rumi') || domain.includes('hafiz')) {
    return ["What is love?", "How do I open my heart?", "Tell me about the soul."]
  }

  return [
    "What gives life meaning?",
    "How do you find peace?",
    "What matters most in the end?"
  ]
}

export default function TimelessMinds() {
  const [thinker, setThinker] = useState<Thinker | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showEndCallDialog, setShowEndCallDialog] = useState(false)
  const [farewell, setFarewell] = useState<{ thinker: Thinker; text: string } | null>(null)
  const farewellHeadingRef = useRef<HTMLHeadingElement>(null)
  const [showPhoneBook, setShowPhoneBook] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestsAvailable, setRequestsAvailable] = useState(false)
  const { care, enterCareMode } = useCareMode()
  const reducedMotion = useReducedMotion()
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [keptLines, setKeptLines] = useState<KeptLine[]>([])
  const [keepNote, setKeepNote] = useState('')
  const [showKeptLines, setShowKeptLines] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const leaveButtonRef = useRef<HTMLButtonElement>(null)
  const goodbyeButtonRef = useRef<HTMLButtonElement>(null)
  // Where focus goes when the dialog on show closes; each opener sets it.
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const menuWrapRef = useRef<HTMLDivElement>(null)
  const inputRowRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const onlyGreetingRef = useRef(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const endCallCancelRef = useRef<HTMLButtonElement>(null)
  // Bumped whenever a new conversation starts, so a reply still in flight for the
  // previous thinker is dropped instead of landing in the new conversation.
  const conversationRef = useRef(0)
  // The box is disabled while a reply is on its way, so focus returns once it is usable again, never on page load.
  const returnFocusAfterReply = useRef(false)

  // Avatar & audio state
  const [videoEnabled, setVideoEnabled] = useState(true)
  // Site rule: no sound until the player chooses it.
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState<AvatarEmotion>('neutral')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [voiceInputNote, setVoiceInputNote] = useState('')
  const speechRecognitionRef = useRef<SpeechRecognitionManager | null>(null)

  // Provider-agnostic avatar state
  const [providerReady, setProviderReady] = useState(false)
  const avatarHandleRef = useRef<AvatarHandle | null>(null)

  // Read provider config once
  const activeProvider = useMemo(() => getActiveProvider(), [])
  const providerMeta = useMemo(() => getProviderMeta(activeProvider), [activeProvider])

  // Resolve avatar ID for current thinker + provider
  const avatarId = useMemo(() => {
    if (!thinker || !providerReady) return ''
    return resolveAvatarId(thinker.id, activeProvider)
  }, [thinker, activeProvider, providerReady])

  // Handle avatar speaking change
  const handleAvatarSpeakingChange = useCallback((speaking: boolean) => {
    setIsSpeaking(speaking)
    if (!speaking) {
      setCurrentEmotion('neutral')
    }
  }, [])

  // Callback ref for AvatarRenderer's imperative handle
  const avatarRef = useCallback((handle: AvatarHandle | null) => {
    avatarHandleRef.current = handle
  }, [])

  /**
   * Provider-agnostic speech routing:
   * 1. If provider canSpeakText + handle connected → handle.speakText() (TalkingHead)
   * 2. If provider needsServerAudio + handle connected → fetch ElevenLabs PCM16 → handle.sendAudio() (Simli)
   * 3. Fallback → browser TTS
   */
  const speakWithAvatar = useCallback(async (
    text: string,
    thinkerId: string,
    emotion: AvatarEmotion = 'neutral'
  ) => {
    const handle = avatarHandleRef.current
    const handleConnected = handle?.isConnected() ?? false
    console.log('[TTS] speakWithAvatar called', { thinkerId, provider: activeProvider, handleConnected, textLength: text.length })

    // Path 1: Provider has built-in TTS (TalkingHead)
    if (providerMeta.canSpeakText && handleConnected && handle) {
      try {
        console.log('[TTS] Using provider speakText (built-in TTS)')
        setIsSpeaking(true)
        await handle.speakText(text)
        return
      } catch (err) {
        console.warn('[TTS] Provider speakText failed, falling back:', err)
      }
    }

    // Path 2: Provider needs server audio (Simli)
    if (providerMeta.needsServerAudio && handleConnected && handle) {
      try {
        console.log('[TTS] Fetching ElevenLabs audio for provider...')
        const ttsResponse = await fetch('/api/timeless-minds/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, thinkerId }),
          signal: AbortSignal.timeout(REPLY_TIMEOUT_MS),
        })

        const contentType = ttsResponse.headers.get('Content-Type')

        if (ttsResponse.ok && contentType?.includes('audio/pcm')) {
          const audioBuffer = await ttsResponse.arrayBuffer()
          if (audioBuffer.byteLength > 0) {
            console.log('[TTS] Sending', audioBuffer.byteLength, 'bytes to avatar provider')
            setIsSpeaking(true)
            handle.sendAudio(audioBuffer)
            return
          }
          console.warn('[TTS] Empty audio buffer received')
        } else {
          const errorBody = await ttsResponse.text().catch(() => 'unknown')
          console.warn('[TTS] ElevenLabs failed:', ttsResponse.status, errorBody)
        }
      } catch (err) {
        console.warn('[TTS] ElevenLabs fetch error, falling back:', err)
      }
    }

    // Path 3: Browser TTS fallback (static provider or errors above)
    try {
      if (isSpeechSynthesisSupported()) {
        console.log('[TTS] Using browser speech synthesis fallback')
        setIsSpeaking(true)
        await synthesizeSpeech(text, thinkerId, emotion, () => {
          setIsSpeaking(false)
          setCurrentEmotion('neutral')
        })
      } else {
        console.warn('[TTS] No TTS available')
      }
    } catch (err) {
      console.warn('[TTS] Browser TTS error:', err)
      setIsSpeaking(false)
    }
  }, [activeProvider, providerMeta])

  // Load Simli custom face IDs if using Simli provider, otherwise mark ready immediately
  useEffect(() => {
    if (activeProvider === 'simli') {
      loadCustomFaceIds()
        .catch(() => {})
        .finally(() => setProviderReady(true))
    } else {
      setProviderReady(true)
    }
  }, [activeProvider])

  useEffect(() => {
    fetch('/api/timeless-minds/request-thinker')
      .then(response => response.json())
      .then((data: { available?: unknown }) => setRequestsAvailable(data?.available === true))
      .catch(() => setRequestsAvailable(false))
  }, [])

  // Once chosen at the start, the conversation opens ready to type into
  const focusInputOnArrival = useRef(false)
  useEffect(() => {
    if (!thinker || !focusInputOnArrival.current) return
    focusInputOnArrival.current = false
    inputRef.current?.focus()
  }, [thinker])

  // Each call opens with a brief, quiet moment of connecting before the thinker's tile comes into view
  useEffect(() => {
    if (!connecting) return
    const settle = setTimeout(() => setConnecting(false), CONNECTING_MS)
    return () => clearTimeout(settle)
  }, [connecting, thinker])

  useEffect(() => {
    const saved = loadKeptLines()
    queueMicrotask(() => setKeptLines(saved))
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOutside = (e: PointerEvent) => {
      if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [menuOpen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech()
      speechRecognitionRef.current?.abort()
    }
  }, [])

  // The support panel shrinks the message area, so the latest reply is brought back into view when it appears too.
  // A fresh call starts at the top instead, so the suggested questions are read from the first one.
  useEffect(() => {
    onlyGreetingRef.current = messages.length <= 1
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      requestAnimationFrame(() => {
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({
            top: messages.length === 1 ? 0 : container.scrollHeight,
            behavior: reducedMotion ? 'auto' : 'smooth'
          })
        }
      })
    }
  }, [messages, care, reducedMotion])

  useEffect(() => {
    if (isLoading || !returnFocusAfterReply.current) return
    returnFocusAfterReply.current = false
    inputRef.current?.focus()
  }, [isLoading])

  // An opening phone keyboard shrinks the conversation; keep its newest words in view.
  // Before the first message the suggested questions stay in view from the top instead.
  const hasThinker = thinker !== null
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (!onlyGreetingRef.current) container.scrollTo({ top: container.scrollHeight })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [hasThinker])

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage
    if (!textToSend.trim() || !thinker || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: textToSend
    }

    const conversation = conversationRef.current
    // Nothing they wrote is lost: the words go back in the box to send again, and neither side of the hiccup counts as talk
    const replyFailed = () => {
      setMessages(prev => [
        ...prev.map(m => (m === userMessage ? { ...m, unanswered: true } : m)),
        { role: 'assistant', content: REPLY_TROUBLE, emotion: 'concerned', unanswered: true },
      ])
      setInputMessage(current => (current.trim() ? current : textToSend))
    }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setInterimTranscript('')
    setVoiceInputNote('')
    setIsLoading(true)
    returnFocusAfterReply.current = true

    try {
      const response = await fetch('/api/timeless-minds/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thinkerId: thinker.id,
          message: textToSend,
          conversationHistory: messages.filter(m => !m.unanswered).map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
        // A reply that never comes ends in the failed-reply path, with the words given back
        signal: AbortSignal.timeout(REPLY_TIMEOUT_MS),
      })

      const data = await response.json().catch(() => null)
      if (conversation !== conversationRef.current) return

      const reply = typeof data?.response === 'string' ? data.response.trim() : ''
      if (!response.ok || !reply) {
        console.error('Chat reply unavailable:', response.status, data?.error)
        replyFailed()
        return
      }

      if (data.care === true) enterCareMode()
      const emotion = (data.emotion as AvatarEmotion) || 'neutral'
      setMessages(prev => [...prev, { role: 'assistant', content: reply, emotion }])
      setCurrentEmotion(emotion)

      // Not awaited: the player can keep typing while the thinker speaks.
      if (audioEnabled) {
        speakWithAvatar(plainText(reply), thinker.id, emotion).catch(console.error)
      }
    } catch (error) {
      if (!isTimeout(error)) console.error('Failed to send message:', error)
      if (conversation !== conversationRef.current) return
      replyFailed()
    } finally {
      if (conversation === conversationRef.current) {
        setIsLoading(false)
      }
    }
  }

  const handleEndCall = (opener: React.RefObject<HTMLButtonElement | null>) => {
    returnFocusRef.current = opener.current
    setShowEndCallDialog(true)
  }

  const startConversation = (nextThinker: Thinker) => {
    conversationRef.current += 1
    stopSpeech()
    speechRecognitionRef.current?.abort()
    avatarHandleRef.current?.clearBuffer()

    setThinker(nextThinker)
    setConnecting(true)
    setMessages([openingMessage(nextThinker)])
    setShowTopicSuggestions(true)
    setInputMessage('')
    setIsLoading(false)
    setCurrentEmotion('neutral')
    setIsSpeaking(false)
    setIsListening(false)
    setInterimTranscript('')
    setVoiceInputNote('')
    inputRef.current?.focus()

    if (audioEnabled) {
      speakWithAvatar(nextThinker.openingLine, nextThinker.id, 'happy').catch(console.error)
    }
  }

  const confirmEndCall = async () => {
    if (!thinker) return
    setShowEndCallDialog(false)
    const leaving = thinker
    const conversation = ++conversationRef.current
    stopSpeech()
    speechRecognitionRef.current?.abort()
    avatarHandleRef.current?.clearBuffer()
    setIsSpeaking(false)
    setIsListening(false)
    setIsLoading(false)
    if (care) {
      setFarewell({ thinker: leaving, text: CARE_FAREWELL })
      return
    }
    setFarewell({ thinker: leaving, text: '' })

    let text = farewellFallback(leaving)
    try {
      const response = await fetch('/api/timeless-minds/farewell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thinkerId: leaving.id,
          conversationHistory: messages.filter(m => !m.unanswered).map(m => ({ role: m.role, content: m.content }))
        }),
        signal: AbortSignal.timeout(REPLY_TIMEOUT_MS),
      })
      const data = await response.json().catch(() => null)
      if (response.ok && typeof data?.farewell === 'string' && data.farewell.trim()) text = data.farewell.trim()
    } catch (error) {
      if (!isTimeout(error)) console.error('Farewell unavailable:', error)
    }
    if (conversation === conversationRef.current) setFarewell({ thinker: leaving, text })
  }

  const leaveFarewell = (openDirectory: boolean) => {
    const leaving = farewell?.thinker ?? thinker
    returnFocusRef.current = inputRef.current
    setFarewell(null)
    setKeepNote('')
    if (!leaving) return
    startConversation(pickRandomThinker({ exclude: leaving, care }))
    if (openDirectory) setShowPhoneBook(true)
  }

  const stayInConversation = () => {
    returnFocusRef.current = inputRef.current
    setFarewell(null)
    setKeepNote('')
    inputRef.current?.focus()
  }

  const keepInputInView = () => {
    const viewport = window.visualViewport
    if (!viewport) return
    const reveal = () => inputRowRef.current?.scrollIntoView({ block: 'end' })
    viewport.addEventListener('resize', reveal, { once: true })
    setTimeout(() => viewport.removeEventListener('resize', reveal), KEYBOARD_SETTLE_MS)
  }

  const closeDirectory = () => setShowPhoneBook(false)

  const fromMenu = (action: () => void) => () => {
    setMenuOpen(false)
    returnFocusRef.current = menuButtonRef.current
    action()
  }

  const endCallFromMenu = () => {
    setMenuOpen(false)
    handleEndCall(menuButtonRef)
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || !menuOpen) return
    e.stopPropagation()
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }

  const handleMenuBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMenuOpen(false)
  }

  const keepFarewell = () => {
    if (!farewell?.text || isKept(keptLines, farewell.thinker.id, farewell.text)) return
    const next = keepLine(keptLines, {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text: farewell.text,
      thinkerId: farewell.thinker.id,
      thinkerName: farewell.thinker.name,
      keptOn: new Date().toLocaleDateString('en-CA'),
    })
    setKeptLines(next)
    setKeepNote(saveKeptLines(next)
      ? 'You can read it again from Kept lines in the menu.'
      : 'Kept for this visit. This device is not saving things just now, so it will be gone when you leave.')
  }

  const forgetLine = (id: string) => {
    const next = removeLine(keptLines, id)
    setKeptLines(next)
    saveKeptLines(next)
  }

  const closeKeptLines = () => setShowKeptLines(false)

  const handleSelectThinker = (thinkerId: string) => {
    const selectedThinker = getThinkerById(thinkerId)
    if (!selectedThinker) return
    // The directory is still open, so the message box cannot take focus yet; it does on close
    returnFocusRef.current = inputRef.current
    startConversation(selectedThinker)
  }

  const cancelEndCall = () => setShowEndCallDialog(false)

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      sendMessage().catch(console.error)
    }
  }

  const toggleAudio = () => {
    const newAudioState = !audioEnabled
    setAudioEnabled(newAudioState)

    if (!newAudioState) {
      stopSpeech()
      avatarHandleRef.current?.clearBuffer()
      setIsSpeaking(false)
    }
  }

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled)
  }

  const toggleVoiceInput = () => {
    if (isListening) {
      speechRecognitionRef.current?.stop()
      setIsListening(false)
      setInterimTranscript('')
    } else {
      if (!SpeechRecognitionManager.isSupported()) {
        setVoiceInputNote(VOICE_INPUT_UNAVAILABLE)
        return
      }

      setVoiceInputNote('')
      if (!speechRecognitionRef.current) {
        speechRecognitionRef.current = new SpeechRecognitionManager({
          continuous: false,
          interimResults: true,
          onResult: (result) => {
            if (result.isFinal) {
              sendMessage(result.transcript)
              setInterimTranscript('')
            } else {
              setInterimTranscript(result.transcript)
            }
          },
          onError: (error) => {
            console.error('Speech recognition error:', error)
            setIsListening(false)
            setInterimTranscript('')
            if (error !== 'no-speech' && error !== 'aborted') {
              setVoiceInputNote(VOICE_INPUT_UNAVAILABLE)
            }
          },
          onEnd: () => {
            setIsListening(false)
            setInterimTranscript('')
          }
        })
      }

      setIsListening(true)
      speechRecognitionRef.current.start()
    }
  }

  if (!thinker) {
    const chooseFirst = (first: Thinker) => {
      focusInputOnArrival.current = true
      startConversation(first)
    }
    return (
      <div className="sage-call call-stage max-w-2xl mx-auto rounded-2xl p-2 sm:p-3">
        <style>{SAGE_CALL_CSS}</style>
        <div className="bg-card-bg text-foreground rounded-xl">
          <TimelessMindsChooser care={care} onChoose={chooseFirst} onSurprise={() => chooseFirst(pickRandomThinker({ care }))} />
        </div>
      </div>
    )
  }

  // On a phone the conversation needs the room once it has begun, so the thinker's tile becomes a slim strip
  const conversationStarted = messages.length > 1
  const tileHeight = conversationStarted ? 'h-24' : 'h-36'
  const statusLabel = isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Here with you'
  const menuItem = 'w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-left text-sm text-foreground hover:bg-hover-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'
  const menuIcon = 'shrink-0 text-foreground/70'
  const callButton = 'call-button flex flex-col items-center gap-1 w-14 sm:w-16 rounded-xl disabled:opacity-50 focus:outline-none'
  const callCircle = 'w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center'
  const callLabel = 'call-ink-soft text-[11px] sm:text-xs leading-tight whitespace-nowrap'
  const userHasSpoken = messages.some((m) => m.role === 'user')
  const offerGoodbye = messages.filter((m) => m.role === 'user' && !m.unanswered).length >= GOODBYE_AFTER_EXCHANGES && !farewell

  return (
    <div className="sage-call call-stage max-w-[1200px] mx-auto h-[calc(100dvh-var(--game-chrome,12rem))] min-h-[26rem] flex flex-col rounded-2xl">
      <style>{SAGE_CALL_CSS}</style>
      {/* At some widths the call reaches the site's floating buttons, so its right edge leaves them a rail there. */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 sm:gap-3 p-2 sm:p-3 sm:pr-[5.5rem] xl:pr-3">
        {/* The thinker's video tile, with your own small tile in its corner */}
        <div className={`call-tile ${isSpeaking ? 'call-tile-speaking' : ''} ${tileHeight} sm:h-auto sm:flex-[3] lg:flex-1 shrink-0 relative rounded-xl overflow-hidden sm:min-h-[12rem] lg:min-h-0`}>
          <div className="absolute inset-0">
            {videoEnabled ? (
              avatarId && (
                <AvatarRenderer
                  ref={avatarRef}
                  avatarId={avatarId}
                  isActive={videoEnabled}
                  audioMuted={!audioEnabled}
                  emotion={currentEmotion}
                  onSpeakingChange={handleAvatarSpeakingChange}
                  onError={(err) => console.warn('Avatar error:', err)}
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center" data-testid="portrait-hidden">
                <span aria-hidden="true" className="call-avatar w-14 h-14 sm:w-28 sm:h-28 rounded-full flex items-center justify-center font-serif text-2xl sm:text-5xl">
                  {thinker.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* A quiet moment of connecting as the call opens; the heading already tells screen readers who is here */}
          <div aria-hidden="true" className={`call-connecting ${connecting ? 'is-on' : ''} call-tile absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 sm:gap-4`}>
            <span className="call-avatar w-12 h-12 sm:w-24 sm:h-24 rounded-full flex items-center justify-center font-serif text-xl sm:text-4xl">
              {thinker.name.charAt(0)}
            </span>
            <span className="call-ink text-sm sm:text-base">Calling {thinker.name}…</span>
          </div>

          <p className="call-label absolute z-10 top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-full text-[11px] sm:text-xs">
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSpeaking ? 'bg-warm' : isListening ? 'bg-melon-green' : 'bg-success'}`} aria-hidden="true" />
            <span>{statusLabel}</span>
          </p>

          <div className="call-label absolute z-10 bottom-2 left-2 sm:bottom-3 sm:left-3 max-w-[60%] px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg">
            <p className="font-semibold text-xs sm:text-sm truncate">{thinker.name}</p>
            <p className="call-ink-soft text-[10px] sm:text-xs truncate">{thinker.era}</p>
          </div>

          {/* Your own tile: a placeholder, never a camera */}
          <div aria-hidden="true" className="call-self absolute z-10 bottom-2 right-2 sm:bottom-3 sm:right-3 w-16 h-12 sm:w-40 sm:h-24 rounded-lg flex items-center justify-center">
            <span className="call-avatar w-7 h-7 sm:w-12 sm:h-12 rounded-full flex items-center justify-center">
              <Icon name="person" size={16} className="sm:w-6 sm:h-6" />
            </span>
            <span className="absolute bottom-0.5 left-1.5 sm:bottom-1.5 sm:left-2 text-[10px] sm:text-xs font-semibold">You</span>
          </div>
        </div>

        {/* The meeting chat */}
        <div className="flex-1 sm:flex-[2] lg:flex-none lg:w-[22rem] min-h-0 w-full flex flex-col bg-card-bg text-foreground rounded-xl overflow-hidden">
          <div className="sr-only">
            <h2>Talking with {thinker.name}</h2>
          </div>
          <p className="hidden sm:block shrink-0 px-4 py-3 border-b border-card-border text-sm font-semibold">In-call messages</p>

          {/* Replies are announced once each, when they arrive whole. */}
          <div
            ref={messagesContainerRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            tabIndex={0}
            className="flex-1 min-h-0 overflow-y-auto px-3 py-3 sm:px-4 space-y-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
            style={{ scrollbarGutter: 'stable' }}
          >
            <p className="rounded-lg bg-hover-bg px-3 py-1.5 text-center text-xs text-foreground/70 leading-relaxed">
              {IMAGINED_NOTE} Inspired by their life and writing, for reflection only.{' '}
              {/* Same tab, unless leaving would end a conversation the visitor is in the middle of */}
              <a
                href="/games/ancient-voices/disclaimer"
                {...(userHasSpoken && { target: '_blank' })}
                className="inline-flex items-center min-h-11 px-1 text-foreground underline"
              >
                About these conversations
                {userHasSpoken && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            </p>

            {messages.length === 1 && showTopicSuggestions && (
              <div>
                <p className="text-xs text-foreground/70 mb-2">Try asking about:</p>
                <div className="flex flex-wrap gap-1.5">
                  {getTopicSuggestions(thinker, care).map(topic => (
                    <button
                      key={topic}
                      onClick={() => {
                        setInputMessage(topic)
                        setShowTopicSuggestions(false)
                        inputRef.current?.focus()
                      }}
                      className="text-sm px-3 py-1.5 min-h-[44px] bg-background border border-card-border hover:border-chosen-line text-foreground rounded-full transition-colors"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[88%]">
                  <div className={`text-xs font-semibold text-foreground/70 mb-1 px-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {message.role === 'user' ? 'You' : thinker.name}
                  </div>
                  <div
                    className={`px-3 py-2 rounded-xl ${
                      message.role === 'user'
                        ? 'bg-chosen border border-chosen-line/40 rounded-br-sm'
                        : 'bg-hover-bg border border-card-border rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.role === 'assistant' ? plainText(message.content) : message.content}
                    </p>
                  </div>
                  {message.role === 'user' && message.unanswered && (
                    <p className="mt-1 px-1 text-right text-xs text-foreground/70">Not answered yet</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {care && <TimelessMindsCarePanel className="shrink-0 px-3 py-2 border-x-0 border-b-0" />}

          {offerGoodbye && (
            <div className="shrink-0 flex justify-center border-t border-card-border">
              <button
                ref={goodbyeButtonRef}
                type="button"
                onClick={() => handleEndCall(goodbyeButtonRef)}
                className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm text-foreground underline underline-offset-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Icon name="hand" size={16} />
                Say goodbye<span className="sr-only"> to {thinker.name}</span>
              </button>
            </div>
          )}

          <div ref={inputRowRef} className="shrink-0 p-2 sm:p-3 border-t border-card-border">
            {isListening && (
              <div className="mb-2 p-2 bg-chosen border border-chosen-line/40 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-melon-green rounded-full" aria-hidden="true" />
                  <span className="text-xs font-medium">Listening...</span>
                </div>
                {interimTranscript && (
                  <p className="text-xs text-foreground/70 mt-1">&quot;{interimTranscript}&quot;</p>
                )}
              </div>
            )}

            {voiceInputNote && (
              <p className="mb-2 text-xs text-foreground/70" role="status">
                {voiceInputNote}
              </p>
            )}

            <div className="flex gap-1.5 sm:gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                onFocus={keepInputInView}
                placeholder={isListening ? 'Listening...' : 'Type a message...'}
                maxLength={MAX_MESSAGE_LENGTH}
                className="flex-1 min-w-0 px-3 py-2 bg-background text-foreground border border-card-border rounded-full text-base sm:text-sm transition-colors placeholder:text-foreground/60"
                disabled={isLoading || isListening}
                aria-label="Message input"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading || isListening}
                variant="primary"
                className="px-3 py-2 sm:px-4 min-w-[44px] rounded-full"
                aria-label="Send message"
              >
                <Icon name="next" size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* The call's control bar */}
      <div className="shrink-0 relative flex items-center justify-center px-2 pt-1 pb-2 sm:pb-3 sm:pr-[5.5rem] xl:pr-3">
        <p className="hidden lg:block absolute left-5 max-w-[14rem] truncate call-ink-soft text-sm">
          {thinker.name} · an imagined conversation
        </p>
        <div className="flex items-start gap-1 sm:gap-3">
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={isLoading || isSpeaking}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            className={callButton}
          >
            <span className={`${callCircle} ${isListening ? 'bg-melon-green text-background' : 'call-control'}`}>
              {isListening ? <Icon name="mic-off" size={24} /> : <Icon name="mic" size={24} />}
            </span>
            <span className={callLabel}>{isListening ? 'Stop' : 'Speak'}</span>
          </button>

          <button
            type="button"
            onClick={toggleAudio}
            aria-label={audioEnabled ? 'Turn off thinker voice' : 'Turn on thinker voice'}
            aria-pressed={audioEnabled}
            className={callButton}
          >
            <span className={`${callCircle} ${audioEnabled ? 'call-control-on' : 'call-control'}`}>
              {audioEnabled ? <Icon name="sound-on" size={24} /> : <Icon name="sound-off" size={24} />}
            </span>
            <span className={callLabel}>{audioEnabled ? 'Voice on' : 'Voice off'}</span>
          </button>

          <button
            type="button"
            onClick={toggleVideo}
            aria-label={videoEnabled ? 'Hide portrait' : 'Show portrait'}
            className={callButton}
          >
            <span className={`${callCircle} call-control`}>
              {videoEnabled ? <Icon name="camera" size={24} /> : <Icon name="camera-off" size={24} />}
            </span>
            <span className={callLabel}>{videoEnabled ? 'Portrait' : 'Portrait off'}</span>
          </button>

          <div ref={menuWrapRef} className="relative" onKeyDown={handleMenuKeyDown} onBlur={handleMenuBlur}>
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls={MENU_ID}
              onClick={() => setMenuOpen(!menuOpen)}
              className={callButton}
            >
              <span className={`${callCircle} ${menuOpen ? 'call-control-on' : 'call-control'}`}>
                <Icon name="more" size={24} />
              </span>
              <span className={callLabel}>Menu</span>
            </button>
            {menuOpen && (
              <div
                id={MENU_ID}
                className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 z-30 w-64 rounded-xl border border-card-border bg-card-bg p-1.5 shadow-xl"
              >
                <button type="button" className={menuItem} onClick={fromMenu(() => setShowPhoneBook(true))}>
                  <Icon name="people" size={16} className={menuIcon} />
                  Choose who to talk with
                </button>
                <button type="button" className={menuItem} onClick={fromMenu(() => setShowKeptLines(true))}>
                  <Icon name="library" size={16} className={menuIcon} />
                  Kept lines
                </button>
                {requestsAvailable && (
                  <button type="button" className={menuItem} onClick={fromMenu(() => setShowRequestModal(true))}>
                    <Icon name="plus" size={16} className={menuIcon} />
                    Request
                  </button>
                )}
                <div className="my-1 border-t border-card-border" />
                <button type="button" className={menuItem} onClick={endCallFromMenu}>
                  <Icon name="hand" size={16} className={menuIcon} />
                  Say goodbye
                </button>
              </div>
            )}
          </div>

          <button
            ref={leaveButtonRef}
            type="button"
            onClick={() => handleEndCall(leaveButtonRef)}
            className={callButton}
          >
            <span className="call-leave w-14 h-11 sm:w-16 sm:h-12 rounded-full flex items-center justify-center">
              <Icon name="hang-up" size={24} />
            </span>
            <span className={callLabel}>Leave</span>
          </button>
        </div>
      </div>

      {showEndCallDialog && (
        <NoteDialog
          title={`Say goodbye to ${thinker.name}?`}
          description={
            care
              ? `${thinker.name} will say a few parting words. Then you can choose who to talk with next, or stay a while longer.`
              : `${thinker.name} will leave you with a parting thought from your conversation. Then you can meet someone new.`
          }
          size="small"
          onClose={cancelEndCall}
          initialFocusRef={endCallCancelRef}
          returnFocusRef={returnFocusRef}
          actions={
            <>
              <Stamp ref={endCallCancelRef} onClick={cancelEndCall}>
                Keep talking
              </Stamp>
              <Go onClick={confirmEndCall}>Say goodbye</Go>
            </>
          }
        />
      )}

      {farewell && (
        <NoteDialog
          title={`Parting words from ${farewell.thinker.name}`}
          onClose={() => {
            if (!farewell.text) return
            if (care) stayInConversation()
            else leaveFarewell(false)
          }}
          titleRef={farewellHeadingRef}
          returnFocusRef={returnFocusRef}
          actions={
            <>
              {care ? (
                <Go onClick={stayInConversation}>Stay with {farewell.thinker.name}</Go>
              ) : (
                <Go onClick={() => leaveFarewell(false)} unavailable={farewell.text ? undefined : 'Their words are on the way.'}>
                  Meet someone new
                </Go>
              )}
              <Stamp onClick={() => leaveFarewell(true)} disabled={!farewell.text}>
                Choose who is next
              </Stamp>
            </>
          }
        >
          <div role="status" aria-live="polite" className="sp-farewell__words">
            {farewell.text ? (
              <p className="sp-farewell__text">{farewell.text}</p>
            ) : (
              <p className="sp-soft">{farewell.thinker.name} is choosing what to leave you with...</p>
            )}
          </div>
          {!care && farewell.text && (
            <div>
              {isKept(keptLines, farewell.thinker.id, farewell.text) ? (
                <Stamp aria-disabled="true" icon="done">
                  Kept
                </Stamp>
              ) : (
                <Stamp onClick={keepFarewell}>Keep this</Stamp>
              )}
            </div>
          )}
          <p className="sp-farewell__note" aria-live="polite">{keepNote}</p>
          <p className="sp-farewell__imagined">{IMAGINED_NOTE}</p>
          {care && <TimelessMindsCarePanel className="mt-4 rounded-lg p-3" />}
        </NoteDialog>
      )}

      {/* Mounted only while open, so each visit starts with an empty search. */}
      {showPhoneBook && (
        <ThinkerPhoneBook
          isOpen
          onClose={closeDirectory}
          thinkers={allThinkers}
          onSelectThinker={handleSelectThinker}
          returnFocusRef={returnFocusRef}
        />
      )}

      {showKeptLines && (
        <TimelessMindsKeptLines
          lines={keptLines}
          onRemove={forgetLine}
          onClose={closeKeptLines}
          returnFocusRef={returnFocusRef}
        />
      )}

      {requestsAvailable && (
        <RequestThinkerModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          returnFocusRef={returnFocusRef}
        />
      )}
    </div>
  )
}
