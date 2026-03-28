-- =============================================
-- FIX: trigger notify_budget_response usaba NEW.request_id
-- pero la columna real en budget_quotes es budget_request_id
-- Sin este fix, todo INSERT en budget_quotes hace rollback
-- =============================================

CREATE OR REPLACE FUNCTION notify_budget_response()
RETURNS TRIGGER AS $$
DECLARE
  request_data RECORD;
  business_data RECORD;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    app_url := 'https://cornellalocal.vercel.app';

    SELECT
      br.user_id,
      profiles.email as user_email,
      profiles.full_name as user_name
    INTO request_data
    FROM public.budget_requests br
    JOIN public.profiles ON br.user_id = profiles.id
    WHERE br.id = NEW.budget_request_id;  -- ← FIX: era NEW.request_id

    SELECT name INTO business_data
    FROM public.businesses
    WHERE id = NEW.business_id;

    IF request_data.user_email IS NOT NULL THEN
      PERFORM send_email_notification(
        'budget_response',
        request_data.user_email,
        jsonb_build_object(
          'business_name', business_data.name,
          'estimated_price', NEW.estimated_price,
          'notes', NEW.notes,
          'app_url', app_url
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  RAISE NOTICE 'notify_budget_response corregido: NEW.budget_request_id (antes era NEW.request_id)';
END $$;
