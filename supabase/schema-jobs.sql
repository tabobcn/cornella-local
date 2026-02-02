-- ====================================================
-- TABLA: jobs (Ofertas de empleo)
-- ====================================================

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id integer NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Información del puesto
  title text NOT NULL,
  description text NOT NULL,

  -- Salario
  salary_min integer,
  salary_max integer,
  salary_note text,

  -- Tipo de trabajo
  type text CHECK (type IN ('Completa', 'Media Jornada', 'Temporal', 'Prácticas')),
  contract text CHECK (contract IN ('Indefinido', 'Temporal', 'Prácticas', 'Freelance')),
  modality text CHECK (modality IN ('Presencial', 'Remoto', 'Híbrido')),

  -- Ubicación
  location text NOT NULL,
  address text,

  -- Requisitos y beneficios
  requirements text[],
  benefits jsonb,

  -- Estado
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),

  -- Metadatos
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_jobs_business_id ON public.jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(location);

-- RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede VER ofertas activas
CREATE POLICY "Ofertas de empleo activas son públicas"
  ON public.jobs
  FOR SELECT
  USING (status = 'active');

-- Política: Propietarios pueden VER todas sus ofertas (incluso drafts)
CREATE POLICY "Propietarios ven sus ofertas"
  ON public.jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = jobs.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Política: Propietarios pueden CREAR ofertas
CREATE POLICY "Propietarios pueden crear ofertas"
  ON public.jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = jobs.business_id
      AND businesses.owner_id = auth.uid()
      AND businesses.is_verified = true
    )
  );

-- Política: Propietarios pueden ACTUALIZAR sus ofertas
CREATE POLICY "Propietarios pueden actualizar sus ofertas"
  ON public.jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = jobs.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Política: Propietarios pueden ELIMINAR sus ofertas
CREATE POLICY "Propietarios pueden eliminar sus ofertas"
  ON public.jobs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = jobs.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

-- Comentarios
COMMENT ON TABLE public.jobs IS 'Ofertas de empleo publicadas por negocios locales';
COMMENT ON COLUMN public.jobs.type IS 'Tipo de jornada: Completa, Media Jornada, Temporal, Prácticas';
COMMENT ON COLUMN public.jobs.contract IS 'Tipo de contrato: Indefinido, Temporal, Prácticas, Freelance';
COMMENT ON COLUMN public.jobs.modality IS 'Modalidad: Presencial, Remoto, Híbrido';
COMMENT ON COLUMN public.jobs.status IS 'Estado: active, closed, draft';
