'use client'

import { useState, useEffect, useRef } from 'react'
import { getRandomThinker, thinkers as allThinkers, getThinkerById } from '@/lib/games/timeless-minds/thinkers'
import type { Thinker } from '@/lib/games/timeless-minds/thinkers'
import { PhoneOff, Send, Loader2, Mic, VideoIcon, MoreVertical, Book, Plus } from 'lucide-react'
import ThinkerPhoneBook from './ThinkerPhoneBook'
import RequestThinkerModal from './RequestThinkerModal'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function TimelessMinds() {
  const [thinker, setThinker] = useState<Thinker | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showEndCallDialog, setShowEndCallDialog] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showPhoneBook, setShowPhoneBook] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [hasPhoneBookAccess] = useState(false) // TODO: Check from API based on user email
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize with random thinker
  useEffect(() => {
    const selectedThinker = getRandomThinker()
    setThinker(selectedThinker)
    setImageError(false) // Reset image error for new thinker

    // Add opening message
    setMessages([
      {
        role: 'assistant',
        content: selectedThinker.openingLine
      }
    ])
  }, [])

  // Auto-scroll to bottom of messages (within container only) with smooth behavior
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        })
      })
    }
  }, [messages])

  // Refocus input after sending message
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading])

  const sendMessage = async () => {
    if (!inputMessage.trim() || !thinker || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: inputMessage
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // Keep focus on input immediately after clearing
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)

    try {
      const response = await fetch('/api/timeless-minds/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thinkerId: thinker.id,
          message: inputMessage,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const data = await response.json()

      if (data.response) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.response
          }
        ])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I seem to be having trouble hearing you clearly. Could you try again?'
        }
      ])
    } finally {
      setIsLoading(false)
      // Ensure focus after response completes
      inputRef.current?.focus()
    }
  }

  const handleEndCall = () => {
    setShowEndCallDialog(true)
  }

  const confirmEndCall = () => {
    // Reset to random thinker
    const newThinker = getRandomThinker()
    setThinker(newThinker)
    setImageError(false)
    setMessages([
      {
        role: 'assistant',
        content: newThinker.openingLine
      }
    ])
    setShowEndCallDialog(false)
  }

  const handleSelectThinker = (thinkerId: string) => {
    const selectedThinker = getThinkerById(thinkerId)
    if (selectedThinker) {
      setThinker(selectedThinker)
      setImageError(false)
      setMessages([
        {
          role: 'assistant',
          content: selectedThinker.openingLine
        }
      ])
    }
  }

  const cancelEndCall = () => {
    setShowEndCallDialog(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl+Enter or just Enter (without Shift) to send
    if (e.key === 'Enter' && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      sendMessage()
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
        {/* Video Window - fixed proportion */}
        <div className="flex-[2] relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden min-h-[200px] lg:min-h-0">
          {/* Avatar - responsive sizing */}
          <div className="absolute inset-0 flex items-center justify-center">
            {!imageError && thinker ? (
              <div className="relative w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/games/timeless-minds/avatars/${thinker.id}.png`}
                  alt={thinker.name}
                  className="w-full h-full object-contain"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-accent/30 to-success/30 border-4 border-white/20 flex items-center justify-center text-6xl sm:text-8xl md:text-9xl backdrop-blur-sm">
                👤
              </div>
            )}
          </div>

          {/* Participant Name Tag (bottom left) */}
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/80 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse"></div>
              <div>
                <div className="text-white font-semibold text-xs sm:text-sm">{thinker.name}</div>
                <div className="text-white/70 text-[10px] sm:text-xs">{thinker.era}</div>
              </div>
            </div>
          </div>

          {/* Status Indicator (top left) */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 bg-black/60 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg backdrop-blur-sm">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
            <span className="text-white text-[10px] sm:text-xs font-medium">Connected</span>
          </div>
        </div>

        {/* Chat Sidebar (Zoom/Teams style) - stacks on mobile */}
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
            <div className="flex gap-1.5 sm:gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-xs sm:text-sm transition-all"
                disabled={isLoading}
                aria-label="Message input"
                autoFocus
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
            <div className="mt-1 text-[9px] sm:text-[10px] text-gray-400 text-center">
              Press Enter or Cmd/Ctrl+Enter to send
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-black/80 px-2 sm:px-4 py-1.5 sm:py-2 text-center text-[9px] sm:text-[10px] text-white/60 border-t border-gray-800/50">
        <p>
          ⚠️ <strong>Disclaimer:</strong> AI simulation for entertainment only. Not real conversations.
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

      {/* Bottom Toolbar (Zoom/Teams style) */}
      <div className="bg-gray-900 border-t border-gray-800 p-2 sm:p-4 flex items-center justify-between">
        {/* Left Side: Phone Book & Request */}
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

        {/* Center: Main Controls */}
        <div className="flex items-center justify-center gap-2 sm:gap-4">
        {/* Mute Button */}
        <button
          className="flex flex-col items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors group"
          aria-label="Mute microphone"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-gray-700 group-hover:bg-gray-600">
            <Mic size={16} className="text-white sm:w-5 sm:h-5" />
          </div>
          <span className="text-white text-[10px] sm:text-xs">Mute</span>
        </button>

        {/* Video Button */}
        <button
          className="flex flex-col items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors group"
          aria-label="Stop video"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-gray-700 group-hover:bg-gray-600">
            <VideoIcon size={16} className="text-white sm:w-5 sm:h-5" />
          </div>
          <span className="text-white text-[10px] sm:text-xs">Video</span>
        </button>

        {/* End Call Button (Red) */}
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

        {/* Right Side: Placeholder for balance */}
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
