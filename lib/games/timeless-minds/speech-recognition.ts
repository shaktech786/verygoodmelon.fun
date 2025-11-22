/**
 * Speech-to-Text Integration
 *
 * Uses Web Speech API (browser built-in) for now.
 * Can be enhanced with Google Cloud Speech-to-Text, OpenAI Whisper, or Azure in the future.
 */

export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export interface SpeechRecognitionOptions {
  continuous?: boolean
  interimResults?: boolean
  language?: string
  onResult?: (result: SpeechRecognitionResult) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

/**
 * Browser speech recognition types
 */
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    abort(): void
    onresult: (event: SpeechRecognitionEvent) => void
    onerror: (event: SpeechRecognitionErrorEvent) => void
    onend: () => void
    onstart: () => void
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList
    resultIndex: number
  }

  interface SpeechRecognitionResultList {
    readonly length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
  }

  interface SpeechRecognitionResult {
    readonly length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
    readonly isFinal: boolean
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string
    readonly confidence: number
  }

  interface SpeechRecognitionErrorEvent {
    error: string
    message: string
  }
}

/**
 * Speech recognition manager
 */
export class SpeechRecognitionManager {
  private recognition: SpeechRecognition | null = null
  private isListening = false

  constructor(private options: SpeechRecognitionOptions = {}) {}

  /**
   * Check if speech recognition is supported
   */
  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  /**
   * Start listening
   */
  start(): void {
    if (!SpeechRecognitionManager.isSupported()) {
      this.options.onError?.('Speech recognition not supported in this browser')
      return
    }

    if (this.isListening) {
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()

    this.recognition.continuous = this.options.continuous ?? false
    this.recognition.interimResults = this.options.interimResults ?? true
    this.recognition.lang = this.options.language || 'en-US'

    this.recognition.onstart = () => {
      this.isListening = true
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const alternative = result[0]

        this.options.onResult?.({
          transcript: alternative.transcript,
          confidence: alternative.confidence,
          isFinal: result.isFinal
        })
      }
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      this.options.onError?.(event.error)
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.options.onEnd?.()
    }

    this.recognition.start()
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  /**
   * Abort listening
   */
  abort(): void {
    if (this.recognition && this.isListening) {
      this.recognition.abort()
      this.isListening = false
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening
  }
}

/**
 * Simple one-shot speech recognition
 */
export function recognizeSpeech(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!SpeechRecognitionManager.isSupported()) {
      reject(new Error('Speech recognition not supported'))
      return
    }

    const manager = new SpeechRecognitionManager({
      continuous: false,
      interimResults: false,
      onResult: (result) => {
        if (result.isFinal) {
          resolve(result.transcript)
        }
      },
      onError: (error) => {
        reject(new Error(error))
      }
    })

    manager.start()
  })
}
