// ==============================================
// SUPABASE EDGE FUNCTION: PRIVACY CLEANUP (limpieza diaria de datos)
// ==============================================
// La llama la base de datos cada noche (pg_cron → public.run_privacy_cleanup()) con la clave de
// servicio del Vault. Hace dos cosas:
//   1) Ejecuta public.privacy_cleanup(): borra las filas caducadas (avisos viejos, candidaturas y
//      presupuestos de más de 12 meses...), quita los documentos de verificación de los negocios
//      ya aprobados y los CV de procesos terminados, y devuelve la lista de archivos sin uso.
//   2) Borra esos archivos con la API de Storage (con SQL no se pueden borrar archivos).
// Los plazos están en supabase/privacidad-borrado-automatico.sql.
// Deploy: npx supabase functions deploy privacy-cleanup  (verify_jwt habilitado)
// Resultado de la última ejecución:
//   SELECT status_code, content FROM net._http_response ORDER BY created DESC LIMIT 1;
// ==============================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';

// Solo se borran archivos de estos buckets, aunque la base de datos devolviera otros
const ALLOWED_BUCKETS = new Set(['verification-documents', 'job-applications', 'business-photos']);
const BATCH_SIZE = 100;

// Igual que en send-push: la clave del Vault puede no coincidir literalmente con
// SUPABASE_SERVICE_ROLE_KEY (Supabase cambió su sistema de claves). Se acepta si coincide o si la
// API de Auth la reconoce como clave de servicio.
const verifiedServiceKeys = new Map<string, number>();
async function isServiceKey(key: string): Promise<boolean> {
  if (!key) return false;
  if (SERVICE_ROLE_KEY && key === SERVICE_ROLE_KEY) return true;
  const at = verifiedServiceKeys.get(key);
  if (at && Date.now() - at < 10 * 60 * 1000) return true;
  if (!SUPABASE_URL) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    await r.body?.cancel();
    if (r.ok) {
      verifiedServiceKeys.set(key, Date.now());
      return true;
    }
  } catch (_) {
    // error de red: se trata como no válida
  }
  return false;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const callerKey = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!(await isServiceKey(callerKey))) return json(401, { error: 'Unauthorized' });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY || callerKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Filas caducadas + lista de archivos sin uso
  const { data, error } = await supabase.rpc('privacy_cleanup');
  if (error) {
    console.error('privacy_cleanup falló:', error);
    return json(500, { ok: false, error: 'privacy_cleanup failed', detail: error.message });
  }

  // 2) Borrar los archivos por bucket, en tandas
  const files: any[] = Array.isArray(data?.files) ? data.files : [];
  const byBucket = new Map<string, string[]>();
  for (const f of files) {
    if (!f || !ALLOWED_BUCKETS.has(f.bucket) || typeof f.path !== 'string' || !f.path) continue;
    if (!byBucket.has(f.bucket)) byBucket.set(f.bucket, []);
    byBucket.get(f.bucket)!.push(f.path);
  }

  const removed: Record<string, number> = {};
  const errors: string[] = [];
  for (const [bucket, paths] of byBucket) {
    removed[bucket] = 0;
    for (let i = 0; i < paths.length; i += BATCH_SIZE) {
      const chunk = paths.slice(i, i + BATCH_SIZE);
      const { data: deleted, error: removeError } = await supabase.storage.from(bucket).remove(chunk);
      if (removeError) {
        errors.push(`${bucket}: ${removeError.message}`);
        continue;
      }
      removed[bucket] += Array.isArray(deleted) ? deleted.length : 0;
    }
  }

  const photosSkipped = Number(data?.fotos_omitidas_por_seguridad ?? 0);
  if (photosSkipped > 0) errors.push(`${photosSkipped} fotos sin uso no se han borrado por seguridad: revisar a mano`);

  const summary = {
    ok: errors.length === 0,
    filas: data?.rows ?? {},
    archivos_pendientes: files.length,
    archivos_borrados: removed,
    fotos_omitidas_por_seguridad: photosSkipped,
    errores: errors,
  };
  console.log('privacy-cleanup', JSON.stringify(summary));
  return json(errors.length ? 207 : 200, summary);
});
