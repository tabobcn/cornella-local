-- ====================================================
-- admin-delete-businesses.sql
-- Políticas RLS DELETE para admin en businesses y tablas relacionadas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ====================================================

-- ====================================================
-- BUSINESSES
-- ====================================================
DROP POLICY IF EXISTS "Admin can delete businesses" ON businesses;
CREATE POLICY "Admin can delete businesses"
  ON businesses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================
-- OFFERS
-- ====================================================
DROP POLICY IF EXISTS "Admin can delete offers" ON offers;
CREATE POLICY "Admin can delete offers"
  ON offers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================
-- OFFER_FIRES
-- ====================================================
DROP POLICY IF EXISTS "Admin can delete offer_fires" ON offer_fires;
CREATE POLICY "Admin can delete offer_fires"
  ON offer_fires FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================
-- OFFER_REDEMPTIONS
-- ====================================================
DROP POLICY IF EXISTS "Admin can delete offer_redemptions" ON offer_redemptions;
CREATE POLICY "Admin can delete offer_redemptions"
  ON offer_redemptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================
-- JOBS
-- ====================================================
DROP POLICY IF EXISTS "Admin can delete jobs" ON jobs;
CREATE POLICY "Admin can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================
-- JOB_APPLICATIONS
-- ====================================================
DROP POLICY IF EXISTS "Admin can delete job_applications" ON job_applications;
CREATE POLICY "Admin can delete job_applications"
  ON job_applications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================
-- REVIEWS
-- ====================================================
DROP POLICY IF EXISTS "Admin can delete reviews" ON reviews;
CREATE POLICY "Admin can delete reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================
-- FAVORITES
-- ====================================================
DROP POLICY IF EXISTS "Admin can delete favorites" ON favorites;
CREATE POLICY "Admin can delete favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================
-- NOTIFICATIONS
-- ====================================================
DROP POLICY IF EXISTS "Admin can delete notifications" ON notifications;
CREATE POLICY "Admin can delete notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ====================================================
-- Confirmación
-- ====================================================
DO $$ BEGIN
  RAISE NOTICE 'OK: Políticas RLS DELETE para admin creadas en businesses, offers, offer_fires, offer_redemptions, jobs, job_applications, reviews, favorites, notifications';
END $$;
