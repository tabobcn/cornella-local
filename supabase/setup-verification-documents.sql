-- =====================================================
-- SISTEMA DE VERIFICACIÓN CON DOCUMENTOS
-- =====================================================
-- Fecha: 2026-02-12
-- Descripción: Upload de CIF/licencia comercial para verificación
-- =====================================================

-- =====================================================
-- 1. AGREGAR COLUMNAS A BUSINESSES
-- =====================================================

-- Agregar campos para documentos de verificación
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS verification_documents TEXT[],
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id);

-- =====================================================
-- 2. CREAR BUCKET EN SUPABASE STORAGE
-- =====================================================
-- NOTA: Esto debe ejecutarse desde el dashboard de Supabase Storage
-- O usar la siguiente función si tienes permisos:

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. POLÍTICAS DE STORAGE
-- =====================================================

-- Policy: Propietarios pueden subir sus propios documentos
CREATE POLICY "Owners can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Propietarios pueden ver sus propios documentos
CREATE POLICY "Owners can view their verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Admins pueden ver todos los documentos
CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Policy: Propietarios pueden eliminar sus propios documentos
CREATE POLICY "Owners can delete their verification documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'verification-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 4. ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_businesses_verification_status
  ON public.businesses(verification_status)
  WHERE verification_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_businesses_verified_by
  ON public.businesses(verified_by);

-- =====================================================
-- ✅ SCRIPT COMPLETADO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Sistema de verificación con documentos instalado';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Columnas agregadas: verification_documents, verification_notes';
  RAISE NOTICE 'Bucket creado: verification-documents';
  RAISE NOTICE 'Políticas Storage: 4 policies creadas';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: Verifica el bucket en Supabase Storage';
  RAISE NOTICE '    Dashboard → Storage → verification-documents';
  RAISE NOTICE '========================================';
END $$;
