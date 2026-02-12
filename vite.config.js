import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Cargar variables de entorno correctamente
  const env = loadEnv(mode, process.cwd(), '')

  // Debug: verificar que las variables se cargaron
  console.log('[VITE] Environment variables loaded:')
  console.log('VITE_SUPABASE_URL:', env.VITE_SUPABASE_URL ? '✅ SET' : '❌ MISSING')
  console.log('VITE_SUPABASE_ANON_KEY:', env.VITE_SUPABASE_ANON_KEY ? '✅ SET (length: ' + (env.VITE_SUPABASE_ANON_KEY?.length || 0) + ')' : '❌ MISSING')

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser'
    }
  }
})
