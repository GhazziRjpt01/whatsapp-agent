-- CEO is the only role allowed to view team-member passwords.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'ceo';

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('ceo', 'admin', 'manager')
  );
$$;
