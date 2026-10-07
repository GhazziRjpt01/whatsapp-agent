-- =============================================================================
-- 009_fix_signup_role_escalation.sql
-- Never trust client-provided role metadata on signup.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'agent'::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
