// ==============================================
// SUPABASE EDGE FUNCTION: SEND PUSH NOTIFICATION
// ==============================================
// Implementación RFC 8291 (aes128gcm) con Deno Web Crypto nativo
// Deploy: npx supabase functions deploy send-push  (verify_jwt habilitado)
// ==============================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const ALLOWED_ORIGINS = new Set([
  'https://www.cornellalocal.es',
  'https://cornellalocal.es',
  'http://localhost:3000',
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.cornellalocal.es';
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };
}

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@cornellalocal.es';
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL') || '';
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';

function decodeJwtPayload(jwt: string): { sub?: string; role?: string } | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
    return JSON.parse(atob(pad));
  } catch {
    return null;
  }
}

// ── base64url ─────────────────────────────────────────────────────────────────

function b64uEncode(buf: Uint8Array): string {
  let s = '';
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
  return Uint8Array.from(atob(pad), c => c.charCodeAt(0));
}

function concat(...parts: (Uint8Array | string | number[])[]): Uint8Array {
  const arrays = parts.map(p =>
    typeof p === 'string' ? new TextEncoder().encode(p) :
    p instanceof Uint8Array ? p : new Uint8Array(p)
  );
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

// ── HKDF (manual, RFC 5869) ───────────────────────────────────────────────────

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, ikm));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const out = new Uint8Array(length);
  let prev = new Uint8Array(0);
  let filled = 0;
  for (let i = 1; filled < length; i++) {
    prev = new Uint8Array(await crypto.subtle.sign('HMAC', k, concat(prev, info, [i])));
    out.set(prev.slice(0, Math.min(prev.length, length - filled)), filled);
    filled += prev.length;
  }
  return out;
}

// ── VAPID JWT (ES256) ─────────────────────────────────────────────────────────

async function vapidJwt(endpoint: string): Promise<string> {
  const aud = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header  = b64uEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64uEncode(new TextEncoder().encode(JSON.stringify({ aud, exp: now + 43200, sub: VAPID_SUBJECT })));
  const input   = `${header}.${payload}`;
  const privKey = await crypto.subtle.importKey(
    'pkcs8', b64uDecode(VAPID_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(input));
  return `${input}.${b64uEncode(new Uint8Array(sig))}`;
}

// ── RFC 8291 payload encryption ───────────────────────────────────────────────

async function encryptPayload(keys: { p256dh: string; auth: string }, plaintext: string): Promise<Uint8Array> {
  const auth        = b64uDecode(keys.auth);       // 16 bytes
  const receiverPub = b64uDecode(keys.p256dh);     // 65 bytes

  // Ephemeral sender EC key pair
  const senderKP  = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const senderPub = new Uint8Array(await crypto.subtle.exportKey('raw', senderKP.publicKey)); // 65 bytes

  // ECDH shared secret (256 bits)
  const receiverKey  = await crypto.subtle.importKey('raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret   = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderKP.privateKey, 256));

  // RFC 8291 §3.3 key derivation
  // PRK_key = HKDF-Extract(salt=auth, IKM=ecdhSecret)
  const prkKey = await hkdfExtract(auth, ecdhSecret);

  // IKM = HKDF-Expand(PRK_key, "WebPush: info\0" || receiverPub || senderPub, 32)
  const keyInfo = concat('WebPush: info\x00', receiverPub, senderPub);
  const ikm     = await hkdfExpand(prkKey, keyInfo, 32);

  // RFC 8188 §2.1 content encryption keys
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk  = await hkdfExtract(salt, ikm);

  const cekBytes = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), 16);
  const nonce    = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: nonce\x00'),    12);

  // Import CEK
  const cek = await crypto.subtle.importKey('raw', cekBytes, 'AES-GCM', false, ['encrypt']);

  // Pad plaintext: content + \x02 (no additional padding)
  const pt     = new TextEncoder().encode(plaintext);
  const padded = concat(pt, [2]); // \x02 = end-of-record delimiter

  // Encrypt
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cek, padded));

  // RFC 8188 §2.1 header: salt(16) + rs(4) + idlen(1) + keyid(65)
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + senderPub.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = senderPub.length; // 65
  header.set(senderPub, 21);

  return concat(header, ciphertext);
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const { subscription, title, message, url, type, icon, requireInteraction, metadata } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys || !title || !message) {
      return new Response(JSON.stringify({ error: 'Missing: subscription, title, message' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Validar caller:
    // - service_role (triggers internos / edge functions con clave): bypass total.
    // - authenticated (cliente): EXIGIMOS que la subscription pertenezca al sub del JWT.
    // - anon/sin claims: bloqueado. Los triggers SQL deben llamar con service_role.
    const authHeader = req.headers.get('Authorization') || '';
    const callerJwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const claims = decodeJwtPayload(callerJwt);

    if (claims?.role === 'service_role') {
      if (!SERVICE_ROLE_KEY || callerJwt !== SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
    } else if (claims?.role !== 'authenticated') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (claims.role === 'authenticated') {
      if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.error('[PUSH] Missing SUPABASE_URL or SERVICE_ROLE_KEY for ownership check');
        return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      const { data: verifiedUser, error: verifyErr } = await admin.auth.getUser(callerJwt);
      const callerUserId = verifiedUser?.user?.id;
      if (verifyErr || !callerUserId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      const { data: owned, error: ownErr } = await admin
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', callerUserId)
        .filter('subscription->>endpoint', 'eq', subscription.endpoint)
        .limit(1)
        .maybeSingle();
      if (ownErr || !owned) {
        console.error('[PUSH] Ownership check failed:', ownErr);
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
    }

    const payload = JSON.stringify({ title, body: message, url: url || '/', type: type || 'general', icon: icon || '/icons/icon-192x192.png', requireInteraction: !!requireInteraction, metadata: metadata || {}, timestamp: Date.now() });

    console.log('[PUSH] Sending to:', subscription.endpoint.substring(0, 60));

    const [vapidToken, body] = await Promise.all([
      vapidJwt(subscription.endpoint),
      encryptPayload(subscription.keys, payload),
    ]);

    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${vapidToken},k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body,
    });

    const ok = res.ok || res.status === 201;
    if (!ok) {
      const text = await res.text().catch(() => '');
      console.error('[PUSH] Error:', res.status, text);
      return new Response(JSON.stringify({ error: `Push service ${res.status}`, expired: res.status === 410 || res.status === 404 }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    console.log('[PUSH] OK:', res.status);
    return new Response(JSON.stringify({ success: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[PUSH] Exception:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
