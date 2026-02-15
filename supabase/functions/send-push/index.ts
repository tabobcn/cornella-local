// ==============================================
// SUPABASE EDGE FUNCTION: SEND PUSH NOTIFICATION
// ==============================================
// Deploy: npx supabase functions deploy send-push
// Secrets necesarios:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// ==============================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@cornellalocal.es';

// ── base64url helpers ─────────────────────────────────────────────────────────

function b64uEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')), c => c.charCodeAt(0));
}

// ── HKDF helper ───────────────────────────────────────────────────────────────

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<CryptoKey> {
  const k = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = await crypto.subtle.sign('HMAC', k, ikm);
  return crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function hkdfExpand(prk: CryptoKey, info: Uint8Array, length: number): Promise<Uint8Array> {
  const result = new Uint8Array(length);
  let t = new Uint8Array(0);
  let offset = 0;
  for (let i = 1; offset < length; i++) {
    const input = new Uint8Array([...t, ...info, i]);
    t = new Uint8Array(await crypto.subtle.sign('HMAC', prk, input));
    result.set(t.slice(0, Math.min(t.length, length - offset)), offset);
    offset += t.length;
  }
  return result;
}

// ── VAPID JWT ─────────────────────────────────────────────────────────────────

async function createVapidJwt(endpoint: string): Promise<string> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const hdr = b64uEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const pld = b64uEncode(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })));
  const input = `${hdr}.${pld}`;

  const privBytes = b64uDecode(VAPID_PRIVATE_KEY!);
  const key = await crypto.subtle.importKey('pkcs8', privBytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(input));
  return `${input}.${b64uEncode(sig)}`;
}

// ── Encrypt payload (RFC 8291 / RFC 8188) ────────────────────────────────────

async function encryptPayload(keys: { p256dh: string; auth: string }, plaintext: string): Promise<Uint8Array> {
  const authSecret = b64uDecode(keys.auth);             // 16 bytes
  const receiverPub = b64uDecode(keys.p256dh);          // 65 bytes uncompressed P-256

  // Ephemeral sender key pair
  const senderKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderKP.publicKey)); // 65 bytes

  // ECDH shared secret
  const receiverKey = await crypto.subtle.importKey('raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhBits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderKP.privateKey, 256));

  // PRK_key = HKDF-Extract(auth, ECDH)
  const prkKey = await hkdfExtract(authSecret, ecdhBits);

  // key_info = "WebPush: info\x00" || receiver_pub || sender_pub
  const keyInfo = new Uint8Array([...new TextEncoder().encode('WebPush: info\x00'), ...receiverPub, ...senderPubRaw]);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive CEK (16 bytes) and nonce (12 bytes)
  const prkContent = await hkdfExtract(salt, ikm);
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\x00');
  const cek = await hkdfExpand(prkContent, new Uint8Array([...cekInfo, 1]), 16);
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\x00');
  const nonce = await hkdfExpand(prkContent, new Uint8Array([...nonceInfo, 1]), 12);

  // AES-128-GCM encrypt (pad with 2 zero bytes + \x02 delimiter per RFC 8291)
  const plainBytes = new TextEncoder().encode(plaintext);
  const padded = new Uint8Array(plainBytes.length + 2);
  padded.set(plainBytes);
  padded[plainBytes.length] = 2; // delimiter

  const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded));

  // Build RFC 8188 record: salt(16) + rs(4) + idlen(1) + sender_pub(65) + ciphertext
  const rs = ciphertext.length + 17; // record size
  const out = new Uint8Array(16 + 4 + 1 + 65 + ciphertext.length);
  let offset = 0;
  out.set(salt, offset); offset += 16;
  new DataView(out.buffer).setUint32(offset, rs); offset += 4;
  out[offset++] = 65; // key ID length (sender public key)
  out.set(senderPubRaw, offset); offset += 65;
  out.set(ciphertext, offset);

  return out;
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured in secrets' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { subscription, title, message, url, type, icon, requireInteraction, metadata } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys || !title || !message) {
      return new Response(JSON.stringify({ error: 'Missing fields: subscription, title, message' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      url: url || '/',
      type: type || 'general',
      icon: icon || '/icons/icon-192x192.png',
      requireInteraction: requireInteraction || false,
      metadata: metadata || {},
      timestamp: Date.now(),
    });

    const [jwt, body] = await Promise.all([
      createVapidJwt(subscription.endpoint),
      encryptPayload(subscription.keys, payload),
    ]);

    console.log('[SEND-PUSH] Sending to:', subscription.endpoint.substring(0, 60));

    const pushRes = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body,
    });

    if (!pushRes.ok && pushRes.status !== 201) {
      const text = await pushRes.text().catch(() => '');
      console.error('[SEND-PUSH] Push service error:', pushRes.status, text);
      return new Response(JSON.stringify({
        error: `Push service ${pushRes.status}`,
        expired: pushRes.status === 410 || pushRes.status === 404,
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    console.log('[SEND-PUSH] Sent OK', pushRes.status);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[SEND-PUSH] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
