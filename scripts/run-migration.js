import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zwhlcgckhocdkdxilldo.supabase.co';
// Necesitamos usar el service_role key para ejecutar ALTER TABLE
// Por seguridad, el anon key no tiene permisos para DDL
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3aGxjZ2NraG9jZGtkeGlsbGRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTY0MzYzMiwiZXhwIjoyMDg1MjE5NjMyfQ.ZBa0u3Rz7fCEd0jDT4qLcVe_h_DcJ7qcxMqAMoq7zN0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔧 Ejecutando migración: add special_closures column...\n');

  const sql = `
    ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS special_closures jsonb;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error ejecutando migración:', error.message);
      console.log('\n💡 Nota: Esta migración debe ejecutarse manualmente en el SQL Editor de Supabase.');
      console.log('   Ve a: https://supabase.com/dashboard/project/zwhlcgckhocdkdxilldo/sql');
      console.log('\n   Ejecuta este SQL:');
      console.log('   ' + sql.trim());
      process.exit(1);
    } else {
      console.log('✅ Migración ejecutada correctamente!');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n💡 Ejecuta manualmente en Supabase SQL Editor:');
    console.log('   ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS special_closures jsonb;');
    process.exit(1);
  }
}

runMigration();
