# 🔧 Instrucciones Paso a Paso - Corrección del Panel de Propietarios

## 📋 Antes de Empezar

Tienes **3 scripts SQL** disponibles:

1. **`check-database-status.sql`** ← 👈 **EMPIEZA AQUÍ**
   - Solo verifica, no hace cambios
   - Identifica qué necesita corregirse

2. **`fix-owner-panel-SAFE.sql`** ← **VERSIÓN RECOMENDADA**
   - Versión segura con verificaciones
   - Maneja casos especiales
   - Muestra mensajes informativos

3. **`fix-owner-panel.sql`**
   - Versión original (más directa)
   - Usar solo si sabes lo que haces

---

## 🚀 PASO 1: Verificar Estado Actual

### 1.1 Abrir Supabase Dashboard

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto de CornellaLocal
3. En el menú lateral, haz clic en **"SQL Editor"**

### 1.2 Ejecutar Script de Verificación

1. Abre el archivo: `supabase/check-database-status.sql`
2. Copia **TODO** el contenido
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** (o presiona `Ctrl + Enter`)

### 1.3 Analizar Resultados

Verás varios resultados. Los más importantes son:

#### ✅ Resultado Esperado:
```
offers.business_id → ❌ INCORRECTO (debería ser integer)
```

#### ⚠️ Si ves:
```
offers.business_id → ✅ CORRECTO
```
**Entonces el problema ya está resuelto** y puedes saltar al PASO 3.

#### 📊 También verás:
- Cantidad de registros en cada tabla
- Estado de sincronización de negocios
- Políticas RLS activas
- Triggers existentes

**📸 RECOMENDACIÓN**: Haz captura de pantalla de los resultados para comparar después.

---

## 🛠️ PASO 2: Aplicar Correcciones

### 2.1 Ejecutar Script de Corrección

1. **Limpia el SQL Editor** (borra el contenido anterior)
2. Abre el archivo: `supabase/fix-owner-panel-SAFE.sql`
3. Copia **TODO** el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **"Run"**

### 2.2 Qué Esperar

El script mostrará mensajes como:

```
========================================
Estado actual de la base de datos:
- Ofertas en tabla: 0
- Negocios en tabla: 2
========================================

DETECTADO: offers.business_id es UUID, necesita corrección
La tabla offers está vacía, cambiando tipo directamente...
✅ Tipo de business_id cambiado a integer

========================================
✅ Sincronización completada
   Negocios verificados: 1
========================================

✅ Trigger de sincronización creado
✅ Política RLS para propietarios creada
✅ Política RLS para jobs ya existe
```

### 2.3 Si Hay Errores

#### Error: "offers table has data"
**Causa**: La tabla offers tiene datos con UUIDs que no pueden convertirse.

**Solución**:
```sql
-- Opción A: Eliminar datos de prueba (si no son importantes)
TRUNCATE TABLE public.offers CASCADE;

-- Luego vuelve a ejecutar fix-owner-panel-SAFE.sql
```

#### Error: "constraint already exists"
**Causa**: La corrección ya se aplicó parcialmente.

**Solución**: Continúa al siguiente paso, probablemente ya esté corregido.

---

## ✅ PASO 3: Aprobar Negocio de Prueba

Para que el panel funcione, necesitas un negocio con `verification_status = 'approved'`.

### 3.1 Ver tus Negocios

```sql
-- Ejecutar en SQL Editor:
SELECT
  id,
  name,
  owner_id,
  verification_status,
  is_verified
FROM public.businesses
WHERE owner_id = auth.uid();
```

### 3.2 Aprobar tu Negocio

Si aparece tu negocio pero con `verification_status = 'pending'`:

```sql
-- Ejecutar en SQL Editor:
UPDATE public.businesses
SET verification_status = 'approved'
WHERE owner_id = auth.uid();
```

### 3.3 Verificar que Funcionó

```sql
-- Ejecutar en SQL Editor:
SELECT
  name,
  verification_status,
  is_verified,
  CASE
    WHEN verification_status = 'approved' AND is_verified = true
    THEN '✅ TODO CORRECTO'
    ELSE '❌ ALGO FALLA'
  END as status
FROM public.businesses
WHERE owner_id = auth.uid();
```

**Deberías ver**: `✅ TODO CORRECTO`

---

## 🧪 PASO 4: Probar el Panel en la Aplicación

### 4.1 Recargar la Aplicación

1. Ve a tu aplicación en el navegador
2. Presiona **F5** para recargar completamente
3. Inicia sesión si no lo estás

### 4.2 Abrir Panel de Propietario

1. Ve a la pestaña **"Perfil"** (última pestaña)
2. Busca el botón **"Panel de Propietario"**
3. Haz clic en él

### 4.3 Verificar que Carga Correctamente

Deberías ver:
- ✅ Datos de tu negocio (nombre, logo, subcategoría)
- ✅ Estadísticas (empleos activos, ofertas, presupuestos)
- ✅ Botones de "Crear Empleo" y "Crear Oferta"
- ✅ Secciones de gestión

### 4.4 Abrir Consola del Navegador

1. Presiona **F12** para abrir DevTools
2. Ve a la pestaña **"Console"**
3. Busca mensajes como:

```
[BUSINESS] Negocio cargado: {id: 1, name: "Mi Negocio", ...}
[OWNER JOBS] Empleos del propietario cargados: 0
[OWNER OFFERS] Ofertas del propietario cargadas: 0
[BUDGET REQUESTS] Solicitudes cargadas: 0
```

**Si NO ves estos mensajes o ves errores**, continúa al PASO 5.

---

## 🎯 PASO 5: Prueba Completa - Crear Oferta

### 5.1 Ir a Crear Oferta

1. Desde el Panel de Propietario
2. Haz clic en **"Crear Oferta"**

### 5.2 Rellenar Formulario

**Datos mínimos**:
- **Título**: "Oferta de prueba"
- **Descripción**: "Descripción de prueba"
- **Tipo de descuento**: Selecciona "Porcentaje"
- **Descuento**: 20
- **Precio original**: 50

### 5.3 Publicar

1. Haz clic en **"Publicar Ahora"**
2. Espera a que aparezca un mensaje de éxito

### 5.4 Verificar en Consola

Deberías ver:
```
[OWNER OFFERS] Oferta creada: {id: "uuid-...", title: "Oferta de prueba", ...}
```

### 5.5 Ver en Panel

1. Vuelve al Panel de Propietario
2. Ve a **"Gestionar Ofertas"**
3. Deberías ver tu oferta de prueba listada

---

## 🆘 PASO 6: Troubleshooting

### Problema: "Error 403" en Consola

**Causa**: RLS policies bloqueando acceso.

**Verificar**:
```sql
-- ¿Está tu negocio verificado?
SELECT verification_status, is_verified
FROM public.businesses
WHERE owner_id = auth.uid();
```

Debe mostrar: `approved` y `true`

**Si no**, ejecuta:
```sql
UPDATE public.businesses
SET verification_status = 'approved'
WHERE owner_id = auth.uid();
```

---

### Problema: "Column 'business_id' does not exist"

**Causa**: El script de corrección no se ejecutó o falló.

**Solución**:
1. Vuelve al PASO 1 (verificar estado)
2. Ejecuta `check-database-status.sql`
3. Si `offers.business_id` sigue siendo UUID, repite PASO 2

---

### Problema: Panel no muestra datos del negocio

**Verificar en Consola**:
```
[BUSINESS] Negocio cargado: null
```

**Causa**: No tienes negocio asignado a tu usuario.

**Solución**:
```sql
-- Ver si tienes negocio
SELECT * FROM public.businesses
WHERE owner_id = auth.uid();

-- Si no aparece nada, necesitas crear un negocio desde la app
-- O asignar uno existente:
UPDATE public.businesses
SET owner_id = auth.uid()
WHERE id = 1; -- Cambiar por el ID del negocio que quieras
```

---

### Problema: "Cannot read property 'subcategory' of null"

**Causa**: Tu negocio no tiene el campo `subcategory` rellenado.

**Solución**:
```sql
UPDATE public.businesses
SET subcategory = 'Restaurante' -- o la categoría que corresponda
WHERE owner_id = auth.uid();
```

---

## ✅ Checklist Final

Marca cada ítem cuando lo completes:

- [ ] **PASO 1**: Script de verificación ejecutado
- [ ] **PASO 2**: Script de corrección ejecutado sin errores
- [ ] **PASO 3**: Negocio aprobado (`verification_status = 'approved'`)
- [ ] **PASO 4**: Panel carga correctamente
- [ ] **PASO 4**: Consola muestra `[BUSINESS] Negocio cargado`
- [ ] **PASO 4**: Consola muestra `[OWNER JOBS]`, `[OWNER OFFERS]`, `[BUDGET REQUESTS]`
- [ ] **PASO 5**: Oferta de prueba creada exitosamente
- [ ] **PASO 5**: Oferta aparece en "Gestionar Ofertas"

---

## 🎉 ¡Todo Listo!

Si completaste todos los pasos del checklist, **¡el panel de propietarios está funcionando correctamente!**

Ahora puedes:
- ✅ Crear ofertas y empleos
- ✅ Ver solicitudes de presupuesto entrantes
- ✅ Gestionar tu negocio

---

## 📞 ¿Necesitas Ayuda?

Si algo no funciona después de seguir todos los pasos:

1. **Revisa la consola del navegador** (F12 → Console)
2. **Copia el mensaje de error exacto**
3. **Ejecuta el script de verificación** de nuevo
4. **Comparte los resultados** para obtener ayuda específica

---

**Última actualización**: 2026-02-02
