# 📧 Estrategia de Notificaciones por Email

## 🎯 Objetivo

Enviar emails **solo cuando sea realmente importante**, evitando spam y optimizando el uso del límite de Resend (100 emails/día gratis).

---

## ⚖️ Filosofía: In-App vs Email

### 📱 Notificaciones In-App (Ya implementadas)
**Para eventos frecuentes y menos urgentes:**
- ✅ Nuevas solicitudes de presupuesto
- ✅ Nuevas ofertas de negocios favoritos
- ✅ Nuevos empleos de negocios favoritos
- ✅ Respuestas a entrevistas

**Ventajas:**
- Sin límites de cantidad
- Instantáneas con Supabase Realtime
- Menos intrusivas
- Usuario las ve cuando abre la app

### 📧 Emails (Selectivos)
**Solo para eventos críticos que requieren acción inmediata:**
- ✅ Nueva candidatura recibida → Propietario
- ✅ Cambio de estado de candidatura → Candidato
- ✅ Respuesta a tu presupuesto → Usuario

**Ventajas:**
- Usuario se entera aunque NO abra la app
- Para cosas que requieren acción rápida
- Mayor tasa de conversión

---

## 📊 Análisis de Consumo

### Escenario Real: App con Tráfico Moderado

**Solicitudes de presupuesto:**
```
8 solicitudes/día
× 30 negocios en esa categoría
= 240 emails/día ❌
```

**Candidaturas a empleos:**
```
10 candidaturas/día
× 1 email por candidatura
= 10 emails/día ✅
```

**Cambios de estado:**
```
10 candidaturas/día
× ~2 cambios de estado promedio
= 20 emails/día ✅
```

**Respuestas a presupuestos:**
```
8 solicitudes/día
× 1 respuesta promedio
= 8 emails/día ✅
```

### Total con TODO habilitado:
```
Presupuestos: 240 emails/día
Candidaturas:  10 emails/día
Estados:       20 emails/día
Respuestas:     8 emails/día
Favoritos:    ~50 emails/día (si hay 100 usuarios con favoritos)
─────────────────────────────
TOTAL:        328 emails/día ❌❌❌
```
**Límite gratis: 100 emails/día**
→ Necesitarías plan de pago desde el día 1

### Total OPTIMIZADO (Recomendado):
```
Candidaturas:  10 emails/día
Estados:       20 emails/día
Respuestas:     8 emails/día
─────────────────────────────
TOTAL:         38 emails/día ✅✅✅
```
**Sobran 62 emails/día para crecer**

---

## ✅ Configuración Recomendada

### Triggers HABILITADOS (Por defecto)

#### 1. Nueva Candidatura → Propietario
**Por qué SÍ:**
- Es crítico: el propietario necesita saber de inmediato
- Bajo volumen: ~10 emails/día
- Alta conversión: el propietario revisará la candidatura

**Ejemplo:**
```
De: CornellaLocal <noreply@cornellalocal.es>
Para: cafe@example.com
Asunto: 👤 Nueva candidatura para Camarero/a

María López ha aplicado a tu oferta de empleo.
[Ver Candidatura]
```

#### 2. Cambio de Estado → Candidato
**Por qué SÍ:**
- Es crítico: afecta directamente al candidato
- Volumen controlado: ~20 emails/día
- Muy importante: "Has sido contratado" no puede perderse

**Ejemplo:**
```
De: CornellaLocal <noreply@cornellalocal.es>
Para: candidato@gmail.com
Asunto: 🎉 ¡Felicidades! Has sido contratado

Cafetería La Esquina te ha seleccionado.
[Ver Detalles]
```

#### 3. Respuesta a Presupuesto → Usuario
**Por qué SÍ:**
- Es importante: el usuario pidió el presupuesto
- Volumen bajo: ~8 emails/día
- Ya filtrado: solo 1 email por respuesta, no por solicitud

**Ejemplo:**
```
De: CornellaLocal <noreply@cornellalocal.es>
Para: usuario@gmail.com
Asunto: 📋 Respuesta a tu presupuesto

Reformas García te ha respondido: 1,500€
[Ver Respuesta]
```

---

### Triggers DESHABILITADOS (Por defecto)

#### 4. Nueva Solicitud de Presupuesto → Propietarios
**Por qué NO:**
- ❌ Demasiados emails (30 negocios × 8 solicitudes = 240/día)
- ❌ Bajo engagement (muchos negocios no responderán)
- ✅ Alternativa: Notificación in-app (ya implementada)

**Si QUIERES habilitarlo:**
Solo si limitas a negocios específicos (ej: los 5 mejor valorados de la categoría)

#### 5. Nueva Oferta de Favorito → Usuarios
**Por qué NO:**
- ❌ Puede ser spam (un negocio con 100 favoritos = 100 emails)
- ❌ No es urgente
- ✅ Alternativa: Notificación in-app (ya implementada)

**Si QUIERES habilitarlo:**
Solo con opt-in (checkbox "Quiero emails de mis favoritos")

#### 6. Nuevo Empleo de Favorito → Usuarios
**Por qué NO:**
- Misma razón que ofertas
- ✅ Alternativa: Notificación in-app

---

## 🔧 Cómo Habilitar Triggers Opcionales

Si en el futuro quieres habilitar presupuestos o favoritos:

### Opción 1: Habilitar para TODOS (No recomendado)
En `setup-email-triggers.sql`, descomenta:

```sql
-- Presupuestos
DROP TRIGGER IF EXISTS trigger_notify_new_budget_request ON public.budget_requests;
CREATE TRIGGER trigger_notify_new_budget_request
  AFTER INSERT ON public.budget_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_budget_request();

-- Favoritos
DROP TRIGGER IF EXISTS trigger_notify_favorite_new_offer ON public.offers;
CREATE TRIGGER trigger_notify_favorite_new_offer
  AFTER INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_favorite_new_offer();
```

### Opción 2: Limitar a Top Negocios (Recomendado si habilitas)

Modifica la función para solo notificar a los **5 negocios mejor valorados**:

```sql
CREATE OR REPLACE FUNCTION notify_new_budget_request()
RETURNS TRIGGER AS $$
DECLARE
  business_data RECORD;
  app_url TEXT;
BEGIN
  app_url := 'https://cornellalocal.vercel.app';

  -- Solo top 5 negocios mejor valorados
  FOR business_data IN
    SELECT
      businesses.id,
      businesses.name,
      profiles.email as owner_email
    FROM public.businesses
    JOIN public.profiles ON businesses.owner_id = profiles.id
    WHERE businesses.subcategory = NEW.subcategory
      AND businesses.is_verified = true
      AND profiles.email IS NOT NULL
    ORDER BY businesses.rating DESC
    LIMIT 5  -- 🔥 CLAVE: Solo top 5
  LOOP
    PERFORM send_email_notification(
      'new_budget_request',
      business_data.owner_email,
      jsonb_build_object(
        'business_name', business_data.name,
        'category', NEW.subcategory,
        'description', NEW.description,
        'urgency', NEW.urgency,
        'app_url', app_url,
        'request_id', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Consumo con LIMIT 5:**
```
8 solicitudes/día × 5 negocios = 40 emails/día
Total: 78 emails/día ✅ (Dentro del límite)
```

---

## 📈 Escalabilidad

### Si creces y necesitas más emails:

**Plan Resend Pro: $20/mes**
- 50,000 emails/mes
- ~1,600 emails/día

**Cuándo actualizar:**
- Cuando tengas >80 emails/día consistentemente
- Cuando el negocio esté generando ingresos

**Alternativas si creces mucho:**
- Amazon SES: $0.10 por 1,000 emails
- SendGrid: Similar a Resend
- Mailgun: $35/mes por 50k emails

---

## 🎯 Reglas de Oro

1. **Email = Urgente y Crítico**
   - Si puede esperar → In-app notification
   - Si requiere acción inmediata → Email

2. **Respeta al Usuario**
   - No envíes >1 email/día por usuario
   - Agrupa notificaciones cuando sea posible

3. **Monitorea el Consumo**
   - Revisa Resend Dashboard semanalmente
   - Si te acercas al límite, desactiva triggers menos importantes

4. **Opt-in para Marketing**
   - Ofertas de favoritos = Marketing
   - Requiere consentimiento explícito

5. **Testing Primero**
   - Prueba con tu propio email
   - Verifica que no vayan a spam
   - Asegúrate que el diseño se ve bien

---

## 📊 Dashboard de Monitoreo

### Resend Dashboard
[https://resend.com/overview](https://resend.com/overview)

**Métricas clave:**
- Emails enviados hoy
- Tasa de entrega (debería ser >98%)
- Tasa de apertura (objetivo: >20%)
- Emails rebotados (debería ser <2%)

### Supabase Logs
```bash
npx supabase functions logs send-email
```

**Qué buscar:**
- Errores 500 (revisar API key)
- Errores 400 (revisar formato de data)
- Success 200 ✅

---

## ✅ Checklist de Producción

Antes de lanzar:

- [ ] Solo 3 triggers habilitados (candidaturas, estados, respuestas)
- [ ] Presupuestos deshabilitados (o con LIMIT 5)
- [ ] Favoritos deshabilitados (o con opt-in)
- [ ] Dominio verificado en Resend
- [ ] Email de remitente: noreply@cornellalocal.es
- [ ] Templates probados y sin errores
- [ ] Monitoreo configurado
- [ ] Plan de backup si se agota el límite

---

## 🆘 Plan de Contingencia

### Si te quedas sin emails (>100/día):

**Opción 1: Deshabilitar triggers no críticos**
```sql
-- Deshabilitar presupuestos temporalmente
DROP TRIGGER IF EXISTS trigger_notify_new_budget_request ON public.budget_requests;
```

**Opción 2: Actualizar a plan de pago**
- Resend Pro: $20/mes → 50k emails/mes
- Se activa instantáneamente

**Opción 3: Rate limiting**
Añadir en la función:
```sql
-- Solo enviar si no se ha enviado email en última hora
WHERE NOT EXISTS (
  SELECT 1 FROM email_log
  WHERE user_id = target_user
  AND sent_at > NOW() - INTERVAL '1 hour'
)
```

---

## 📝 Resumen

**Configuración ACTUAL (Optimizada):**
- ✅ 3 triggers habilitados (críticos)
- ❌ 3 triggers deshabilitados (opcionales)
- 📊 ~38 emails/día estimados
- 💰 Gratis para siempre con plan actual

**Beneficios:**
- Usuario recibe emails solo de lo importante
- No spam
- Dentro del límite gratuito
- Escalable si crece el negocio

**Alternativas ya implementadas:**
- Notificaciones in-app en tiempo real
- Badge de contador de notificaciones
- Sistema completo sin depender de emails

---

¿Preguntas? Revisa `EMAIL-SETUP-GUIDE.md` para más detalles técnicos.
