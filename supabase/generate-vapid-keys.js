#!/usr/bin/env node

// ==============================================
// GENERADOR DE VAPID KEYS
// ==============================================
// Genera un par de claves VAPID para Web Push
// Uso: node generate-vapid-keys.js
// ==============================================

const crypto = require('crypto');

function generateVAPIDKeys() {
  // Generar par de claves usando EC (Elliptic Curve) P-256
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  // Convertir a Base64 URL-safe
  const publicKeyBase64 = publicKey
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const privateKeyBase64 = privateKey
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  };
}

console.log('\n🔑 Generando VAPID Keys...\n');

const keys = generateVAPIDKeys();

console.log('✅ VAPID Keys generadas:\n');
console.log('═══════════════════════════════════════════════════════');
console.log('\n📌 CLAVE PÚBLICA (Public Key):');
console.log(keys.publicKey);
console.log('\n🔒 CLAVE PRIVADA (Private Key):');
console.log(keys.privateKey);
console.log('\n═══════════════════════════════════════════════════════\n');

console.log('📋 Configurar en Supabase:\n');
console.log('  1. Ve a tu proyecto en Supabase Dashboard');
console.log('  2. Settings → Edge Functions → Secrets\n');
console.log('  O usando CLI:\n');
console.log(`  npx supabase secrets set VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`  npx supabase secrets set VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`  npx supabase secrets set VAPID_SUBJECT="mailto:noreply@cornellalocal.es"\n`);

console.log('📋 Añadir a tu frontend (src/App.jsx):\n');
console.log(`  const VAPID_PUBLIC_KEY = '${keys.publicKey}';\n`);

console.log('⚠️  IMPORTANTE:');
console.log('  - Guarda estas claves de forma segura');
console.log('  - La clave privada NUNCA debe compartirse públicamente');
console.log('  - La clave pública SÍ va en el frontend\n');
