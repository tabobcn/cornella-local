# Pre-deploy — Checklist antes de publicar en Vercel

Ejecuta el checklist completo antes de hacer push a producción.

## Pasos a seguir (en orden)

### 1. Verificar que no hay console.log de debug
Busca en `src/App.jsx`:
- `console.log(` que no sean errores críticos
- `console.error(` innecesarios
- Variables `debugMode`, `testMode` activas

### 2. Verificar mensajes de error al usuario
- No debe aparecer `error.message` directamente en `showToast()`
- Mensajes en español y sin tecnicismos de BD

### 3. Verificar SQL scripts pendientes
Revisa si hay archivos `.sql` nuevos en `/supabase/` que no estén marcados como `(✅ ejecutado)` en CLAUDE.md.
Si los hay, avisar al usuario que debe ejecutarlos antes de hacer push.

### 4. Verificar imports y referencias
- No hay imports de componentes que no existen
- No hay referencias a variables/funciones eliminadas

### 5. Build rápido (verificar que compila)
Ejecutar mentalmente si hay errores obvios de sintaxis.

### 6. Resumen final
Mostrar:
```
✅ Listo para deploy / ❌ Bloqueado por: [razón]

Scripts SQL pendientes de ejecutar:
- supabase/nombre.sql

Próximos pasos:
1. git add src/App.jsx
2. git commit -m "..."
3. git push origin main
→ Vercel desplegará automáticamente en ~1 minuto
```

## URLs útiles
- Vercel dashboard: https://vercel.com/tabobcn/cornella-local
- Supabase SQL Editor: https://supabase.com/dashboard/project/zwhlcgckhocdkdxilldo/sql
- App en producción: https://www.cornellalocal.es
