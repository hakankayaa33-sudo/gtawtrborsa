import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  console.warn('[Supabase] .env dosyasındaki VITE_SUPABASE_URL henüz ayarlanmamış.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
