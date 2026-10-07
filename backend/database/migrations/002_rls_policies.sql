-- =============================================================================
-- 002_rls_policies.sql
-- Row Level Security for WhatsApp AI platform
--
-- Notes:
-- - Frontend uses the anon/authenticated key (never the service-role key).
-- - Backend Express uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS.
-- - Authenticated staff (profiles present) can manage operational data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: current user has a staff profile
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff()
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
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

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
      AND p.role IN ('admin', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_manager() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own_or_staff" ON public.profiles;
CREATE POLICY "profiles_select_own_or_staff"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;
CREATE POLICY "profiles_admin_manage"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin_or_manager())
WITH CHECK (public.is_admin_or_manager());

-- -----------------------------------------------------------------------------
-- contacts
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "contacts_staff_select" ON public.contacts;
CREATE POLICY "contacts_staff_select"
ON public.contacts
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "contacts_staff_insert" ON public.contacts;
CREATE POLICY "contacts_staff_insert"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "contacts_staff_update" ON public.contacts;
CREATE POLICY "contacts_staff_update"
ON public.contacts
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "contacts_admin_delete" ON public.contacts;
CREATE POLICY "contacts_admin_delete"
ON public.contacts
FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- -----------------------------------------------------------------------------
-- conversations
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "conversations_staff_select" ON public.conversations;
CREATE POLICY "conversations_staff_select"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "conversations_staff_insert" ON public.conversations;
CREATE POLICY "conversations_staff_insert"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "conversations_staff_update" ON public.conversations;
CREATE POLICY "conversations_staff_update"
ON public.conversations
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "conversations_admin_delete" ON public.conversations;
CREATE POLICY "conversations_admin_delete"
ON public.conversations
FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- -----------------------------------------------------------------------------
-- messages
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "messages_staff_select" ON public.messages;
CREATE POLICY "messages_staff_select"
ON public.messages
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "messages_staff_insert" ON public.messages;
CREATE POLICY "messages_staff_insert"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "messages_staff_update" ON public.messages;
CREATE POLICY "messages_staff_update"
ON public.messages
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "messages_admin_delete" ON public.messages;
CREATE POLICY "messages_admin_delete"
ON public.messages
FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- -----------------------------------------------------------------------------
-- leads
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "leads_staff_select" ON public.leads;
CREATE POLICY "leads_staff_select"
ON public.leads
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "leads_staff_insert" ON public.leads;
CREATE POLICY "leads_staff_insert"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "leads_staff_update" ON public.leads;
CREATE POLICY "leads_staff_update"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "leads_admin_delete" ON public.leads;
CREATE POLICY "leads_admin_delete"
ON public.leads
FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- -----------------------------------------------------------------------------
-- appointments
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "appointments_staff_select" ON public.appointments;
CREATE POLICY "appointments_staff_select"
ON public.appointments
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "appointments_staff_insert" ON public.appointments;
CREATE POLICY "appointments_staff_insert"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "appointments_staff_update" ON public.appointments;
CREATE POLICY "appointments_staff_update"
ON public.appointments
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "appointments_admin_delete" ON public.appointments;
CREATE POLICY "appointments_admin_delete"
ON public.appointments
FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- -----------------------------------------------------------------------------
-- knowledge_base
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "knowledge_base_staff_select" ON public.knowledge_base;
CREATE POLICY "knowledge_base_staff_select"
ON public.knowledge_base
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "knowledge_base_staff_insert" ON public.knowledge_base;
CREATE POLICY "knowledge_base_staff_insert"
ON public.knowledge_base
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "knowledge_base_staff_update" ON public.knowledge_base;
CREATE POLICY "knowledge_base_staff_update"
ON public.knowledge_base
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "knowledge_base_admin_delete" ON public.knowledge_base;
CREATE POLICY "knowledge_base_admin_delete"
ON public.knowledge_base
FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- -----------------------------------------------------------------------------
-- ai_settings
-- Staff can read; only admin/manager can modify
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "ai_settings_staff_select" ON public.ai_settings;
CREATE POLICY "ai_settings_staff_select"
ON public.ai_settings
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "ai_settings_admin_insert" ON public.ai_settings;
CREATE POLICY "ai_settings_admin_insert"
ON public.ai_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "ai_settings_admin_update" ON public.ai_settings;
CREATE POLICY "ai_settings_admin_update"
ON public.ai_settings
FOR UPDATE
TO authenticated
USING (public.is_admin_or_manager())
WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "ai_settings_admin_delete" ON public.ai_settings;
CREATE POLICY "ai_settings_admin_delete"
ON public.ai_settings
FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- -----------------------------------------------------------------------------
-- team_members
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "team_members_staff_select" ON public.team_members;
CREATE POLICY "team_members_staff_select"
ON public.team_members
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "team_members_admin_insert" ON public.team_members;
CREATE POLICY "team_members_admin_insert"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "team_members_admin_update" ON public.team_members;
CREATE POLICY "team_members_admin_update"
ON public.team_members
FOR UPDATE
TO authenticated
USING (public.is_admin_or_manager())
WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "team_members_admin_delete" ON public.team_members;
CREATE POLICY "team_members_admin_delete"
ON public.team_members
FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- -----------------------------------------------------------------------------
-- tags
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tags_staff_select" ON public.tags;
CREATE POLICY "tags_staff_select"
ON public.tags
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "tags_staff_insert" ON public.tags;
CREATE POLICY "tags_staff_insert"
ON public.tags
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "tags_staff_update" ON public.tags;
CREATE POLICY "tags_staff_update"
ON public.tags
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "tags_admin_delete" ON public.tags;
CREATE POLICY "tags_admin_delete"
ON public.tags
FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- -----------------------------------------------------------------------------
-- conversation_tags
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "conversation_tags_staff_select" ON public.conversation_tags;
CREATE POLICY "conversation_tags_staff_select"
ON public.conversation_tags
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "conversation_tags_staff_insert" ON public.conversation_tags;
CREATE POLICY "conversation_tags_staff_insert"
ON public.conversation_tags
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "conversation_tags_staff_delete" ON public.conversation_tags;
CREATE POLICY "conversation_tags_staff_delete"
ON public.conversation_tags
FOR DELETE
TO authenticated
USING (public.is_staff());

-- -----------------------------------------------------------------------------
-- Realtime publication (optional but useful for inbox)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;
