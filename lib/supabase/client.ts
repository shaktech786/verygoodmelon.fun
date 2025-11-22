import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Handle missing environment variables gracefully
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client for build time or when env vars are missing
    console.warn('Supabase environment variables not configured')

    // Return a minimal mock client that won't crash
    return {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
        eq: function() { return this },
        single: () => Promise.resolve({ data: null, error: null }),
        order: function() { return this },
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: null, error: null }),
        signOut: () => Promise.resolve({ error: null }),
      }
    } as any
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
