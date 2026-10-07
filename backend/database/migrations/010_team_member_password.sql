-- Stores the desk password so admins can see it on the Team page.
-- Supabase Auth still keeps its own hashed password for sign-in.
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS password TEXT;
