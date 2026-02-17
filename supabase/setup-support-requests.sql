-- =============================================
-- TABLA DE SOLICITUDES DE SOPORTE
-- =============================================

CREATE TABLE IF NOT EXISTS support_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, read, resolved
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo admins pueden leer, cualquiera puede insertar
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert support requests"
  ON support_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read support requests"
  ON support_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update support requests"
  ON support_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
