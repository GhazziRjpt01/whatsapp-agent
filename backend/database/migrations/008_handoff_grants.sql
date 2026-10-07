-- =============================================================================
-- 008_handoff_grants.sql
-- Ensure authenticated staff can read/write handoff audit via RLS policies
-- =============================================================================

GRANT SELECT, INSERT ON TABLE public.conversation_handoffs TO authenticated;
GRANT SELECT ON TABLE public.conversation_handoffs TO service_role;
GRANT ALL ON TABLE public.conversation_handoffs TO service_role;
