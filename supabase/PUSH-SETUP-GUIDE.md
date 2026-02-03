# 📱 Guía de Setup: Web Push Notifications

Sistema completo de notificaciones push nativas usando **Web Push API** + **Supabase**.

---

## 🎯 ¿Qué incluye?

Push notifications para:
- ✅ Nueva solicitud de presupuesto → Propietarios (top 5 mejor valorados)
- ✅ Respuesta a presupuesto → Usuario
- ✅ Nueva candidatura → Propietario
- ✅ Cambio de estado candidatura → Candidato
- ✅ Nueva oferta de favorito → Usuarios

**Ventajas:**
- ✅ **Gratis 100%** (sin límites)
- ✅ Funciona **aunque la app esté cerrada**
- ✅ Aparece en **pantalla de bloqueo**
- ✅ Con **sonido y vibración**
- ✅ Compatible con **Chrome, Firefox, Edge, Safari**

---

## 🚀 Setup Rápido (30 minutos)

### PASO 1: Generar VAPID Keys (2 min)

Las VAPID keys son necesarias para autenticar tus push notifications.

```bash
cd supabase
node generate-vapid-keys.js
```

**Salida:**
```
🔑 Generando VAPID Keys...

✅ VAPID Keys generadas:

📌 CLAVE PÚBLICA (Public Key):
BKxW8QC...xyz (copia esto)

🔒 CLAVE PRIVADA (Private Key):
MN4opQ...abc (copia esto)
```

**⚠️ IMPORTANTE:**
- Guarda ambas claves de forma segura
- La **privada** NUNCA va en el código público
- La **pública** SÍ va en el frontend

---

### PASO 2: Configurar VAPID Keys en Supabase (3 min)

#### Opción A: Usando CLI (Recomendado)

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF

npx supabase secrets set VAPID_PUBLIC_KEY="TU_CLAVE_PUBLICA"
npx supabase secrets set VAPID_PRIVATE_KEY="TU_CLAVE_PRIVADA"
npx supabase secrets set VAPID_SUBJECT="mailto:noreply@cornellalocal.es"
```

#### Opción B: Usando Dashboard

1. Ve a **Supabase Dashboard** → Tu proyecto
2. **Project Settings** → **Edge Functions** → **Secrets**
3. Añade los 3 secretos:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`

---

### PASO 3: Desplegar Edge Function (2 min)

```bash
npx supabase functions deploy send-push
```

Deberías ver:
```
✓ Deployed Function send-push
  URL: https://xxx.supabase.co/functions/v1/send-push
```

---

### PASO 4: Ejecutar SQL Setup (3 min)

1. **Supabase Dashboard** → **SQL Editor**
2. Abre `supabase/setup-push-notifications.sql`
3. Copia TODO el contenido
4. Pega y haz clic en **Run**

Esto crea:
- ✅ Tabla `push_subscriptions`
- ✅ 5 triggers automáticos
- ✅ Funciones helper
- ✅ RLS policies

---

### PASO 5: Añadir VAPID Public Key al Frontend (5 min)

Edita `src/App.jsx` y añade al inicio (después de los imports):

```javascript
// VAPID Public Key para Push Notifications
const VAPID_PUBLIC_KEY = 'TU_CLAVE_PUBLICA_AQUI';
```

---

### PASO 6: Añadir código de suscripción (10 min)

Añade estas funciones en el componente App principal (antes del return):

```javascript
// Estado para push notifications
const [pushSupported, setPushSupported] = useState(false);
const [pushPermission, setPushPermission] = useState('default');

// Verificar soporte de push al cargar
useEffect(() => {
  if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
    setPushSupported(true);
    setPushPermission(Notification.permission);
  }
}, []);

// Función para solicitar permisos y suscribirse
const requestPushPermission = async () => {
  if (!pushSupported) {
    showToast('Tu navegador no soporta notificaciones push', 'error');
    return false;
  }

  try {
    // Solicitar permiso
    const permission = await Notification.requestPermission();
    setPushPermission(permission);

    if (permission !== 'granted') {
      showToast('Necesitamos permisos para enviarte notificaciones', 'warning');
      return false;
    }

    // Registrar Service Worker
    const registration = await navigator.serviceWorker.ready;

    // Convertir VAPID key de base64 a Uint8Array
    const urlBase64ToUint8Array = (base64String) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    // Suscribirse a push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Guardar subscription en Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: subscription.toJSON(),
        user_agent: navigator.userAgent
      }, {
        onConflict: 'user_id,subscription->endpoint'
      });

    if (error) {
      console.error('[PUSH] Error guardando subscription:', error);
      return false;
    }

    console.log('[PUSH] Subscription guardada correctamente');
    showToast('¡Notificaciones activadas! 🔔', 'success');
    return true;

  } catch (error) {
    console.error('[PUSH] Error al suscribirse:', error);
    showToast('Error al activar notificaciones', 'error');
    return false;
  }
};

// Escuchar mensajes del Service Worker (para navegación)
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NAVIGATE') {
        console.log('[PUSH] Navegando desde push:', event.data.url);
        // Aquí puedes usar tu función de navegación
        // navigate(event.data.url);
      }
    });
  }
}, []);
```

---

### PASO 7: Añadir Modal de Permisos (5 min)

Crea un modal que aparezca la primera vez que el usuario inicia sesión:

```javascript
// En el componente App, después del login exitoso:
useEffect(() => {
  const askForPushPermission = async () => {
    // Solo preguntar si el usuario está logueado y nunca ha respondido
    if (user && pushPermission === 'default' && pushSupported) {
      // Esperar 2 segundos después del login para no ser intrusivo
      setTimeout(() => {
        // Mostrar modal explicando los beneficios
        const shouldAsk = confirm(
          '🔔 ¿Quieres recibir notificaciones instantáneas?\n\n' +
          '✅ Nuevas candidaturas\n' +
          '✅ Respuestas a presupuestos\n' +
          '✅ Ofertas de tus favoritos\n\n' +
          'Las notificaciones llegarán aunque la app esté cerrada.'
        );

        if (shouldAsk) {
          requestPushPermission();
        }
      }, 2000);
    }
  };

  askForPushPermission();
}, [user, pushPermission, pushSupported]);
```

---

### PASO 8: Testing (5 min)

#### Test Manual:

1. **Abre la app en modo incógnito**
2. **Haz login**
3. **Acepta las notificaciones push** cuando se pida
4. **Verifica en consola:** `[PUSH] Subscription guardada correctamente`

#### Verificar subscription en Supabase:

```sql
SELECT
  id,
  user_id,
  subscription->>'endpoint' as endpoint,
  is_active,
  created_at
FROM push_subscriptions;
```

Deberías ver tu subscription registrada.

#### Enviar push de prueba:

En otro navegador/dispositivo, haz una acción que genere push:
- Solicita un presupuesto
- Aplica a un empleo
- Crea una oferta (si tienes negocio en favoritos)

**La notificación debería aparecer:**
```
┌─────────────────────────────┐
│ 🔵 CornellaLocal            │
│ 💼 Nueva Solicitud          │
│ Tienes una nueva solicitud  │
│ en Reformas                 │
└─────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Notificación no llega:

**1. Verificar permisos:**
```javascript
console.log('Permission:', Notification.permission);
// Debe ser "granted"
```

**2. Verificar Service Worker:**
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

**3. Verificar triggers SQL:**
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%push%';
```

**4. Ver logs de Edge Function:**
```bash
npx supabase functions logs send-push
```

### Error "Registration failed":

- Verifica que el Service Worker esté registrado
- Verifica que HTTPS esté habilitado (localhost está OK)
- Verifica que VAPID keys estén configuradas

### Subscription se guarda pero no llega push:

- Verifica que pg_net esté habilitado
- Verifica que las variables de app estén configuradas:
  ```sql
  SELECT current_setting('app.settings.supabase_url', true);
  SELECT current_setting('app.settings.supabase_anon_key', true);
  ```

---

## 📊 Monitoreo

### Subscriptions activas:

```sql
SELECT
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_subs
FROM push_subscriptions;
```

### Limpiar subscriptions antiguas:

```sql
SELECT cleanup_old_push_subscriptions();
```

Esto elimina subscriptions inactivas de hace >30 días.

---

## 🎨 Personalización

### Cambiar vibración:

En `public/sw.js`:
```javascript
vibrate: [300, 100, 300]  // Patrón personalizado
```

### Cambiar icono:

En SQL triggers, modifica:
```sql
notification_icon := '/tu-icono-personalizado.png',
```

### Añadir botones de acción:

En Service Worker:
```javascript
actions: [
  { action: 'accept', title: 'Aceptar', icon: '/icon-accept.png' },
  { action: 'reject', title: 'Rechazar', icon: '/icon-reject.png' }
]
```

---

## 📈 Estadísticas de Uso

### Push notifications enviadas hoy:

```sql
SELECT
  COUNT(*) as notifications_sent,
  DATE(last_used_at) as date
FROM push_subscriptions
WHERE last_used_at >= CURRENT_DATE
GROUP BY DATE(last_used_at);
```

---

## ✅ Checklist de Producción

- [ ] VAPID keys generadas y configuradas
- [ ] Edge Function desplegada
- [ ] SQL triggers ejecutados
- [ ] VAPID Public Key añadida al frontend
- [ ] Código de suscripción implementado
- [ ] Modal de permisos añadido
- [ ] Testing completo realizado
- [ ] Service Worker funcionando
- [ ] HTTPS habilitado en producción
- [ ] Iconos de notificación listos (192x192, 72x72)

---

## 🚀 Desplegar a Producción

### 1. Verificar HTTPS

Las push notifications **SOLO funcionan en HTTPS** (excepto localhost).

Vercel ya proporciona HTTPS automáticamente ✅

### 2. Verificar Service Worker

El Service Worker debe estar en la raíz (`/sw.js`).

Vercel configuration:
```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        },
        {
          "key": "Cache-Control",
          "value": "no-cache"
        }
      ]
    }
  ]
}
```

### 3. Deploy

```bash
git add .
git commit -m "Implementar Web Push Notifications"
git push origin main
```

Vercel desplegará automáticamente.

---

## 🎉 ¡Listo!

Tu app ahora tiene **notificaciones push nativas** que funcionan como WhatsApp:

- ✅ Aparecen aunque la app esté cerrada
- ✅ En la pantalla de bloqueo
- ✅ Con sonido y vibración
- ✅ Gratis para siempre
- ✅ Sin límites

---

## 📞 Soporte

**Problemas comunes:**
- "Service Worker not found" → Verifica que `public/sw.js` existe
- "Subscription failed" → Verifica VAPID keys
- "Notification blocked" → Usuario debe aceptar permisos manualmente

**Documentación:**
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
