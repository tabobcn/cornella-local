# SQL Migrate — Crear migración de Supabase

Ayuda a crear y registrar un script SQL de migración para Supabase en el proyecto CornellaLocal.

## Proceso

1. **Pregunta al usuario** qué cambio necesita:
   - Nueva tabla
   - Nueva columna en tabla existente
   - Nueva política RLS
   - Nuevo trigger / función PostgreSQL
   - Corrección de datos
   - Otro

2. **Genera el archivo SQL** en `supabase/<nombre-descriptivo>.sql` siguiendo estas convenciones:
   - Nombre en kebab-case descriptivo (ej: `add-birth-date.sql`, `setup-push-notifications.sql`)
   - Siempre usar `IF NOT EXISTS` / `IF EXISTS` para que sea idempotente (se puede ejecutar más de una vez sin error)
   - Incluir `-- ====` comentarios de sección para separar bloques lógicos
   - Si crea tabla nueva: incluir `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` y políticas RLS básicas
   - Si añade columna: usar `ADD COLUMN IF NOT EXISTS`
   - Si crea función/trigger: usar `CREATE OR REPLACE`
   - Acabar con `DO $$ BEGIN RAISE NOTICE '...'; END $$;` de confirmación

3. **Actualiza CLAUDE.md** añadiendo el nuevo script en la sección "Scripts SQL Importantes" con el estado `(✅ pendiente de ejecutar)` o `(✅ ejecutado)` según corresponda.

4. **Muestra al usuario** el recordatorio final:
   ```
   ⚠️  Ejecuta el script en:
   Supabase Dashboard → SQL Editor → New query → pegar contenido → Run
   URL: https://supabase.com/dashboard/project/zwhlcgckhocdkdxilldo/sql
   ```

## Reglas importantes del proyecto

- La app usa `businesses.owner_id` (no `user_id`) para identificar al propietario
- `businesses.id` es INTEGER, `offers.id` y `jobs.id` son UUID
- Nunca usar JOINs anidados en queries de Supabase JS (dan PGRST200)
- Profiles: campos disponibles son `id, full_name, avatar_url, is_admin, birth_date`
- Tabla `budget_requests` tiene columna `category` (no `subcategory`)
- El campo de verificación es `is_verified` en businesses (booleano), no `verification_status` para las queries de RLS
