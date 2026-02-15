import { createClient } from '@supabase/supabase-js'

// Obtener variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validar que las variables estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. ' +
    'Asegúrate de tener VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY configuradas.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
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
