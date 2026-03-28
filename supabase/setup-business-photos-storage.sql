-- Políticas RLS para el bucket 'business-photos'
-- Ejecutar en Supabase SQL Editor

-- 1. Permitir a usuarios autenticados subir fotos
CREATE POLICY "Usuarios autenticados pueden subir fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-photos');

-- 2. Permitir a cualquiera ver las fotos (bucket público)
CREATE POLICY "Fotos de negocios son públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-photos');

-- 3. Permitir al propietario actualizar/reemplazar sus fotos
CREATE POLICY "Usuarios pueden actualizar sus fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Permitir al propietario eliminar sus fotos
CREATE POLICY "Usuarios pueden eliminar sus fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
