import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function createSupabaseClient(): SupabaseClient | null {
  if (typeof supabaseUrl !== 'string' || typeof supabaseAnonKey !== 'string' || !supabaseUrl.trim() || !supabaseAnonKey.trim()) {
    if (import.meta.env.DEV) {
      console.warn(
        'Supabase: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env. Supabase will be disabled.'
      )
    }
    return null
  }
  if (import.meta.env.DEV) {
    console.log('Supabase: client created, URL:', supabaseUrl.replace(/\/\/[^/]+@/, '//***@'))
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createSupabaseClient()
