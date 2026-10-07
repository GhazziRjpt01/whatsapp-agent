-- =============================================================================
-- 007_conversation_handoff.sql
-- AI ↔ human handoff modes + audit trail
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_mode') THEN
    CREATE TYPE public.conversation_mode AS ENUM (
      'AI_ACTIVE',
      'WAITING_FOR_HUMAN',
      'HUMAN_ACTIVE',
      'CLOSED'
    );
  END IF;
END $$;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS mode public.conversation_mode NOT NULL DEFAULT 'AI_ACTIVE';

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS handoff_reason TEXT;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS handoff_requested_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversations_mode
  ON public.conversations (mode);

-- Backfill from legacy ai_enabled / status flags
UPDATE public.conversations
SET mode = CASE
  WHEN status = 'closed' OR status = 'resolved' THEN 'CLOSED'::public.conversation_mode
  WHEN ai_enabled = false AND assigned_to IS NOT NULL THEN 'HUMAN_ACTIVE'::public.conversation_mode
  WHEN ai_enabled = false THEN 'WAITING_FOR_HUMAN'::public.conversation_mode
  ELSE 'AI_ACTIVE'::public.conversation_mode
END
WHERE mode = 'AI_ACTIVE'
  AND (
    ai_enabled = false
    OR status IN ('closed', 'resolved', 'pending')
  );

CREATE TABLE IF NOT EXISTS public.conversation_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  from_mode public.conversation_mode,
  to_mode public.conversation_mode NOT NULL,
  reason TEXT,
  reason_code TEXT NOT NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('ai', 'agent', 'system')),
  actor_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT conversation_handoffs_reason_code_check CHECK (
    reason_code IN (
      'customer_request',
      'low_confidence',
      'complaint',
      'sensitive_info',
      'high_intent',
      'agent_takeover',
      'return_to_ai',
      'closed',
      'reopened'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_conversation_handoffs_conversation_id
  ON public.conversation_handoffs (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_handoffs_reason_code
  ON public.conversation_handoffs (reason_code);

ALTER TABLE public.conversation_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "handoffs_staff_select" ON public.conversation_handoffs;
CREATE POLICY "handoffs_staff_select"
ON public.conversation_handoffs
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "handoffs_staff_insert" ON public.conversation_handoffs;
CREATE POLICY "handoffs_staff_insert"
ON public.conversation_handoffs
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversation_handoffs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_handoffs;
  END IF;
END $$;
