# 🔧 Guía de Corrección - Panel de Propietarios

## 🐛 Problemas Identificados

### 1. **CRÍTICO**: `offers.business_id` tiene tipo incorrecto
- **Schema actual**: `business_id uuid`
- **Debería ser**: `business_id integer`
- **Impacto**: Las ofertas no pueden vincularse correctamente a los negocios

### 2. Inconsistencia entre `is_verified` y `verification_status`
- El schema tiene ambos campos pero no están sincronizados
- Las RLS policies usan `is_verified = true`
- El código usa `verification_status = 'approved'`
- **Impacto**: Los propietarios con negocios aprobados no pueden acceder a sus datos

### 3. Falta política RLS para ver ofertas propias
- Los propietarios solo pueden ver ofertas públicas (is_visible=true)
- No pueden ver sus ofertas pausadas o en borrador
- **Impacto**: El panel no muestra todas las ofertas del propietario

---

## ✅ Solución en 3 Pasos

### **PASO 1: Ejecutar el script de corrección**

1. Abre **Supabase Dashboard** → Tu proyecto → **SQL Editor**
2. Copia y pega el contenido de: `fix-owner-panel.sql`
3. Haz clic en **Run** (o Ctrl+Enter)
4. Verifica que no haya errores

**⚠️ ADVERTENCIA**: Este script modificará la tabla `offers`. Si tienes datos importantes:
- Haz un backup primero
- O ajusta el script según tus necesidades

El script corrige:
- ✅ Tipo de `offers.business_id` (uuid → integer)
- ✅ Sincroniza `is_verified` con `verification_status`
- ✅ Añade trigger automático para mantener sincronización
- ✅ Añade políticas RLS para propietarios

---

### **PASO 2: Verificar que tu usuario tenga negocio aprobado**

Ejecuta en Supabase SQL Editor:

```sql
-- Ver tu negocio y estado de verificación
SELECT
  id,
  name,
  owner_id,
  verification_status,
  is_verified,
  subcategory
FROM public.businesses
WHERE owner_id = auth.uid();
```

**Deberías ver**:
- `verification_status = 'approved'`
- `is_verified = true`
- `subcategory` con un valor (ej: "Fontanero", "Restaurante", etc.)

**Si no tienes negocio aprobado**, ejecuta:

```sql
-- Aprobar tu negocio manualmente (para testing)
UPDATE public.businesses
SET
  verification_status = 'approved',
  is_verified = true
WHERE owner_id = auth.uid();
```

---

### **PASO 3: Probar el panel de propietarios**

1. Recarga la aplicación (F5)
2. Inicia sesión con tu usuario
3. Ve a **Perfil** → **Panel de Propietario**
4. Verifica que se carguen:
   - ✅ Datos del negocio
   - ✅ Empleos activos
   - ✅ Ofertas activas
   - ✅ Presupuestos entrantes

5. Abre **Consola del navegador** (F12) y busca mensajes:
   ```
   [BUSINESS] Negocio cargado: ...
   [OWNER JOBS] Empleos del propietario cargados: X
   [OWNER OFFERS] Ofertas del propietario cargadas: X
   [BUDGET REQUESTS] Solicitudes cargadas: X
   ```

---

## 🧪 Testing

### Crear una oferta de prueba

1. Panel de Propietario → **Crear Oferta**
2. Rellena los campos:
   - Título: "Oferta de prueba"
   - Descripción: "Descripción de prueba"
   - Tipo descuento: "Porcentaje"
   - Descuento: 20
   - Precio original: 50
3. Haz clic en **Publicar Ahora**
4. Verifica en consola: `[OWNER OFFERS] Oferta creada: ...`
5. Debería aparecer en **Gestionar Ofertas**

### Crear un empleo de prueba

1. Panel de Propietario → **Crear Empleo**
2. Rellena los campos mínimos requeridos
3. Publica
4. Verifica en consola: `[OWNER JOBS] Empleo creado: ...`
5. Debería aparecer en **Ofertas de Empleo**

---

## 🆘 Si Sigue Fallando

### 1. Verifica errores en consola del navegador (F12)

Busca errores tipo:
- **403 Forbidden** → Problema de RLS policies
- **Column not found** → Campo no existe en BD
- **Type mismatch** → Problema de tipos de datos

### 2. Verifica errores en Supabase Dashboard

Ve a **Database** → **Logs** y busca errores recientes.

### 3. Verifica las RLS policies

Ejecuta en SQL Editor:

```sql
-- Ver todas las políticas de offers
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('offers', 'jobs', 'businesses', 'budget_requests')
ORDER BY tablename, policyname;
```

Deberías ver políticas para:
- `offers`: "Propietarios ven todas sus ofertas"
- `offers`: "Propietarios pueden crear ofertas"
- `jobs`: "Propietarios ven sus ofertas"
- `jobs`: "Propietarios pueden crear ofertas"

---

## 📋 Checklist Final

- [ ] Script `fix-owner-panel.sql` ejecutado sin errores
- [ ] Usuario tiene negocio con `is_verified = true`
- [ ] Usuario tiene negocio con `verification_status = 'approved'`
- [ ] Panel de propietario carga correctamente
- [ ] Se pueden crear ofertas sin errores
- [ ] Se pueden crear empleos sin errores
- [ ] Las ofertas creadas aparecen en "Gestionar Ofertas"
- [ ] Los empleos creados aparecen en "Ofertas de Empleo"

---

## 📝 Notas Importantes

- **Trigger de sincronización**: A partir de ahora, cuando cambies `verification_status` a `'approved'`, `is_verified` se actualizará automáticamente a `true`.

- **RLS Policies**: Las políticas ahora permiten a los propietarios ver TODAS sus ofertas/empleos, no solo las públicas.

- **Tipo de datos**: Asegúrate de usar el schema corregido (`schema-offers-FIXED.sql`) si vas a recrear la BD desde cero.

---

## ✅ Estado después de las correcciones

| Componente | Estado | Descripción |
|------------|--------|-------------|
| `offers.business_id` | ✅ FIXED | Ahora es integer |
| Sincronización verificación | ✅ FIXED | Trigger automático |
| RLS policies | ✅ FIXED | Propietarios ven todo |
| Panel de propietarios | ✅ FUNCIONANDO | Carga datos correctamente |

---

**¿Necesitas ayuda?** Revisa la consola del navegador y los logs de Supabase para identificar el error específico.
