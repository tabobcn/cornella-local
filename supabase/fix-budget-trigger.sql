-- ====================================================
-- FIX: Trigger presupuestos usaba NEW.subcategory (no existe)
-- La tabla budget_requests tiene columna "category", no "subcategory"
-- ====================================================

CREATE OR REPLACE FUNCTION push_notify_new_budget_request()
RETURNS TRIGGER AS $$
DECLARE
  business_data RECORD;
  app_url TEXT;
BEGIN
  app_url := 'https://cornellalocal.vercel.app';

  -- Enviar push a los top 5 negocios de la categoría
  -- Ahora budget_requests.category almacena el nombre de subcategoría (ej. 'Fontanero')
  -- que coincide exactamente con businesses.subcategory
  FOR business_data IN
    SELECT
      businesses.id,
      businesses.name,
      businesses.owner_id
    FROM public.businesses
    WHERE businesses.subcategory = NEW.category   -- CORREGIDO: era NEW.subcategory
      AND businesses.is_verified = true
      AND businesses.owner_id IS NOT NULL
    ORDER BY businesses.rating DESC NULLS LAST
    LIMIT 10
  LOOP
    PERFORM send_push_notification(
      target_user_id := business_data.owner_id,
      notification_title := '💼 Nueva Solicitud de Presupuesto',
      notification_message := 'Tienes una nueva solicitud en ' || NEW.category,
      notification_url := app_url || '/#incoming-budget-requests',
      notification_type := 'new_budget_request',
      require_interaction := false,
      notification_metadata := jsonb_build_object(
        'business_id', business_data.id,
        'business_name', business_data.name,
        'category', NEW.category,
        'request_id', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger (por si acaso)
DROP TRIGGER IF EXISTS trigger_push_new_budget_request ON public.budget_requests;
CREATE TRIGGER trigger_push_new_budget_request
  AFTER INSERT ON public.budget_requests
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_new_budget_request();

-- Confirmación
DO $$ BEGIN
  RAISE NOTICE 'Trigger presupuestos corregido: NEW.category (antes era NEW.subcategory)';
END $$;
