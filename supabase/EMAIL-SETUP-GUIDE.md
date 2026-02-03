# 📧 Guía de Configuración: Notificaciones por Email

Sistema completo de emails automáticos usando **Resend** + **Supabase Edge Functions**.

---

## 📋 Resumen

Este sistema envía emails automáticos cuando:

1. ✅ **Nueva solicitud de presupuesto** → Propietario del negocio
2. ✅ **Respuesta a presupuesto** → Usuario que solicitó
3. ✅ **Nueva candidatura** → Propietario del negocio
4. ✅ **Cambio de estado de candidatura** → Candidato
5. ⭐ **Nueva oferta/empleo de favorito** → Usuarios (opcional)

---

## 🎯 Requisitos Previos

- [x] Cuenta de Supabase activa
- [x] Proyecto de Supabase configurado
- [x] Supabase CLI instalado (`npm install -g supabase`)
- [ ] Cuenta de Resend (gratuita: 100 emails/día, 3,000/mes)
- [ ] Dominio verificado en Resend (opcional, puede usar dominio de prueba)

---

## 🚀 PASO 1: Configurar Resend

### 1.1. Crear cuenta en Resend

1. Ve a [https://resend.com/signup](https://resend.com/signup)
2. Regístrate con tu email
3. Verifica tu email

### 1.2. Obtener API Key

1. Ve a **Settings** → **API Keys**
2. Haz clic en **Create API Key**
3. Dale un nombre: `CornellaLocal Production`
4. Copia la API key (solo se muestra una vez)
5. Guárdala de forma segura

### 1.3. Configurar dominio (IMPORTANTE)

**Opción A: Usar dominio de prueba (para testing)**
- Resend proporciona `onboarding@resend.dev` para pruebas
- Los emails solo se envían a tu email registrado
- **NO USAR EN PRODUCCIÓN**

**Opción B: Configurar tu dominio (recomendado para producción)**

1. Ve a **Domains** → **Add Domain**
2. Ingresa tu dominio: `cornellalocal.es`
3. Añade estos registros DNS a tu proveedor:

```dns
Type: TXT
Name: @
Value: [Resend te dará un valor]

Type: MX
Name: @
Value: feedback-smtp.eu-west-1.amazonses.com
Priority: 10

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@cornellalocal.es
```

4. Espera ~24h para verificación (puede ser más rápido)
5. Una vez verificado, cambia `from` en la Edge Function:

```typescript
from: 'CornellaLocal <noreply@cornellalocal.es>'
```

---

## 🔧 PASO 2: Habilitar pg_net en Supabase

La extensión `pg_net` permite llamar HTTP endpoints desde triggers SQL.

### 2.1. Habilitar extensión

1. Ve a **Supabase Dashboard** → Tu proyecto
2. **Database** → **Extensions**
3. Busca `pg_net`
4. Haz clic en **Enable**

### 2.2. Verificar instalación

Ejecuta en SQL Editor:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

Deberías ver un resultado.

---

## 📦 PASO 3: Desplegar Edge Function

### 3.1. Login en Supabase CLI

```bash
npx supabase login
```

### 3.2. Link al proyecto

```bash
npx supabase link --project-ref TU_PROJECT_REF
```

**¿Dónde encuentro el PROJECT_REF?**
- Dashboard → **Settings** → **General** → **Reference ID**

### 3.3. Configurar secretos

Añade tu API key de Resend como secreto:

```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

Verifica que se configuró:

```bash
npx supabase secrets list
```

### 3.4. Desplegar la función

```bash
npx supabase functions deploy send-email
```

Deberías ver:

```
✓ Deployed Function send-email
  URL: https://PROJECT_REF.supabase.co/functions/v1/send-email
```

### 3.5. Probar la función (opcional)

Prueba enviando un email de test:

```bash
curl -X POST https://PROJECT_REF.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_ANON_KEY" \
  -d '{
    "type": "new_budget_request",
    "to": "tu-email@example.com",
    "data": {
      "business_name": "Café del Barrio",
      "category": "Reformas",
      "description": "Necesito pintar mi local",
      "urgency": "normal",
      "app_url": "https://cornellalocal.vercel.app"
    }
  }'
```

---

## 🗄️ PASO 4: Configurar Variables de App en Base de Datos

Los triggers necesitan conocer la URL de Supabase y la anon key.

### 4.1. Ejecutar en SQL Editor:

```sql
-- Configurar URL de Supabase
ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://TU_PROJECT_REF.supabase.co';

-- Configurar Anon Key
ALTER DATABASE postgres SET app.settings.supabase_anon_key TO 'TU_ANON_KEY';
```

**¿Dónde encuentro estos valores?**
- Dashboard → **Settings** → **API**
- **Project URL**: `https://xxxxxx.supabase.co`
- **anon public key**: `eyJhbGc...`

### 4.2. Verificar configuración:

```sql
SELECT current_setting('app.settings.supabase_url', true);
SELECT current_setting('app.settings.supabase_anon_key', true);
```

---

## 🔨 PASO 5: Ejecutar Scripts SQL

### 5.1. Ejecutar triggers de email

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo `setup-email-triggers.sql`
3. Copia TODO el contenido
4. Pega en SQL Editor
5. Haz clic en **Run** (o Ctrl+Enter)

### 5.2. Verificar triggers creados

Ejecuta en SQL Editor:

```sql
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%email%'
ORDER BY event_object_table, trigger_name;
```

Deberías ver 4 triggers:
- `trigger_notify_new_budget_request` en `budget_requests`
- `trigger_notify_budget_response` en `budget_quotes`
- `trigger_notify_new_job_application_email` en `job_applications`
- `trigger_notify_application_status_change_email` en `job_applications`

---

## ✅ PASO 6: Testing End-to-End

### Test 1: Solicitud de Presupuesto

1. En la app, ve a **Solicitar Presupuesto**
2. Rellena el formulario y envía
3. Verifica que el propietario del negocio de esa categoría recibe un email

### Test 2: Respuesta a Presupuesto

1. Como propietario, responde a la solicitud
2. Verifica que el usuario que solicitó recibe un email

### Test 3: Nueva Candidatura

1. Aplica a una oferta de empleo
2. Verifica que el propietario recibe un email

### Test 4: Cambio de Estado

1. Como propietario, cambia el estado de una candidatura a "shortlisted"
2. Verifica que el candidato recibe un email

---

## 📊 Monitoreo y Logs

### Ver logs de Edge Function

```bash
npx supabase functions logs send-email
```

O en Dashboard → **Edge Functions** → `send-email` → **Logs**

### Ver logs de Resend

1. Ve a [https://resend.com/emails](https://resend.com/emails)
2. Verás todos los emails enviados con su estado
3. Puedes ver el contenido de cada email

### Troubleshooting común

**Email no se envía:**
1. Verifica que `pg_net` está habilitado
2. Verifica que el secreto `RESEND_API_KEY` está configurado
3. Verifica los logs: `npx supabase functions logs send-email`
4. Verifica que el trigger se ejecutó (logs de Postgres)

**Email se envía pero no llega:**
1. Revisa la carpeta de spam
2. Verifica el dominio en Resend
3. Si usas dominio de prueba, solo recibirás emails en tu email registrado

**Error "Email service not configured":**
- El secreto `RESEND_API_KEY` no está configurado
- Ejecuta: `npx supabase secrets set RESEND_API_KEY=tu_key`

---

## 🎨 Personalización

### Cambiar templates de email

Edita `supabase/functions/send-email/index.ts`:

```typescript
const getEmailTemplate = (type: string, data: any) => {
  // Modifica los templates HTML aquí
  // Cada template usa CSS inline para compatibilidad máxima
};
```

Redeploy:

```bash
npx supabase functions deploy send-email
```

### Cambiar URL de la app

En `setup-email-triggers.sql`, cambia:

```sql
app_url := 'https://tu-dominio.com';
```

### Añadir nuevos tipos de email

1. Añade template en `getEmailTemplate()`
2. Añade subject en `getEmailSubject()`
3. Crea trigger SQL que llame a `send_email_notification()`
4. Redeploy función

---

## 💰 Límites y Pricing de Resend

### Plan Gratuito
- ✅ 100 emails/día
- ✅ 3,000 emails/mes
- ✅ Todos los features
- ✅ Perfecto para empezar

### Plan Pro ($20/mes)
- ✅ 50,000 emails/mes
- ✅ Emails ilimitados/día
- ✅ Múltiples dominios

**Recomendación**: Empieza con plan gratuito, actualiza cuando llegues a ~2,500 emails/mes.

---

## 🔐 Seguridad

### Proteger Edge Function

La función ya está protegida por:
- ✅ Verificación de método POST
- ✅ Validación de payload
- ✅ CORS configurado
- ✅ Secretos en variables de entorno

### RLS Policies

Los triggers usan `SECURITY DEFINER`, lo que significa:
- Se ejecutan con permisos de superusuario
- No dependen de las RLS policies del usuario
- Son seguros si validas los datos correctamente

---

## 📝 Checklist Final

Antes de lanzar a producción:

- [ ] Cuenta de Resend creada
- [ ] API Key configurada en Supabase
- [ ] Dominio verificado en Resend (NO usar `onboarding@resend.dev`)
- [ ] Edge Function desplegada
- [ ] pg_net habilitado
- [ ] Variables de app configuradas (supabase_url, supabase_anon_key)
- [ ] Triggers SQL ejecutados
- [ ] Testing completo realizado
- [ ] Templates de email revisados y personalizados
- [ ] URL de la app actualizada en triggers
- [ ] Logs monitoreados

---

## 🎉 ¡Listo!

Ahora tienes un sistema completo de notificaciones por email totalmente automático.

**Próximos pasos opcionales**:
- Añadir notificaciones para favoritos (triggers comentados en SQL)
- Personalizar diseño de emails con tu branding
- Configurar DMARC/SPF/DKIM para mejor deliverability
- Añadir analytics de emails (open rate, click rate)

---

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs: `npx supabase functions logs send-email`
2. Verifica triggers: Query en SQL Editor
3. Revisa [Resend Docs](https://resend.com/docs)
4. Revisa [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)

---

**¿Preguntas?** Abre un issue en el repositorio o contacta al equipo.
