# 📧 Notificaciones por Email - Referencia Rápida

> ⚠️ **DOC OBSOLETA (auditoría 2026-05-10)** — Los triggers SQL de este proyecto
> usan `app.settings.supabase_service_role_key` desde Vault, **no `anon_key`**.
> Si vas a re-ejecutar setup, usa `setup-email-triggers.sql` actualizado.
> Mantenido como referencia histórica.

## 🚀 Setup Inicial (Solo una vez)

```bash
# 1. Login y link al proyecto
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF

# 2. Configurar API Key de Resend
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

# 3. Desplegar función
npx supabase functions deploy send-email

# 4. Habilitar pg_net en Dashboard
# Dashboard → Database → Extensions → pg_net → Enable

# 5. Ejecutar SQL
# Copiar contenido de setup-email-triggers.sql
# SQL Editor → Run

# 6. Configurar variables de app (SQL Editor)
ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://xxx.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_anon_key TO 'eyJhbGc...';
```

---

## 📋 Comandos Útiles

```bash
# Ver secretos configurados
npx supabase secrets list

# Ver logs de la función
npx supabase functions logs send-email

# Ver logs en tiempo real
npx supabase functions logs send-email --follow

# Redeployar después de cambios
npx supabase functions deploy send-email

# Actualizar secreto
npx supabase secrets set RESEND_API_KEY=nueva_key
```

---

## 🧪 Testing Manual

```bash
# Probar con curl
curl -X POST https://PROJECT_REF.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{
    "type": "new_budget_request",
    "to": "tu-email@example.com",
    "data": {
      "business_name": "Test Business",
      "category": "Test Category",
      "description": "Test description",
      "app_url": "https://cornellalocal.vercel.app"
    }
  }'

# O usar el script de testing
bash supabase/test-email-function.sh
```

---

## 📊 Tipos de Email Disponibles

| Tipo | Trigger | Destinatario |
|------|---------|--------------|
| `new_budget_request` | INSERT en budget_requests | Propietarios de la categoría |
| `budget_response` | INSERT en budget_quotes | Usuario solicitante |
| `new_job_application` | INSERT en job_applications | Propietario del negocio |
| `application_status_change` | UPDATE en job_applications | Candidato |
| `new_offer_favorite` | INSERT en offers (opcional) | Usuarios con favorito |

---

## 🔍 Troubleshooting

### Email no se envía

```sql
-- 1. Verificar que pg_net está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- 2. Verificar triggers creados
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%email%';

-- 3. Verificar variables de app
SELECT current_setting('app.settings.supabase_url', true);
SELECT current_setting('app.settings.supabase_anon_key', true);
```

```bash
# 4. Ver logs de la función
npx supabase functions logs send-email

# 5. Ver secretos
npx supabase secrets list
```

### Email se envía pero no llega

1. Revisa carpeta de spam
2. Verifica dominio en Resend: [https://resend.com/domains](https://resend.com/domains)
3. Revisa emails enviados: [https://resend.com/emails](https://resend.com/emails)
4. Si usas `onboarding@resend.dev`, solo recibirás en tu email registrado

---

## 🎨 Personalización

### Cambiar remitente

En `supabase/functions/send-email/index.ts`:

```typescript
from: 'CornellaLocal <noreply@cornellalocal.es>'
```

### Cambiar URL de la app

En `supabase/setup-email-triggers.sql`:

```sql
app_url := 'https://tu-dominio.com';
```

### Modificar templates

En `supabase/functions/send-email/index.ts`:

```typescript
const getEmailTemplate = (type: string, data: any) => {
  // Edita el HTML aquí
};
```

Luego redeploy:

```bash
npx supabase functions deploy send-email
```

---

## 📈 Monitoreo

### Dashboard de Resend

- Ver emails enviados: [https://resend.com/emails](https://resend.com/emails)
- Ver API keys: [https://resend.com/api-keys](https://resend.com/api-keys)
- Ver dominios: [https://resend.com/domains](https://resend.com/domains)
- Ver estadísticas: [https://resend.com/overview](https://resend.com/overview)

### Logs de Supabase

```bash
# Ver últimos logs
npx supabase functions logs send-email --limit 50

# Seguir logs en tiempo real
npx supabase functions logs send-email --follow
```

---

## 💰 Límites

**Plan Gratuito de Resend:**
- 100 emails/día
- 3,000 emails/mes
- Todos los features

**Cuándo actualizar:**
- Cuando alcances ~80 emails/día consistentemente
- Cuando necesites más de 2,500 emails/mes

---

## ✅ Checklist de Producción

- [ ] Dominio verificado en Resend (NO usar `onboarding@resend.dev`)
- [ ] API Key configurada como secreto
- [ ] Edge Function desplegada
- [ ] pg_net habilitado
- [ ] Triggers SQL ejecutados
- [ ] Variables de app configuradas
- [ ] Templates personalizados con branding
- [ ] URL de app actualizada
- [ ] Testing completo realizado
- [ ] Logs monitoreados

---

## 🔗 Links Útiles

- [Resend Dashboard](https://resend.com)
- [Resend Docs](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Guía completa: EMAIL-SETUP-GUIDE.md](./EMAIL-SETUP-GUIDE.md)

---

## 📞 Soporte

Si algo no funciona:

1. Revisa los logs
2. Verifica la configuración con los comandos de troubleshooting
3. Revisa la [guía completa](./EMAIL-SETUP-GUIDE.md)
4. Revisa [Resend Docs](https://resend.com/docs)
