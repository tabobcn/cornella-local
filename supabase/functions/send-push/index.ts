// ==============================================
// SUPABASE EDGE FUNCTION: SEND PUSH NOTIFICATION
// ==============================================
// Envía notificaciones push usando Web Push API
// Deploy: supabase functions deploy send-push
// ==============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@cornellalocal.es';

interface PushPayload {
  subscription: PushSubscription;
  title: string;
  message: string;
  url?: string;
  type?: string;
  icon?: string;
  requireInteraction?: boolean;
  metadata?: any;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Función para enviar push notification usando Web Push API
async function sendWebPush(payload: PushPayload): Promise<void> {
  const { subscription, title, message, url, type, icon, requireInteraction, metadata } = payload;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured');
  }

  // Payload de la notificación
  const notificationPayload = JSON.stringify({
    title,
    message,
    body: message, // Alias para compatibilidad
    url: url || '/',
    type: type || 'general',
    icon: icon || '/icons/icon-192x192.png',
    requireInteraction: requireInteraction || false,
    metadata: metadata || {},
    timestamp: Date.now()
  });

  // Headers para Web Push
  const headers = new Headers({
    'Content-Type': 'application/json',
    'TTL': '86400' // 24 horas
  });

  // Enviar usando el endpoint del subscription
  try {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers,
      body: notificationPayload
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Push failed: ${response.status} - ${errorText}`);
    }

    console.log('[SEND-PUSH] Notification sent successfully');
  } catch (error) {
    console.error('[SEND-PUSH] Error sending push:', error);
    throw error;
  }
}

serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parsear payload
    const payload: PushPayload = await req.json();

    console.log('[SEND-PUSH] Sending notification:', {
      title: payload.title,
      type: payload.type,
      endpoint: payload.subscription?.endpoint?.substring(0, 50) + '...'
    });

    // Validar
    if (!payload.subscription || !payload.title || !payload.message) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: subscription, title, message'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Enviar notificación push
    await sendWebPush(payload);

    return new Response(JSON.stringify({
      success: true,
      message: 'Push notification sent'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[SEND-PUSH] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
