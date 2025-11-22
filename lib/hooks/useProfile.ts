'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Database } from '@/types/database'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!userId) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        // @ts-ignore - Type issue with Supabase update method
        .update(updates)
        .eq('id', userId)

      if (error) throw error

      setProfile((prev: Profile | null) => prev ? { ...prev, ...updates as Partial<Profile> } : null)
    } catch (err) {
      setError(err as Error)
    }
  }

  const addPoints = async (points: number) => {
    if (!profile) return

    const currentPoints = profile.points || 0
    await updateProfile({ points: currentPoints + points })
  }

  const deductPoints = async (points: number) => {
    if (!profile) return

    const currentPoints = profile.points || 0
    await updateProfile({ points: Math.max(0, currentPoints - points) })
  }

  return { profile, loading, error, updateProfile, addPoints, deductPoints }
}
