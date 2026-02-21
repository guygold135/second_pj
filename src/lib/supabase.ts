import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env. ' +
    'Supabase client will not work until you set them.'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
