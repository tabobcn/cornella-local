// ==============================================
// SUPABASE EDGE FUNCTION: SEND PUSH NOTIFICATION
// ==============================================
// Envía notificaciones push usando web-push (VAPID + cifrado)
// Deploy: npx supabase functions deploy send-push
// Secrets necesarios en Supabase:
//   VAPID_PUBLIC_KEY  — clave pública generada
//   VAPID_PRIVATE_KEY — clave privada generada
//   VAPID_SUBJECT     — mailto:noreply@cornellalocal.es
// ==============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import webPush from 'npm:web-push';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@cornellalocal.es';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('[SEND-PUSH] VAPID keys not configured in Edge Function secrets');
} else {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { subscription, title, message, url, type, icon, requireInteraction, metadata } = await req.json();

    if (!subscription || !title || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: subscription, title, message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({
      title,
      message,
      body: message,
      url: url || '/',
      type: type || 'general',
      icon: icon || '/icons/icon-192x192.png',
      requireInteraction: requireInteraction || false,
      metadata: metadata || {},
      timestamp: Date.now(),
    });

    console.log('[SEND-PUSH] Sending to endpoint:', subscription?.endpoint?.substring(0, 60) + '...');

    await webPush.sendNotification(subscription, payload, {
      TTL: 86400, // 24 horas
    });

    console.log('[SEND-PUSH] Notification sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[SEND-PUSH] Error:', error);

    // Si el subscription ya no es válido (410 Gone), devolver código especial para que el cliente lo desactive
    const statusCode = error.statusCode || 500;
    return new Response(JSON.stringify({
      error: 'Failed to send push notification',
      message: error.message,
      expired: statusCode === 410 || statusCode === 404,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
