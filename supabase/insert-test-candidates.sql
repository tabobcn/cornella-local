-- ====================================================
-- INSERTAR CANDIDATOS DE PRUEBA
-- ====================================================
-- Ejecuta este script en Supabase SQL Editor para crear
-- candidatos de prueba para la oferta "Dependiente"
-- ====================================================

-- Primero, ver los empleos disponibles para obtener el ID
SELECT id, title, business_id, status
FROM public.jobs
WHERE title ILIKE '%dependiente%'
ORDER BY created_at DESC
LIMIT 5;

-- Reemplaza 'TU_JOB_ID_AQUI' con el ID del empleo "Dependiente" del resultado anterior
-- Reemplaza 'TU_USER_ID_AQUI' con tu user_id (puedes obtenerlo con: SELECT id FROM auth.users LIMIT 1;)

-- PASO 1: Obtener un user_id válido
-- (Copia el ID que aparezca aquí)
SELECT id, email FROM auth.users LIMIT 1;

-- PASO 2: Insertar 5 candidatos de prueba
-- IMPORTANTE: Reemplaza los valores antes de ejecutar

INSERT INTO public.job_applications (
  job_id,
  user_id,
  full_name,
  email,
  phone,
  message,
  status,
  created_at
) VALUES
  (
    'TU_JOB_ID_AQUI'::uuid,  -- Reemplaza con el ID del job
    'TU_USER_ID_AQUI'::uuid,  -- Reemplaza con un user_id válido
    'María García López',
    'maria.garcia@email.com',
    '+34612345678',
    'Tengo 3 años de experiencia en atención al cliente y ventas. Me considero una persona responsable, organizada y con muy buena actitud. Estoy muy interesada en formar parte de su equipo.',
    'pending',
    NOW() - INTERVAL '2 days'
  ),
  (
    'TU_JOB_ID_AQUI'::uuid,
    'TU_USER_ID_AQUI'::uuid,
    'Juan Martínez Ruiz',
    'juan.martinez@email.com',
    '+34623456789',
    'Soy estudiante universitario buscando trabajo a media jornada. Tengo experiencia previa en comercio y me adapto rápido a nuevos entornos. Disponibilidad inmediata.',
    'pending',
    NOW() - INTERVAL '1 day'
  ),
  (
    'TU_JOB_ID_AQUI'::uuid,
    'TU_USER_ID_AQUI'::uuid,
    'Laura Sánchez Pérez',
    'laura.sanchez@email.com',
    '+34634567890',
    'Con más de 5 años de experiencia en retail. Orientada a resultados y con excelentes habilidades de comunicación. Me encantaría contribuir al éxito de su negocio.',
    'pending',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'TU_JOB_ID_AQUI'::uuid,
    'TU_USER_ID_AQUI'::uuid,
    'Pedro Rodríguez Torres',
    'pedro.rodriguez@email.com',
    '+34645678901',
    'Recién graduado en Comercio y Marketing. Muy motivado por aprender y crecer profesionalmente. Persona dinámica y con ganas de trabajar.',
    'pending',
    NOW() - INTERVAL '5 hours'
  ),
  (
    'TU_JOB_ID_AQUI'::uuid,
    'TU_USER_ID_AQUI'::uuid,
    'Ana Fernández Morales',
    'ana.fernandez@email.com',
    '+34656789012',
    'Amplia experiencia en ventas y atención al público. Muy buena presencia y trato con clientes. Busco estabilidad laboral y un buen ambiente de trabajo.',
    'pending',
    NOW() - INTERVAL '8 hours'
  );

-- PASO 3: Verificar que se insertaron correctamente
SELECT
  ja.id,
  ja.full_name,
  ja.email,
  ja.status,
  ja.created_at,
  j.title as job_title
FROM public.job_applications ja
JOIN public.jobs j ON j.id = ja.job_id
WHERE j.title ILIKE '%dependiente%'
ORDER BY ja.created_at DESC;
