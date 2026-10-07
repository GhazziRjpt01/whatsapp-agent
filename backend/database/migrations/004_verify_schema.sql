-- =============================================================================
-- 004_verify_schema.sql
-- Optional sanity checks after migrations (run in SQL Editor)
-- =============================================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'contacts',
    'conversations',
    'messages',
    'leads',
    'appointments',
    'knowledge_base',
    'ai_settings',
    'team_members',
    'tags',
    'conversation_tags'
  )
ORDER BY table_name;

SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN (
    'profiles',
    'contacts',
    'conversations',
    'messages',
    'leads',
    'appointments',
    'knowledge_base',
    'ai_settings',
    'team_members',
    'tags',
    'conversation_tags'
  )
ORDER BY relname;

SELECT
  (SELECT COUNT(*) FROM public.contacts) AS contacts_count,
  (SELECT COUNT(*) FROM public.conversations) AS conversations_count,
  (SELECT COUNT(*) FROM public.messages) AS messages_count,
  (SELECT COUNT(*) FROM public.leads) AS leads_count,
  (SELECT COUNT(*) FROM public.appointments) AS appointments_count,
  (SELECT COUNT(*) FROM public.knowledge_base) AS knowledge_base_count,
  (SELECT COUNT(*) FROM public.tags) AS tags_count,
  (SELECT COUNT(*) FROM public.ai_settings) AS ai_settings_count;
