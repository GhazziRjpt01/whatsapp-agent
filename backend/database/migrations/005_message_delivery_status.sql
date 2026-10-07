-- =============================================================================
-- 005_message_delivery_status.sql
-- Track WhatsApp delivery / read / failed statuses on messages
-- =============================================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivery_status TEXT;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_delivery_status_check'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_delivery_status_check
      CHECK (
        delivery_status IS NULL
        OR delivery_status IN (
          'received',
          'sent',
          'delivered',
          'read',
          'failed'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_delivery_status
  ON public.messages (delivery_status);

CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id
  ON public.messages (whatsapp_message_id);
