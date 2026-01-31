import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zwhlcgckhocdkdxilldo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3aGxjZ2NraG9jZGtkeGlsbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDM2MzIsImV4cCI6MjA4NTIxOTYzMn0.pMmohH-dgY0HQS1yD6KFcv3_vFhU0YD1a8wL1gLCw8M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
