import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface SavedScript {
  id: string
  user_email: string
  title: string
  content: string
  segment_count: number
  segments?: import('./types').ScriptSegment[]
  search_results?: import('./types').SearchResults[]
  created_at: string
}
