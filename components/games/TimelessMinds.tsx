'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { pickRandomThinker, thinkers as allThinkers, getThinkerById } from '@/lib/games/timeless-minds/thinkers'
import type { Thinker } from '@/lib/games/timeless-minds/thinkers'
import { Hand, Send, Mic, MicOff, Image as ImageIcon, ImageOff, Volume2, VolumeX, Users, Plus, MoreHorizontal, BookmarkPlus, BookmarkCheck, Library } from 'lucide-react'
import ThinkerPhoneBook from './ThinkerPhoneBook'
import RequestThinkerModal from './RequestThinkerModal'
import { Button } from '@/components/ui/Button'
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
const MENU_ID = 'sage-room-menu'
// By then a goodbye is a natural next step, so it waits beside the conversation instead of inside the menu
const GOODBYE_AFTER_EXCHANGES = 3

// A warm sitting room in place of a video call: linen wall, a framed portrait, a paper page for the words.
const SAGE_ROOM_CSS = `
.sage-room {
  --sage-wall: #efe6d6;
  --sage-paper: #fbf8f1;
  --sage-note: #ffffff;
  --sage-line: #e3d8c5;
  --sage-ink: #2a241d;
  --sage-ink-soft: #5b5045;
  --sage-frame: #8a6644;
  --sage-frame-edge: #5e4329;
  --sage-mat: #f7f0e3;
}
html[data-theme="dark"] .sage-room {
  --sage-wall: #211c17;
  --sage-paper: #2b2520;
  --sage-note: #352e28;
  --sage-line: #463c33;
  --sage-ink: #f2eadf;
  --sage-ink-soft: #cbbda9;
  --sage-frame: #7a5a3b;
  --sage-frame-edge: #3a2a1b;
  --sage-mat: #3b332b;
}
@media (prefers-color-scheme: dark) {
  html[data-theme="auto"] .sage-room {
    --sage-wall: #211c17;
    --sage-paper: #2b2520;
    --sage-note: #352e28;
    --sage-line: #463c33;
    --sage-ink: #f2eadf;
    --sage-ink-soft: #cbbda9;
    --sage-frame: #7a5a3b;
    --sage-frame-edge: #3a2a1b;
    --sage-mat: #3b332b;
  }
}
html[data-contrast="high"] .sage-room,
html[data-contrast="extra-high"] .sage-room {
  --sage-wall: var(--background);
  --sage-paper: var(--card-bg);
  --sage-note: var(--card-bg);
  --sage-line: var(--card-border);
  --sage-ink: var(--foreground);
  --sage-ink-soft: var(--foreground);
}
.sage-wall { background-color: var(--sage-wall); color: var(--sage-ink); }
.sage-paper { background-color: var(--sage-paper); border-color: var(--sage-line); color: var(--sage-ink); }
.sage-note { background-color: var(--sage-note); border-color: var(--sage-line); }
.sage-line { border-color: var(--sage-line); }
.sage-ink { color: var(--sage-ink); }
.sage-ink-soft { color: var(--sage-ink-soft); }
.sage-frame {
  background: linear-gradient(145deg, var(--sage-frame), var(--sage-frame-edge));
  box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 6px 18px rgba(40, 25, 10, 0.25);
}
.sage-mat { background-color: var(--sage-mat); }
`

// Tab and Shift+Tab cycle within an open dialog instead of wandering to the page behind it.
function keepTabInside(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab') return
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'))
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  if (e.shiftKey && (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

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
  const goodbyeButtonRef = useRef<HTMLButtonElement>(null)
  const endCallOpenerRef = useRef<React.RefObject<HTMLButtonElement | null>>(menuButtonRef)
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

  useEffect(() => {
    if (showEndCallDialog) endCallCancelRef.current?.focus()
  }, [showEndCallDialog])

  useEffect(() => {
    if (farewell) farewellHeadingRef.current?.focus()
  }, [farewell])

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
    endCallOpenerRef.current = opener
    setShowEndCallDialog(true)
  }

  const startConversation = (nextThinker: Thinker) => {
    conversationRef.current += 1
    stopSpeech()
    speechRecognitionRef.current?.abort()
    avatarHandleRef.current?.clearBuffer()

    setThinker(nextThinker)
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
    setFarewell(null)
    setKeepNote('')
    if (!leaving) return
    startConversation(pickRandomThinker({ exclude: leaving, care }))
    if (openDirectory) setShowPhoneBook(true)
  }

  const stayInConversation = () => {
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

  const closeDirectory = () => {
    setShowPhoneBook(false)
    // Choosing someone has already put focus in the message box; otherwise it would fall to the page
    if (document.activeElement !== inputRef.current) menuButtonRef.current?.focus()
  }

  const fromMenu = (action: () => void) => () => {
    setMenuOpen(false)
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

  const closeKeptLines = () => {
    setShowKeptLines(false)
    menuButtonRef.current?.focus()
  }

  const handleKeptLinesKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') closeKeptLines()
    keepTabInside(e)
  }

  const handleSelectThinker = (thinkerId: string) => {
    const selectedThinker = getThinkerById(thinkerId)
    if (selectedThinker) startConversation(selectedThinker)
  }

  const cancelEndCall = () => {
    setShowEndCallDialog(false)
    endCallOpenerRef.current.current?.focus()
  }

  const handleEndCallDialogKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') cancelEndCall()
    keepTabInside(e)
  }

  const handleFarewellKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape' && farewell?.text) {
      if (care) stayInConversation()
      else leaveFarewell(false)
    }
    keepTabInside(e)
  }

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
      <div className="sage-room sage-wall max-w-2xl mx-auto rounded-2xl border sage-line shadow-sm">
        <style>{SAGE_ROOM_CSS}</style>
        <TimelessMindsChooser care={care} onChoose={chooseFirst} onSurprise={() => chooseFirst(pickRandomThinker({ care }))} />
      </div>
    )
  }

  const statusLabel = isSpeaking ? 'Speaking' : isLoading ? 'Thinking' : isListening ? 'Listening' : 'Here with you'
  const menuItem = 'w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-left text-sm sage-ink hover:bg-[var(--sage-paper)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'
  const menuIcon = 'shrink-0 sage-ink-soft'
  const userHasSpoken = messages.some((m) => m.role === 'user')
  const offerGoodbye = messages.filter((m) => m.role === 'user' && !m.unanswered).length >= GOODBYE_AFTER_EXCHANGES && !farewell

  return (
    <div className="sage-room sage-wall max-w-[1024px] mx-auto h-[calc(100dvh-12rem)] min-h-[36rem] sm:h-[calc(100dvh-10rem)] flex flex-col rounded-2xl border sage-line shadow-sm">
      <style>{SAGE_ROOM_CSS}</style>
      {/* At some widths the room reaches the site's floating buttons, so its right edge leaves them a rail there. */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 lg:gap-6 p-3 sm:p-5 sm:pr-[5.5rem] xl:pr-5">
        {/* The portrait on the wall, with its name plaque and the room's one menu */}
        <div className="shrink-0 flex items-center gap-3 lg:flex-col lg:items-stretch lg:w-64 xl:w-72">
          <div className={`sage-frame shrink-0 rounded-md p-1.5 lg:p-2.5 ${care ? 'w-14 h-[4.5rem]' : 'w-16 h-20'} sm:w-20 sm:h-24 lg:w-full lg:h-auto lg:aspect-[4/5]`}>
            <div className="sage-mat w-full h-full rounded-sm p-1 lg:p-2">
              <div className="relative w-full h-full rounded-[2px] overflow-hidden">
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
                  <div className="w-full h-full flex items-center justify-center sage-paper font-serif text-2xl lg:text-6xl sage-ink-soft" data-testid="portrait-hidden">
                    <span aria-hidden="true">{thinker.name.charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 lg:flex-none lg:text-center lg:mt-1">
            <p className="font-serif text-lg sm:text-xl lg:text-2xl leading-tight sage-ink line-clamp-2 lg:line-clamp-none">{thinker.name}</p>
            <p className="text-xs sm:text-sm sage-ink-soft truncate lg:whitespace-normal">{thinker.era}<span className="hidden sm:inline"> · {thinker.field}</span></p>
            <p className="mt-0.5 flex items-center lg:justify-center gap-1.5 text-xs sage-ink-soft">
              <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-warm' : isListening ? 'bg-melon-green' : 'bg-success'}`} aria-hidden="true" />
              <span>{statusLabel}</span>
            </p>
          </div>

          <div ref={menuWrapRef} className="relative shrink-0 lg:self-center" onKeyDown={handleMenuKeyDown} onBlur={handleMenuBlur}>
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls={MENU_ID}
              onClick={() => setMenuOpen(!menuOpen)}
              className="sage-paper flex items-center gap-1.5 px-3 min-h-[44px] rounded-full border text-sm hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <MoreHorizontal size={18} aria-hidden="true" />
              Menu
            </button>
            {menuOpen && (
              <div
                id={MENU_ID}
                className="sage-note absolute right-0 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 top-full mt-2 lg:top-auto lg:bottom-full lg:mt-0 lg:mb-2 z-30 w-64 rounded-xl border p-1.5 shadow-xl"
              >
                <button type="button" className={menuItem} onClick={fromMenu(() => setShowPhoneBook(true))}>
                  <Users size={18} className={menuIcon} aria-hidden="true" />
                  Choose who to talk with
                </button>
                <button
                  type="button"
                  className={menuItem}
                  onClick={toggleAudio}
                  aria-label={audioEnabled ? 'Turn off thinker voice' : 'Turn on thinker voice'}
                  aria-pressed={audioEnabled}
                >
                  {audioEnabled ? <Volume2 size={18} className={menuIcon} aria-hidden="true" /> : <VolumeX size={18} className={menuIcon} aria-hidden="true" />}
                  {audioEnabled ? 'Voice on' : 'Voice off'}
                </button>
                <button type="button" className={menuItem} onClick={toggleVideo}>
                  {videoEnabled ? <ImageOff size={18} className={menuIcon} aria-hidden="true" /> : <ImageIcon size={18} className={menuIcon} aria-hidden="true" />}
                  {videoEnabled ? 'Hide portrait' : 'Show portrait'}
                </button>
                <button type="button" className={menuItem} onClick={fromMenu(() => setShowKeptLines(true))}>
                  <Library size={18} className={menuIcon} aria-hidden="true" />
                  Kept lines
                </button>
                {requestsAvailable && (
                  <button type="button" className={menuItem} onClick={fromMenu(() => setShowRequestModal(true))}>
                    <Plus size={18} className={menuIcon} aria-hidden="true" />
                    Request
                  </button>
                )}
                <div className="my-1 border-t sage-line" />
                <button type="button" className={menuItem} onClick={endCallFromMenu}>
                  <Hand size={18} className={menuIcon} aria-hidden="true" />
                  Say goodbye
                </button>
              </div>
            )}
          </div>
        </div>

        {/* The conversation, written on paper */}
        <div className="sage-paper flex-1 min-h-0 w-full flex flex-col rounded-xl border shadow-sm overflow-hidden">
          <div className="sr-only">
            <h2>Talking with {thinker.name}</h2>
          </div>

          {/* Replies are announced once each, when they arrive whole. */}
          <div
            ref={messagesContainerRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            tabIndex={0}
            className="flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5 space-y-3 sm:space-y-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
            style={{ scrollbarGutter: 'stable' }}
          >
            {messages.length === 1 && showTopicSuggestions && (
              <div className="mb-3">
                <p className="text-xs sage-ink-soft mb-2">Try asking about:</p>
                <div className="flex flex-wrap gap-1.5">
                  {getTopicSuggestions(thinker, care).map(topic => (
                    <button
                      key={topic}
                      onClick={() => {
                        setInputMessage(topic)
                        setShowTopicSuggestions(false)
                        inputRef.current?.focus()
                      }}
                      className="sage-note text-sm px-3 py-1.5 min-h-[44px] border hover:border-chosen-line sage-ink rounded-full transition-colors"
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
                <div className="max-w-[88%] sm:max-w-[80%]">
                  <div className={`text-xs sage-ink-soft mb-1 px-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {message.role === 'user' ? 'You' : thinker.name}
                  </div>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-chosen border border-chosen-line/40 rounded-br-sm'
                        : 'sage-note border rounded-bl-sm'
                    }`}
                  >
                    <p className={`leading-relaxed whitespace-pre-wrap sage-ink ${message.role === 'assistant' ? 'font-serif text-[0.95rem] sm:text-base' : 'text-sm'}`}>
                      {message.role === 'assistant' ? plainText(message.content) : message.content}
                    </p>
                  </div>
                  {message.role === 'user' && message.unanswered && (
                    <p className="mt-1 px-1 text-right text-xs sage-ink-soft">Not answered yet</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start" aria-hidden="true">
                <div className="sage-note border px-3 py-2.5 rounded-2xl rounded-bl-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-[var(--sage-ink-soft)] opacity-50 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-[var(--sage-ink-soft)] opacity-50 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-[var(--sage-ink-soft)] opacity-50 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {care && <TimelessMindsCarePanel className="shrink-0 px-3 py-2 border-x-0 border-b-0" />}

          {/* Chat Input */}
          <div ref={inputRowRef} className="shrink-0 p-2 sm:p-3 border-t sage-line">
            {isListening && (
              <div className="mb-2 p-2 bg-chosen border border-chosen-line/40 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-melon-green rounded-full" aria-hidden="true" />
                  <span className="text-xs sage-ink font-medium">Listening...</span>
                </div>
                {interimTranscript && (
                  <p className="text-xs sage-ink-soft mt-1 italic">&quot;{interimTranscript}&quot;</p>
                )}
              </div>
            )}

            {voiceInputNote && (
              <p className="mb-2 text-xs sage-ink-soft" role="status">
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
                className="sage-note flex-1 min-w-0 px-3 py-2 sage-ink border rounded-lg text-base sm:text-sm transition-colors placeholder:text-[var(--sage-ink-soft)]"
                disabled={isLoading || isListening}
                aria-label="Message input"
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={isLoading || isSpeaking}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                className={`shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  isListening ? 'bg-melon-green border-melon-green text-background' : 'sage-note sage-ink-soft hover:border-chosen-line'
                }`}
              >
                {isListening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
              </button>
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading || isListening}
                variant="primary"
                className="px-3 py-2 sm:px-4 min-w-[44px]"
                aria-label="Send message"
              >
                <Send size={16} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="shrink-0 px-3 sm:px-5 pb-1 text-center text-[11px] sm:text-xs sage-ink-soft">
        {offerGoodbye && (
          <button
            ref={goodbyeButtonRef}
            type="button"
            onClick={() => handleEndCall(goodbyeButtonRef)}
            className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm sage-ink underline underline-offset-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <Hand size={16} aria-hidden="true" />
            Say goodbye<span className="sr-only"> to {thinker.name}</span>
          </button>
        )}
        <p>
          {IMAGINED_NOTE} Inspired by their life and writing, for reflection only.{' '}
          {/* Same tab, unless leaving would end a conversation the visitor is in the middle of */}
          <a
            href="/games/ancient-voices/disclaimer"
            {...(userHasSpoken && { target: '_blank' })}
            className="inline-flex items-center min-h-11 px-2 sage-ink underline"
          >
            About these conversations
            {userHasSpoken && <span className="sr-only"> (opens in a new tab)</span>}
          </a>
        </p>
      </div>

      {/* End Call Dialog */}
      {showEndCallDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-call-title"
            onKeyDown={handleEndCallDialogKeyDown}
            className="bg-card-bg rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl animate-fade"
          >
            <h3 id="end-call-title" className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-foreground">
              Say goodbye to {thinker.name}?
            </h3>
            <p className="text-sm sm:text-base text-foreground/70 mb-4 leading-relaxed">
              {care
                ? `${thinker.name} will say a few parting words. Then you can choose who to talk with next, or stay a while longer.`
                : `${thinker.name} will leave you with a parting thought from your conversation. Then you can meet someone new.`}
            </p>
            <div className="flex gap-2 sm:gap-3">
              <button
                ref={endCallCancelRef}
                onClick={cancelEndCall}
                className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 min-h-[44px] border border-foreground/20 text-foreground rounded-lg hover:bg-foreground/5 transition-colors text-sm sm:text-base"
              >
                Keep talking
              </button>
              <button
                onClick={confirmEndCall}
                className="flex-1 px-3 py-2 sm:px-4 min-h-[44px] bg-melon-green text-background rounded-lg hover:opacity-90 transition-opacity text-sm sm:text-base"
              >
                Say goodbye
              </button>
            </div>
          </div>
        </div>
      )}

      {farewell && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="farewell-title"
            onKeyDown={handleFarewellKeyDown}
            className="sage-paper rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fade border my-8"
          >
            <h3
              id="farewell-title"
              ref={farewellHeadingRef}
              tabIndex={-1}
              className="text-sm font-semibold uppercase tracking-wide sage-ink-soft focus-visible:shadow-none!"
            >
              Parting words from {farewell.thinker.name}
            </h3>
            <div className="mt-4 min-h-[5rem]" role="status" aria-live="polite">
              {farewell.text ? (
                <p className="font-serif text-xl sm:text-2xl leading-relaxed sage-ink">{farewell.text}</p>
              ) : (
                <p className="sage-ink-soft">{farewell.thinker.name} is choosing what to leave you with...</p>
              )}
            </div>
            {!care && farewell.text && (
              <div className="mt-3">
                {isKept(keptLines, farewell.thinker.id, farewell.text) ? (
                  <button
                    type="button"
                    aria-disabled="true"
                    className="inline-flex items-center gap-2 px-3 min-h-[44px] -ml-3 rounded-lg text-sm sage-ink cursor-default"
                  >
                    <BookmarkCheck size={18} className="text-melon-green" aria-hidden="true" />
                    Kept
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={keepFarewell}
                    className="sage-note inline-flex items-center gap-2 px-3 min-h-[44px] rounded-lg border text-sm sage-ink hover:border-chosen-line transition-colors"
                  >
                    <BookmarkPlus size={18} className="sage-ink-soft" aria-hidden="true" />
                    Keep this
                  </button>
                )}
              </div>
            )}
            <p className="mt-1 text-sm sage-ink-soft min-h-0" aria-live="polite">{keepNote}</p>
            <p className="mt-3 text-xs sage-ink-soft">{IMAGINED_NOTE}</p>
            {care && <TimelessMindsCarePanel className="mt-4 rounded-lg p-3" />}
            <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3">
              {care ? (
                <button
                  onClick={stayInConversation}
                  className="flex-1 px-4 py-2 min-h-[44px] bg-melon-green text-background rounded-lg hover:opacity-90 transition-opacity"
                >
                  Stay with {farewell.thinker.name}
                </button>
              ) : (
                <button
                  onClick={() => leaveFarewell(false)}
                  disabled={!farewell.text}
                  className="flex-1 px-4 py-2 min-h-[44px] bg-melon-green text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Meet someone new
                </button>
              )}
              <button
                onClick={() => leaveFarewell(true)}
                disabled={!farewell.text}
                className="flex-1 px-4 py-2 min-h-[44px] border sage-line sage-ink rounded-lg hover:bg-[var(--sage-note)] transition-colors disabled:opacity-50"
              >
                Choose who is next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mounted only while open, so each visit starts with an empty search. */}
      {showPhoneBook && (
        <ThinkerPhoneBook
          isOpen
          onClose={closeDirectory}
          thinkers={allThinkers}
          onSelectThinker={handleSelectThinker}
        />
      )}

      {showKeptLines && (
        <TimelessMindsKeptLines
          lines={keptLines}
          onRemove={forgetLine}
          onClose={closeKeptLines}
          onKeyDown={handleKeptLinesKeyDown}
        />
      )}

      {requestsAvailable && (
        <RequestThinkerModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </div>
  )
}
