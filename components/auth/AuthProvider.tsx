'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { AuthModal } from './AuthModal'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openAuthModal = useCallback(() => setIsModalOpen(true), [])
  const closeAuthModal = useCallback(() => setIsModalOpen(false), [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: loading,
      isAuthenticated: Boolean(user),
      openAuthModal,
      closeAuthModal,
      signOut,
    }),
    [user, loading, openAuthModal, closeAuthModal, signOut]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal isOpen={isModalOpen} onClose={closeAuthModal} />
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
