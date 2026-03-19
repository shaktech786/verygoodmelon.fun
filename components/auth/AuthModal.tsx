'use client'

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react'
import { X, Mail, Check, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

type AuthModalState = 'idle' | 'loading' | 'success' | 'error' | 'unavailable'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<AuthModalState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Check if Supabase is configured
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return

    // Store the element that had focus before modal opened
    previousFocusRef.current = document.activeElement as HTMLElement

    // Focus email input on open (or close button if Supabase unavailable)
    const timer = setTimeout(() => {
      if (!isSupabaseConfigured) {
        modalRef.current?.querySelector<HTMLButtonElement>('[data-close-button]')?.focus()
      } else {
        emailInputRef.current?.focus()
      }
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, input, a, [tabindex]:not([tabindex="-1"])'
        )
        const firstFocusable = focusableElements[0]
        const lastFocusable = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Prevent background scroll
    document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      // Return focus to previous element
      previousFocusRef.current?.focus()
    }
  }, [isOpen, onClose, isSupabaseConfigured])

  // Reset state when modal opens (deferred to avoid synchronous setState in effect)
  useEffect(() => {
    if (!isOpen) return
    const id = requestAnimationFrame(() => {
      setState(isSupabaseConfigured ? 'idle' : 'unavailable')
      setEmail('')
      setErrorMessage('')
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen, isSupabaseConfigured])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()

    if (!email.trim() || state === 'loading') return

    setState('loading')
    setErrorMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setState('error')
        setErrorMessage(
          error.message.includes('rate')
            ? 'Too many requests. Please wait a moment and try again.'
            : 'Something went wrong. Please try again.'
        )
        return
      }

      setState('success')
    } catch {
      setState('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }, [email, state])

  const handleGitHubSignIn = useCallback(async () => {
    if (state === 'loading') return

    setState('loading')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setState('error')
        setErrorMessage('Something went wrong. Please try again.')
      }
    } catch {
      setState('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }, [state])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-sm bg-card-bg border border-card-border rounded-2xl shadow-lg p-6 sm:p-8 animate-bounce-in"
      >
        {/* Close button */}
        <button
          data-close-button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-primary-light hover:text-foreground rounded-lg transition-colors hover:bg-hover-bg"
          aria-label="Close sign in dialog"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/logo.png"
            alt=""
            width={64}
            height={40}
            className="pixelated"
            aria-hidden="true"
          />
        </div>

        {state === 'unavailable' ? (
          <UnavailableState />
        ) : state === 'success' ? (
          <SuccessState email={email} />
        ) : (
          <SignInForm
            email={email}
            setEmail={setEmail}
            state={state}
            errorMessage={errorMessage}
            emailInputRef={emailInputRef}
            onSubmit={handleSubmit}
            onGitHubSignIn={handleGitHubSignIn}
          />
        )}
      </div>
    </div>
  )
}

function UnavailableState() {
  return (
    <div className="text-center">
      <h2 id="auth-modal-title" className="text-xl font-semibold text-foreground mb-2">
        Coming soon
      </h2>
      <p className="text-primary-light text-sm leading-relaxed">
        Sign in is not available yet, but it will be soon. For now, enjoy the games freely.
      </p>
    </div>
  )
}

function SuccessState({ email }: { email: string }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
          <Check size={24} className="text-success" aria-hidden="true" />
        </div>
      </div>
      <h2 id="auth-modal-title" className="text-xl font-semibold text-foreground mb-2">
        Check your email
      </h2>
      <p className="text-primary-light text-sm leading-relaxed">
        We sent a login link to{' '}
        <span className="font-medium text-foreground">{email}</span>.
        Click the link in the email to sign in.
      </p>
    </div>
  )
}

interface SignInFormProps {
  email: string
  setEmail: (email: string) => void
  state: AuthModalState
  errorMessage: string
  emailInputRef: React.RefObject<HTMLInputElement | null>
  onSubmit: (e: FormEvent) => void
  onGitHubSignIn: () => void
}

function SignInForm({
  email,
  setEmail,
  state,
  errorMessage,
  emailInputRef,
  onSubmit,
  onGitHubSignIn,
}: SignInFormProps) {
  const isLoading = state === 'loading'

  return (
    <>
      <div className="text-center mb-6">
        <h2 id="auth-modal-title" className="text-xl font-semibold text-foreground mb-1">
          Sign in to save your progress
        </h2>
        <p className="text-primary-light text-sm">
          No account needed to play — signing in just saves your journey.
        </p>
      </div>

      {/* Error message */}
      {state === 'error' && errorMessage && (
        <div
          className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-danger/5 border border-danger/20 text-sm text-danger animate-shake"
          role="alert"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Magic link form */}
      <form onSubmit={onSubmit} className="mb-4">
        <label htmlFor="auth-email" className="block text-sm font-medium text-foreground mb-1.5">
          Email
        </label>
        <input
          ref={emailInputRef}
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={isLoading}
          className="w-full px-3 py-2.5 rounded-lg border border-card-border bg-background text-foreground placeholder:text-primary-light/50 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed button-squeeze"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </span>
          ) : (
            <>
              <Mail size={16} aria-hidden="true" />
              Send magic link
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-card-border" />
        <span className="text-xs text-primary-light">or</span>
        <div className="flex-1 h-px bg-card-border" />
      </div>

      {/* GitHub OAuth */}
      <button
        onClick={onGitHubSignIn}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-card-border bg-card-bg text-foreground text-sm font-medium transition-all hover:bg-hover-bg disabled:opacity-50 disabled:cursor-not-allowed button-squeeze"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Continue with GitHub
      </button>
    </>
  )
}
