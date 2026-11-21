'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { pickRandomThinker, thinkers as allThinkers, getThinkerById } from '@/lib/games/timeless-minds/thinkers'
import type { Thinker } from '@/lib/games/timeless-minds/thinkers'
import { Hand, Send, Loader2, Mic, MicOff, VideoIcon, VideoOff, Volume2, VolumeX, Book, Plus } from 'lucide-react'
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

interface Message {
  role: 'user' | 'assistant'
  content: string
  emotion?: AvatarEmotion
}

const REPLY_TROUBLE = 'Forgive me, my thoughts drifted for a moment. Could you say that again?'
const VOICE_INPUT_UNAVAILABLE = 'Speaking is not available here, so please type your message instead.'
const IMAGINED_NOTE = 'Imagined conversations, not real quotes from the person.'
const CARE_FAREWELL = 'Thank you for staying with me. Please let one of the people below hear you too; you deserve that kind of company.'
const KEYBOARD_SETTLE_MS = 1000

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
  const inputRowRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const onlyGreetingRef = useRef(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const directoryButtonRef = useRef<HTMLButtonElement>(null)
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

  // Initialize with random thinker
  useEffect(() => {
    const selectedThinker = pickRandomThinker()
    setThinker(selectedThinker)
    setMessages([openingMessage(selectedThinker)])
  }, [])

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
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const data = await response.json().catch(() => null)
      if (conversation !== conversationRef.current) return

      const reply = typeof data?.response === 'string' ? data.response.trim() : ''
      if (!response.ok || !reply) {
        console.error('Chat reply unavailable:', response.status, data?.error)
        setMessages(prev => [...prev, { role: 'assistant', content: REPLY_TROUBLE, emotion: 'concerned' }])
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
      console.error('Failed to send message:', error)
      if (conversation !== conversationRef.current) return
      setMessages(prev => [...prev, { role: 'assistant', content: REPLY_TROUBLE, emotion: 'concerned' }])
    } finally {
      if (conversation === conversationRef.current) {
        setIsLoading(false)
      }
    }
  }

  const handleEndCall = () => {
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
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await response.json().catch(() => null)
      if (response.ok && typeof data?.farewell === 'string' && data.farewell.trim()) text = data.farewell.trim()
    } catch (error) {
      console.error('Farewell unavailable:', error)
    }
    if (conversation === conversationRef.current) setFarewell({ thinker: leaving, text })
  }

  const leaveFarewell = (openDirectory: boolean) => {
    const leaving = farewell?.thinker ?? thinker
    setFarewell(null)
    if (!leaving) return
    startConversation(pickRandomThinker({ exclude: leaving, care }))
    if (openDirectory) setShowPhoneBook(true)
  }

  const stayInConversation = () => {
    setFarewell(null)
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
    if (document.activeElement !== inputRef.current) directoryButtonRef.current?.focus()
  }

  const handleSelectThinker = (thinkerId: string) => {
    const selectedThinker = getThinkerById(thinkerId)
    if (selectedThinker) startConversation(selectedThinker)
  }

  const cancelEndCall = () => {
    setShowEndCallDialog(false)
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
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading conversation">
        <Loader2 className="animate-spin text-foreground/50" size={48} />
      </div>
    )
  }

  // On a phone the conversation needs the room once it has begun, so the portrait becomes a slim strip
  const conversationStarted = messages.length > 1
  const portraitHeight = conversationStarted ? 'h-16' : care ? 'h-20' : 'h-32'
  const statusLabel = isSpeaking ? 'Speaking' : isLoading ? 'Thinking' : isListening ? 'Listening' : 'Ready'
  const toolbarButton = 'flex flex-col items-center gap-0.5 sm:gap-1 px-1 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors group'
  const toolbarLabel = 'text-white text-[11px] sm:text-xs whitespace-nowrap'

  return (
    <div className="max-w-7xl mx-auto h-[calc(100dvh-12rem)] min-h-[36rem] sm:h-[calc(100dvh-10rem)] flex flex-col bg-black rounded-xl overflow-hidden shadow-2xl">
      {/* Main Video Area. On wider screens its right edge leaves a rail for the site's floating buttons,
          which would otherwise sit on Send at some sizes and text settings. */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-3 p-2 sm:p-3 sm:pr-[5.5rem] min-h-0">
        {/* Video Window */}
        <div className={`${portraitHeight} sm:h-auto sm:flex-[2] shrink-0 relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden sm:min-h-[200px] lg:min-h-0`}>
          <div className="absolute inset-0">
            {videoEnabled ? (
              <div className="absolute inset-0">
                {avatarId && (
                  <AvatarRenderer
                    ref={avatarRef}
                    avatarId={avatarId}
                    isActive={videoEnabled}
                    audioMuted={!audioEnabled}
                    emotion={currentEmotion}
                    onSpeakingChange={handleAvatarSpeakingChange}
                    onError={(err) => console.warn('Avatar error:', err)}
                  />
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="text-6xl mb-4" aria-hidden="true">&#x1F399;&#xFE0F;</div>
                <p className="text-white/80">Portrait hidden</p>
                <p className="text-white/70 text-sm mt-2">Show the portrait to see {thinker?.name}</p>
              </div>
            )}
          </div>

          {/* Participant Name Tag */}
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/80 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg backdrop-blur-sm">
            <div className="text-white font-semibold text-xs sm:text-sm">{thinker.name}</div>
            <div className="text-white/70 text-[10px] sm:text-xs">{thinker.era}</div>
          </div>

          {/* Status Indicator */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-1.5 sm:gap-2 bg-black/60 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg backdrop-blur-sm">
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSpeaking ? 'bg-warm' : isListening ? 'bg-melon-green' : 'bg-success'}`} aria-hidden="true"></div>
            <span className="text-white text-[11px] sm:text-xs font-medium">{statusLabel}</span>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="flex-1 min-h-0 w-full lg:flex-1 lg:max-w-md bg-card-bg rounded-lg flex flex-col shadow-xl">
          {/* On a phone the portrait's name tag already names the thinker, so this header is only read aloud there */}
          <div className="shrink-0 sr-only sm:not-sr-only sm:p-4 sm:border-b sm:border-card-border">
            <h2 className="font-semibold text-foreground text-sm sm:text-base">Talking with {thinker.name}</h2>
            <p className="text-xs text-foreground/70">{thinker.field} · {thinker.era}</p>
          </div>

          {/* Replies are announced once each, when they arrive whole. */}
          <div
            ref={messagesContainerRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            tabIndex={0}
            className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-hover-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            style={{ scrollbarGutter: 'stable' }}
          >
            {messages.length === 1 && showTopicSuggestions && (
              <div className="mb-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
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
                      className="text-sm px-3 py-1.5 min-h-[44px] bg-accent/10 hover:bg-accent/20 text-foreground rounded-full transition-colors"
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
                <div className="max-w-[85%]">
                  <div className="text-xs text-foreground/70 mb-1 px-1">
                    {message.role === 'user' ? 'You' : thinker.name}
                  </div>
                  <div
                    className={`px-3 py-2 rounded-lg shadow-sm ${
                      message.role === 'user'
                        ? 'bg-chosen border border-chosen-line/40 text-foreground rounded-br-none'
                        : 'bg-card-bg border border-card-border text-foreground rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.role === 'assistant' ? plainText(message.content) : message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start" aria-hidden="true">
                <div className="bg-card-bg border border-card-border px-3 py-2 rounded-lg shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {care && <TimelessMindsCarePanel className="shrink-0 px-3 py-2 border-x-0 border-b-0" />}

          {/* Chat Input */}
          <div ref={inputRowRef} className="shrink-0 p-2 sm:p-3 border-t border-card-border bg-card-bg">
            {isListening && (
              <div className="mb-2 p-2 bg-chosen border border-chosen-line/40 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-melon-green rounded-full" aria-hidden="true" />
                  <span className="text-xs text-foreground font-medium">Listening...</span>
                </div>
                {interimTranscript && (
                  <p className="text-xs text-foreground/70 mt-1 italic">&quot;{interimTranscript}&quot;</p>
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
                className="flex-1 min-w-0 px-3 py-2 bg-card-bg text-foreground border border-card-border rounded-lg text-base sm:text-sm transition-colors placeholder:text-foreground/60"
                disabled={isLoading || isListening}
                aria-label="Message input"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading || isListening}
                variant="primary"
                className="px-3 py-2 sm:px-4 min-w-[44px]"
                aria-label="Send message"
              >
                <Send size={14} className="sm:w-4 sm:h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="shrink-0 bg-black/80 px-2 sm:px-4 py-1.5 sm:py-2 text-center text-[11px] sm:text-xs text-white/80 border-t border-gray-800/50">
        <p>
          {IMAGINED_NOTE} Inspired by their life and writing, for reflection only.{' '}
          <a
            href="/games/ancient-voices/disclaimer"
            target="_blank"
            className="text-white underline"
          >
            About these conversations
          </a>
        </p>
      </div>

      {/* Bottom Toolbar */}
      <div className="shrink-0 bg-gray-900 border-t border-gray-800 py-2 pl-1 pr-14 sm:p-4 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-0.5 sm:gap-2">
          <button ref={directoryButtonRef} onClick={() => setShowPhoneBook(true)} className={toolbarButton}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-success/20 group-hover:bg-success/30">
              <Book size={16} className="text-success sm:w-5 sm:h-5" aria-hidden="true" />
            </div>
            <span className={toolbarLabel}>Directory</span>
          </button>

          {requestsAvailable && (
            <button onClick={() => setShowRequestModal(true)} className={toolbarButton}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-accent/20 group-hover:bg-accent/30">
                <Plus size={16} className="text-accent sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
              <span className={toolbarLabel}>Request</span>
            </button>
          )}
        </div>

        {/* Center Controls */}
        <div className="flex items-center justify-center gap-0.5 sm:gap-4">
          {/* Voice Input */}
          <button
            onClick={toggleVoiceInput}
            className={`${toolbarButton} ${isListening ? 'bg-melon-green/20' : ''}`}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            disabled={isLoading || isSpeaking}
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg ${
              isListening ? 'bg-melon-green' : 'bg-gray-700 group-hover:bg-gray-600'
            }`}>
              {isListening ? (
                <MicOff size={16} className="text-background sm:w-5 sm:h-5" aria-hidden="true" />
              ) : (
                <Mic size={16} className="text-white sm:w-5 sm:h-5" aria-hidden="true" />
              )}
            </div>
            <span className={toolbarLabel}>{isListening ? 'Stop' : 'Speak'}</span>
          </button>

          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className={toolbarButton}
            aria-label={audioEnabled ? 'Turn off thinker voice' : 'Turn on thinker voice'}
            aria-pressed={audioEnabled}
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg ${
              audioEnabled ? 'bg-success/30 group-hover:bg-success/40' : 'bg-gray-700 group-hover:bg-gray-600'
            }`}>
              {audioEnabled ? (
                <Volume2 size={16} className="text-white sm:w-5 sm:h-5" aria-hidden="true" />
              ) : (
                <VolumeX size={16} className="text-white sm:w-5 sm:h-5" aria-hidden="true" />
              )}
            </div>
            <span className={toolbarLabel}>{audioEnabled ? 'Voice on' : 'Voice off'}</span>
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={toolbarButton}
            aria-label={videoEnabled ? 'Hide portrait' : 'Show portrait'}
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg ${
              videoEnabled ? 'bg-gray-700 group-hover:bg-gray-600' : 'bg-gray-600'
            }`}>
              {videoEnabled ? (
                <VideoIcon size={16} className="text-white sm:w-5 sm:h-5" aria-hidden="true" />
              ) : (
                <VideoOff size={16} className="text-white sm:w-5 sm:h-5" aria-hidden="true" />
              )}
            </div>
            <span className={toolbarLabel}>{videoEnabled ? 'Portrait' : 'Hidden'}</span>
          </button>

          {/* End Call */}
          <button onClick={handleEndCall} className={toolbarButton} aria-label="Say goodbye">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-warm/30 group-hover:bg-warm/40">
              <Hand size={16} className="text-white sm:w-5 sm:h-5" aria-hidden="true" />
            </div>
            <span className={toolbarLabel}>Goodbye</span>
          </button>
        </div>

        <div className="hidden sm:block w-20" aria-hidden="true"></div>
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
            className="bg-card-bg rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fade border border-card-border my-8"
          >
            <h3
              id="farewell-title"
              ref={farewellHeadingRef}
              tabIndex={-1}
              className="text-sm font-semibold uppercase tracking-wide text-foreground/70 focus-visible:shadow-none!"
            >
              Parting words from {farewell.thinker.name}
            </h3>
            <div className="mt-4 min-h-[5rem]" role="status" aria-live="polite">
              {farewell.text ? (
                <p className="text-lg sm:text-xl leading-relaxed text-foreground">{farewell.text}</p>
              ) : (
                <p className="text-foreground/70">{farewell.thinker.name} is choosing what to leave you with...</p>
              )}
            </div>
            <p className="mt-4 text-xs text-foreground/70">{IMAGINED_NOTE}</p>
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
                className="flex-1 px-4 py-2 min-h-[44px] border border-foreground/20 text-foreground rounded-lg hover:bg-foreground/5 transition-colors disabled:opacity-50"
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

      {requestsAvailable && (
        <RequestThinkerModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </div>
  )
}
