-- Añadir fecha de nacimiento al perfil de usuario
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
