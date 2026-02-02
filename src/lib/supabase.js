import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zwhlcgckhocdkdxilldo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3aGxjZ2NraG9jZGtkeGlsbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDM2MzIsImV4cCI6MjA4NTIxOTYzMn0.pMmohH-dgY0HQS1yD6KFcv3_vFhU0YD1a8wL1gLCw8M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-client-info': 'cornella-local',
    },
  },
  db: {
    schema: 'public',
  },
  // Configuración de red con timeouts más cortos
  realtime: {
    timeout: 5000,
  },
})

// Verificar conectividad al cargar
console.log('[SUPABASE] Cliente inicializado:', supabaseUrl)

// Test de conectividad REST
fetch(supabaseUrl + '/rest/v1/')
  .then(() => console.log('[SUPABASE] ✅ REST API funciona'))
  .catch(err => console.error('[SUPABASE] ❌ REST API error:', err))

// Test de conectividad AUTH
const testAuthStart = Date.now()
fetch(supabaseUrl + '/auth/v1/health', {
  headers: {
    'apikey': supabaseAnonKey,
  }
})
  .then(res => {
    const elapsed = Date.now() - testAuthStart
    console.log(`[SUPABASE] ✅ AUTH API funciona (${elapsed}ms)`)
    return res.json()
  })
  .then(data => console.log('[SUPABASE] AUTH health:', data))
  .catch(err => console.error('[SUPABASE] ❌ AUTH API error:', err))
