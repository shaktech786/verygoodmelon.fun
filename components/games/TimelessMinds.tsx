'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getRandomThinker, thinkers as allThinkers, getThinkerById } from '@/lib/games/timeless-minds/thinkers'
import type { Thinker } from '@/lib/games/timeless-minds/thinkers'
import { PhoneOff, Send, Loader2, Mic, MicOff, VideoIcon, VideoOff, MoreVertical, Book, Plus } from 'lucide-react'
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

interface Message {
  role: 'user' | 'assistant'
  content: string
  emotion?: AvatarEmotion
}

// Topic suggestions based on thinker's domain
function getTopicSuggestions(thinker: Thinker): string[] {
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
  const [showPhoneBook, setShowPhoneBook] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [hasPhoneBookAccess] = useState(true)
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Avatar & audio state
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState<AvatarEmotion>('neutral')
  const [interimTranscript, setInterimTranscript] = useState('')
  const speechRecognitionRef = useRef<SpeechRecognitionManager | null>(null)

  // Provider-agnostic avatar state
  const [avatarConnected, setAvatarConnected] = useState(false)
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

  // Handle avatar connection change
  const handleAvatarConnectionChange = useCallback((connected: boolean) => {
    setAvatarConnected(connected)
  }, [])

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

  // Initialize with random thinker
  useEffect(() => {
    const selectedThinker = getRandomThinker()
    setThinker(selectedThinker)

    const openingMessage = {
      role: 'assistant' as const,
      content: selectedThinker.openingLine,
      emotion: 'happy' as AvatarEmotion
    }
    setMessages([openingMessage])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech()
      speechRecognitionRef.current?.abort()
    }
  }, [])

  // Auto-scroll messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        })
      })
    }
  }, [messages])

  // Refocus input after loading
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading])

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage
    if (!textToSend.trim() || !thinker || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: textToSend
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setInterimTranscript('')
    setIsLoading(true)

    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)

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

      const data = await response.json()

      if (data.error) {
        console.error('API error:', data.error)
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `I'm having trouble connecting right now. ${data.error === 'Failed to generate response' ? 'The wisdom servers may be resting. Please try again in a moment.' : data.error}`,
            emotion: 'concerned'
          }
        ])
        return
      }

      if (data.response) {
        const emotion = (data.emotion as AvatarEmotion) || 'neutral'
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          emotion
        }

        setMessages(prev => [...prev, assistantMessage])
        setCurrentEmotion(emotion)

        // Speak when avatar is connected or audio is enabled (browser TTS fallback)
        const handleConnected = avatarHandleRef.current?.isConnected() ?? false
        if (handleConnected || audioEnabled) {
          await speakWithAvatar(data.response, thinker.id, emotion)
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I seem to be having trouble hearing you clearly. Could you try again?',
          emotion: 'concerned'
        }
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleEndCall = () => {
    setShowEndCallDialog(true)
  }

  const confirmEndCall = () => {
    stopSpeech()
    speechRecognitionRef.current?.abort()
    avatarHandleRef.current?.clearBuffer()

    const newThinker = getRandomThinker()
    setThinker(newThinker)
    setCurrentEmotion('neutral')
    setIsSpeaking(false)
    setIsListening(false)

    const openingMessage: Message = {
      role: 'assistant',
      content: newThinker.openingLine,
      emotion: 'happy'
    }
    setMessages([openingMessage])
    setShowEndCallDialog(false)

    const handleConnected = avatarHandleRef.current?.isConnected() ?? false
    if (handleConnected || audioEnabled) {
      speakWithAvatar(newThinker.openingLine, newThinker.id, 'happy').catch(console.error)
    }
  }

  const handleSelectThinker = (thinkerId: string) => {
    const selectedThinker = getThinkerById(thinkerId)
    if (selectedThinker) {
      stopSpeech()
      speechRecognitionRef.current?.abort()
      avatarHandleRef.current?.clearBuffer()

      setThinker(selectedThinker)
      setCurrentEmotion('neutral')
      setIsSpeaking(false)
      setIsListening(false)

      const openingMessage: Message = {
        role: 'assistant',
        content: selectedThinker.openingLine,
        emotion: 'happy'
      }
      setMessages([openingMessage])

      const handleConnected = avatarHandleRef.current?.isConnected() ?? false
      if (handleConnected || audioEnabled) {
        speakWithAvatar(selectedThinker.openingLine, selectedThinker.id, 'happy').catch(console.error)
      }
    }
  }

  const cancelEndCall = () => {
    setShowEndCallDialog(false)
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
          },
          onEnd: () => {
            setIsListening(false)
            setInterimTranscript('')
          }
        })
      }

      speechRecognitionRef.current.start()
      setIsListening(true)
    }
  }

  if (!thinker) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" size={48} />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-12rem)] sm:h-[calc(100vh-10rem)] flex flex-col bg-black rounded-xl overflow-hidden shadow-2xl sticky top-24 sm:top-20">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-3 p-2 sm:p-3 min-h-0">
        {/* Video Window */}
        <div className="flex-[2] relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden min-h-[200px] lg:min-h-0">
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
                    onConnectionChange={handleAvatarConnectionChange}
                    onSpeakingChange={handleAvatarSpeakingChange}
                    onError={(err) => console.warn('Avatar error:', err)}
                  />
                )}
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="text-6xl mb-4">&#x1F399;&#xFE0F;</div>
                <p className="text-white/70">Audio Only Mode</p>
                <p className="text-white/50 text-sm mt-2">Turn on video to see {thinker?.name}</p>
              </div>
            )}
          </div>

          {/* Participant Name Tag */}
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/80 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse ${
                avatarConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <div className="text-white font-semibold text-xs sm:text-sm">{thinker.name}</div>
                <div className="text-white/70 text-[10px] sm:text-xs">{thinker.era}</div>
              </div>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 bg-black/60 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg backdrop-blur-sm">
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
              isSpeaking ? 'bg-yellow-400 animate-pulse' : avatarConnected ? 'bg-green-500' : 'bg-green-500'
            }`}></div>
            <span className="text-white text-[10px] sm:text-xs font-medium">
              {isSpeaking ? 'Speaking...' : avatarConnected ? 'Live' : 'Connected'}
            </span>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-full lg:flex-1 lg:max-w-md bg-card-bg rounded-lg flex flex-col shadow-xl min-h-[300px] lg:min-h-0">
          {/* Chat Header */}
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Chat</h3>
              <MoreVertical size={16} className="text-foreground/50 sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-hover-bg scroll-smooth"
            style={{ scrollbarGutter: 'stable' }}
          >
            {messages.length === 1 && showTopicSuggestions && (
              <div className="mb-3 p-3 bg-accent/5 border border-accent/20 rounded-lg animate-in fade-in duration-500">
                <p className="text-xs text-foreground/60 mb-2">Try asking about:</p>
                <div className="flex flex-wrap gap-1.5">
                  {getTopicSuggestions(thinker).map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputMessage(topic)
                        setShowTopicSuggestions(false)
                        inputRef.current?.focus()
                      }}
                      className="text-xs px-2 py-1 bg-accent/10 hover:bg-accent/20 text-accent rounded-full transition-colors"
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
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className="text-xs text-foreground/60 mb-1 px-1">
                    {message.role === 'user' ? 'You' : thinker.name}
                  </div>
                  <div
                    className={`px-3 py-2 rounded-lg shadow-sm ${
                      message.role === 'user'
                        ? 'bg-accent text-white rounded-br-none'
                        : 'bg-card-bg border border-card-border text-foreground rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="bg-card-bg border border-card-border px-3 py-2 rounded-lg shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-2 sm:p-3 border-t border-card-border bg-card-bg">
            {isListening && (
              <div className="mb-2 p-2 bg-accent/10 border border-accent/30 rounded-lg animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-accent font-medium">Listening...</span>
                </div>
                {interimTranscript && (
                  <p className="text-xs text-foreground/70 mt-1 italic">&quot;{interimTranscript}&quot;</p>
                )}
              </div>
            )}

            <div className="flex gap-1.5 sm:gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isListening ? 'Listening...' : 'Type a message...'}
                className="flex-1 px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-xs sm:text-sm transition-all"
                disabled={isLoading || isListening}
                aria-label="Message input"
                autoFocus
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading || isListening}
                variant="primary"
                className="px-3 py-1.5 sm:px-4 sm:py-2"
                aria-label="Send message"
              >
                <Send size={14} className="sm:w-4 sm:h-4" />
              </Button>
            </div>
            <div className="mt-1 text-[9px] sm:text-[10px] text-gray-400 text-center">
              Press Enter to send or click mic to speak
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-black/80 px-2 sm:px-4 py-1.5 sm:py-2 text-center text-[9px] sm:text-[10px] text-white/60 border-t border-gray-800/50">
        <p>
          &#x26A0;&#xFE0F; <strong>Disclaimer:</strong> AI simulation for entertainment only. Not real conversations.
          AI-generated interpretations based on historical records.{' '}
          <a
            href="/games/timeless-minds/disclaimer"
            target="_blank"
            className="text-white/80 hover:text-white underline"
          >
            Full Legal Disclaimer
          </a>
        </p>
      </div>

      {/* Bottom Toolbar */}
      <div className="bg-gray-900 border-t border-gray-800 p-2 sm:p-4 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-2">
          {hasPhoneBookAccess && (
            <button
              onClick={() => setShowPhoneBook(true)}
              className="flex flex-col items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors group"
              aria-label="Open phone book"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-success/20 group-hover:bg-success/30">
                <Book size={16} className="text-success sm:w-5 sm:h-5" />
              </div>
              <span className="text-white text-[10px] sm:text-xs">Directory</span>
            </button>
          )}

          <button
            onClick={() => setShowRequestModal(true)}
            className="flex flex-col items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors group"
            aria-label="Request thinker"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-accent/20 group-hover:bg-accent/30">
              <Plus size={16} className="text-accent sm:w-5 sm:h-5" />
            </div>
            <span className="text-white text-[10px] sm:text-xs">Request</span>
          </button>
        </div>

        {/* Center Controls */}
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {/* Voice Input */}
          <button
            onClick={toggleVoiceInput}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors group ${
              isListening ? 'bg-red-500/20' : ''
            }`}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            disabled={isLoading || isSpeaking}
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg ${
              isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-700 group-hover:bg-gray-600'
            }`}>
              {isListening ? (
                <MicOff size={16} className="text-white sm:w-5 sm:h-5" />
              ) : (
                <Mic size={16} className="text-white sm:w-5 sm:h-5" />
              )}
            </div>
            <span className="text-white text-[10px] sm:text-xs">
              {isListening ? 'Stop' : 'Speak'}
            </span>
          </button>

          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className="flex flex-col items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors group"
            aria-label={audioEnabled ? 'Mute thinker voice' : 'Unmute thinker voice'}
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg ${
              audioEnabled ? 'bg-gray-700 group-hover:bg-gray-600' : 'bg-red-500'
            }`}>
              {audioEnabled ? (
                <Mic size={16} className="text-white sm:w-5 sm:h-5" />
              ) : (
                <MicOff size={16} className="text-white sm:w-5 sm:h-5" />
              )}
            </div>
            <span className="text-white text-[10px] sm:text-xs">
              {audioEnabled ? 'Voice On' : 'Voice Off'}
            </span>
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className="flex flex-col items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors group"
            aria-label={videoEnabled ? 'Turn off video' : 'Turn on video'}
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg ${
              videoEnabled ? 'bg-gray-700 group-hover:bg-gray-600' : 'bg-red-500'
            }`}>
              {videoEnabled ? (
                <VideoIcon size={16} className="text-white sm:w-5 sm:h-5" />
              ) : (
                <VideoOff size={16} className="text-white sm:w-5 sm:h-5" />
              )}
            </div>
            <span className="text-white text-[10px] sm:text-xs">
              {videoEnabled ? 'Video' : 'Off'}
            </span>
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="flex flex-col items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-red-600/20 transition-colors group"
            aria-label="End call"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600">
              <PhoneOff size={16} className="text-white sm:w-5 sm:h-5" />
            </div>
            <span className="text-white text-[10px] sm:text-xs">End</span>
          </button>
        </div>

        {/* Right Side placeholder */}
        <div className="w-20"></div>
      </div>

      {/* End Call Dialog */}
      {showEndCallDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-card-bg rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl animate-fade">
            <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-foreground">
              End this conversation?
            </h3>
            <p className="text-sm sm:text-base text-foreground/70 mb-3 sm:mb-4 leading-relaxed">
              This moment with {thinker.name} is unique. Once you end this call, you&apos;ll connect with a different mind from history.
            </p>
            <p className="text-xs sm:text-sm text-foreground/60 mb-3 sm:mb-4 italic">
              &quot;Every conversation is a chance to grow. Make it meaningful.&quot;
            </p>
            <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-3 mb-4 text-xs text-foreground/60">
              <p className="mb-1"><strong>Remember:</strong> This is an AI simulation for personal growth, not a real conversation with {thinker.name}.</p>
              <p>Responses are interpretations based on historical records. Always verify important information independently.</p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={cancelEndCall}
                className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 border border-foreground/20 rounded-lg hover:bg-foreground/5 transition-colors text-sm sm:text-base"
              >
                Continue Call
              </button>
              <button
                onClick={confirmEndCall}
                className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm sm:text-base"
              >
                End & Meet Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Book Modal */}
      <ThinkerPhoneBook
        isOpen={showPhoneBook}
        onClose={() => setShowPhoneBook(false)}
        thinkers={allThinkers}
        onSelectThinker={handleSelectThinker}
      />

      {/* Request Thinker Modal */}
      <RequestThinkerModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
      />
    </div>
  )
}
