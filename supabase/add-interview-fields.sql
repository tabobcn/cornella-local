-- =============================================
-- AÑADIR CAMPOS PARA ENTREVISTAS
-- =============================================
-- Añade campos a job_applications para guardar
-- información de entrevistas programadas
-- =============================================

-- Añadir columnas para entrevistas
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS interview_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS interview_location TEXT,
ADD COLUMN IF NOT EXISTS interview_notes TEXT;

-- Verificar que se añadieron
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'job_applications'
AND column_name LIKE 'interview%';
