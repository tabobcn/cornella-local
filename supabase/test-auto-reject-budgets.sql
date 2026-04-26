-- ====================================================
-- TEST: Auto-rechazo de presupuestos
-- ====================================================
-- Crear 3 solicitudes de presupuesto para testing
-- Usuario: carlos@test.com (2146040a-47f8-4101-af75-7cbbb39d09f2)
-- ====================================================

-- Limpiar presupuestos de prueba anteriores (opcional)
DELETE FROM public.budget_quotes
WHERE budget_request_id IN (
  SELECT id FROM public.budget_requests
  WHERE description LIKE '%TEST AUTO-REJECT%'
);

DELETE FROM public.budget_requests
WHERE description LIKE '%TEST AUTO-REJECT%';

-- Presupuesto 1: Fontanería
INSERT INTO public.budget_requests (
  user_id,
  category,
  description,
  urgency,
  address,
  phone,
  photos,
  status,
  created_at
) VALUES (
  '2146040a-47f8-4101-af75-7cbbb39d09f2'::uuid,
  'Fontanería',
  'TEST AUTO-REJECT: Reparar fuga de agua en cocina',
  'urgent',
  'Calle Ejemplo 123, Cornellà',
  '666777888',
  ARRAY[]::text[],
  'pending',
  NOW() - INTERVAL '2 hours'
);

-- Presupuesto 2: Electricidad
INSERT INTO public.budget_requests (
  user_id,
  category,
  description,
  urgency,
  address,
  phone,
  photos,
  status,
  created_at
) VALUES (
  '2146040a-47f8-4101-af75-7cbbb39d09f2'::uuid,
  'Electricidad',
  'TEST AUTO-REJECT: Instalación de enchufes adicionales',
  'this-week',
  'Calle Ejemplo 123, Cornellà',
  '666777888',
  ARRAY[]::text[],
  'pending',
  NOW() - INTERVAL '1 hour'
);

-- Presupuesto 3: Limpieza
INSERT INTO public.budget_requests (
  user_id,
  category,
  description,
  urgency,
  address,
  phone,
  photos,
  status,
  created_at
) VALUES (
  '2146040a-47f8-4101-af75-7cbbb39d09f2'::uuid,
  'Limpieza',
  'TEST AUTO-REJECT: Limpieza profunda del hogar',
  'next-week',
  'Calle Ejemplo 123, Cornellà',
  '666777888',
  ARRAY[]::text[],
  'pending',
  NOW() - INTERVAL '30 minutes'
);

-- Verificar que se crearon correctamente
SELECT
  id,
  category,
  description,
  urgency,
  status,
  created_at
FROM public.budget_requests
WHERE description LIKE '%TEST AUTO-REJECT%'
ORDER BY created_at DESC;
