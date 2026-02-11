import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Debug: verificar variables de entorno durante build
console.log('[VITE BUILD] Environment variables check:')
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ SET' : '❌ MISSING')
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING')

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  },
  define: {
    // Exponer variables explícitamente
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  }
})
