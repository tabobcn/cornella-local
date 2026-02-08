-- ====================================================
-- INSERTAR SOLICITUDES DE PRESUPUESTO DE PRUEBA
-- ====================================================
-- Ejecuta este script en Supabase SQL Editor
-- ====================================================

-- Paso 1: Ver user_id disponible
SELECT id, email FROM auth.users WHERE email = 'carlos@test.com';

-- Paso 2: Insertar 3 solicitudes de presupuesto para Cafetería
-- REEMPLAZA 'TU_USER_ID' con el ID que obtuviste arriba

INSERT INTO public.budget_requests (
  user_id,
  category,
  subcategory,
  title,
  description,
  urgency,
  photos,
  status,
  created_at
) VALUES
  (
    'TU_USER_ID'::uuid,
    'Restauración',
    'Cafetería',
    'Catering para evento corporativo',
    'Necesito servicio de catering para un evento de empresa con 50 personas. Incluye café, bollería y algo salado. Fecha: próximo viernes. Presupuesto orientativo por favor.',
    'medium',
    ARRAY[]::text[],
    'pending',
    NOW() - INTERVAL '2 days'
  ),
  (
    'TU_USER_ID'::uuid,
    'Restauración',
    'Cafetería',
    'Desayunos para oficina durante 1 mes',
    'Somos una oficina de 15 personas y queremos contratar desayunos diarios (café y bollería) durante un mes. Entrega a las 8:30am. ¿Me podéis enviar presupuesto mensual?',
    'low',
    ARRAY[]::text[],
    'pending',
    NOW() - INTERVAL '5 hours'
  ),
  (
    'TU_USER_ID'::uuid,
    'Restauración',
    'Cafetería',
    'Servicio de café para reunión importante',
    'Necesito servicio de café y pastelería para una reunión con clientes mañana a las 10am. Seremos unas 8 personas. Urgente por favor.',
    'high',
    ARRAY[]::text[],
    'pending',
    NOW() - INTERVAL '1 hour'
  );

-- Paso 3: Verificar que se insertaron correctamente
SELECT
  id,
  title,
  subcategory,
  urgency,
  status,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as fecha
FROM public.budget_requests
WHERE subcategory = 'Cafetería'
ORDER BY created_at DESC;
