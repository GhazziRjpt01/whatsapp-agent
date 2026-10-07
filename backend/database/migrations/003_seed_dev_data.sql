-- =============================================================================
-- 003_seed_dev_data.sql
-- Development seed data for WhatsApp AI platform
--
-- Safe to re-run: uses fixed UUIDs + ON CONFLICT where possible.
-- Profile/team seed attaches to the first auth.users row if one exists.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tags
-- -----------------------------------------------------------------------------
INSERT INTO public.tags (id, name) VALUES
  ('11111111-1111-1111-1111-111111111001', 'Hot Lead'),
  ('11111111-1111-1111-1111-111111111002', 'CRM'),
  ('11111111-1111-1111-1111-111111111003', 'Enterprise'),
  ('11111111-1111-1111-1111-111111111004', 'Healthcare'),
  ('11111111-1111-1111-1111-111111111005', 'Real Estate'),
  ('11111111-1111-1111-1111-111111111006', 'Education'),
  ('11111111-1111-1111-1111-111111111007', 'VIP')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- -----------------------------------------------------------------------------
-- Contacts
-- -----------------------------------------------------------------------------
INSERT INTO public.contacts (
  id, name, phone, email, company, notes
) VALUES
  (
    '22222222-2222-2222-2222-222222222001',
    'Hassan Raza',
    '+923001122334',
    'hassan@brightlabs.co',
    'BrightLabs',
    'Interested in WhatsApp-integrated CRM with lead scoring.'
  ),
  (
    '22222222-2222-2222-2222-222222222002',
    'Sara Ahmed',
    '+923214455667',
    'sara@medora.health',
    'Medora Clinics',
    'Needs appointment reminders and patient support bot.'
  ),
  (
    '22222222-2222-2222-2222-222222222003',
    'Omar Siddiqui',
    '+971502233445',
    'omar@coastal.ae',
    'Coastal Realty',
    'Property inquiry automation for WhatsApp.'
  ),
  (
    '22222222-2222-2222-2222-222222222004',
    'Fatima Noor',
    '+923337788990',
    'fatima@eduvibe.com',
    'EduVibe',
    'Admissions assistant in Urdu and English.'
  ),
  (
    '22222222-2222-2222-2222-222222222005',
    'Daniel Craig',
    '+447700900123',
    'daniel@northwave.io',
    'Northwave',
    'Enterprise support desk with VIP human takeover.'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  company = EXCLUDED.company,
  notes = EXCLUDED.notes,
  updated_at = TIMEZONE('utc', NOW());

-- -----------------------------------------------------------------------------
-- Conversations
-- -----------------------------------------------------------------------------
INSERT INTO public.conversations (
  id, contact_id, status, ai_enabled, last_message_at
) VALUES
  (
    '33333333-3333-3333-3333-333333333001',
    '22222222-2222-2222-2222-222222222001',
    'open',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '2 minutes'
  ),
  (
    '33333333-3333-3333-3333-333333333002',
    '22222222-2222-2222-2222-222222222002',
    'pending',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '18 minutes'
  ),
  (
    '33333333-3333-3333-3333-333333333003',
    '22222222-2222-2222-2222-222222222003',
    'open',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '1 hour'
  ),
  (
    '33333333-3333-3333-3333-333333333004',
    '22222222-2222-2222-2222-222222222004',
    'resolved',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '3 hours'
  ),
  (
    '33333333-3333-3333-3333-333333333005',
    '22222222-2222-2222-2222-222222222005',
    'open',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '1 day'
  )
ON CONFLICT (id) DO UPDATE
SET
  status = EXCLUDED.status,
  ai_enabled = EXCLUDED.ai_enabled,
  last_message_at = EXCLUDED.last_message_at,
  updated_at = TIMEZONE('utc', NOW());

-- -----------------------------------------------------------------------------
-- Conversation tags
-- -----------------------------------------------------------------------------
INSERT INTO public.conversation_tags (conversation_id, tag_id) VALUES
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111001'),
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111002'),
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111003'),
  ('33333333-3333-3333-3333-333333333002', '11111111-1111-1111-1111-111111111004'),
  ('33333333-3333-3333-3333-333333333003', '11111111-1111-1111-1111-111111111005'),
  ('33333333-3333-3333-3333-333333333004', '11111111-1111-1111-1111-111111111006'),
  ('33333333-3333-3333-3333-333333333005', '11111111-1111-1111-1111-111111111003'),
  ('33333333-3333-3333-3333-333333333005', '11111111-1111-1111-1111-111111111007')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Messages
-- -----------------------------------------------------------------------------
DELETE FROM public.messages
WHERE conversation_id IN (
  '33333333-3333-3333-3333-333333333001',
  '33333333-3333-3333-3333-333333333002',
  '33333333-3333-3333-3333-333333333003',
  '33333333-3333-3333-3333-333333333004',
  '33333333-3333-3333-3333-333333333005'
);

INSERT INTO public.messages (
  id,
  conversation_id,
  sender_type,
  message,
  message_type,
  whatsapp_message_id,
  is_ai,
  created_at
) VALUES
  (
    '44444444-4444-4444-4444-444444444001',
    '33333333-3333-3333-3333-333333333001',
    'customer',
    'Hi, we are looking for a WhatsApp-integrated CRM.',
    'text',
    'wamid.dev.seed.001',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '20 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444002',
    '33333333-3333-3333-3333-333333333001',
    'ai',
    'Welcome to Nexora! I can help with that. Are you looking for inbound support, sales automation, or both?',
    'text',
    'wamid.dev.seed.002',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '19 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444003',
    '33333333-3333-3333-3333-333333333001',
    'customer',
    'Both. We also need lead scoring and appointment booking.',
    'text',
    'wamid.dev.seed.003',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '16 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444004',
    '33333333-3333-3333-3333-333333333001',
    'ai',
    'Great fit. Our Growth Suite includes AI inbox, lead scoring, and calendar booking. Shall I share a proposal?',
    'text',
    'wamid.dev.seed.004',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '15 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444005',
    '33333333-3333-3333-3333-333333333001',
    'customer',
    'Can you share pricing for the CRM package?',
    'text',
    'wamid.dev.seed.005',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '2 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444006',
    '33333333-3333-3333-3333-333333333002',
    'customer',
    'We need appointment reminders on WhatsApp.',
    'text',
    'wamid.dev.seed.006',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '40 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444007',
    '33333333-3333-3333-3333-333333333002',
    'agent',
    'Absolutely. We can set reminders, confirmations, and no-show follow-ups.',
    'text',
    'wamid.dev.seed.007',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '35 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444008',
    '33333333-3333-3333-3333-333333333002',
    'customer',
    'Appointment confirmed for tomorrow at 3 PM.',
    'text',
    'wamid.dev.seed.008',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '18 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444009',
    '33333333-3333-3333-3333-333333333003',
    'customer',
    'Do you build property inquiry bots for WhatsApp?',
    'text',
    'wamid.dev.seed.009',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '2 hours'
  ),
  (
    '44444444-4444-4444-4444-444444444010',
    '33333333-3333-3333-3333-333333333003',
    'ai',
    'Yes. We qualify buyers, share listings, and book site visits automatically.',
    'text',
    'wamid.dev.seed.010',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '110 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444011',
    '33333333-3333-3333-3333-333333333003',
    'customer',
    'Please send brochure for property inquiry bot.',
    'text',
    'wamid.dev.seed.011',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '1 hour'
  ),
  (
    '44444444-4444-4444-4444-444444444012',
    '33333333-3333-3333-3333-333333333005',
    'customer',
    'Looking for enterprise WhatsApp support with SLA.',
    'text',
    'wamid.dev.seed.012',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '26 hours'
  ),
  (
    '44444444-4444-4444-4444-444444444013',
    '33333333-3333-3333-3333-333333333005',
    'ai',
    'We offer priority routing, human takeover, and analytics for enterprise teams.',
    'text',
    'wamid.dev.seed.013',
    TRUE,
    TIMEZONE('utc', NOW()) - INTERVAL '25 hours'
  ),
  (
    '44444444-4444-4444-4444-444444444014',
    '33333333-3333-3333-3333-333333333005',
    'customer',
    'We want human takeover for VIP clients.',
    'text',
    'wamid.dev.seed.014',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '1 day'
  );

-- -----------------------------------------------------------------------------
-- Leads
-- -----------------------------------------------------------------------------
INSERT INTO public.leads (
  id,
  contact_id,
  service,
  budget,
  timeline,
  lead_score,
  status,
  source,
  notes
) VALUES
  (
    '55555555-5555-5555-5555-555555555001',
    '22222222-2222-2222-2222-222222222001',
    'Custom CRM Development',
    '$8,000 - $12,000',
    '4-6 weeks',
    86,
    'qualified',
    'whatsapp',
    'Hot lead. Requested pricing for CRM package.'
  ),
  (
    '55555555-5555-5555-5555-555555555002',
    '22222222-2222-2222-2222-222222222005',
    'Enterprise Support Desk',
    '$20,000+',
    'Immediate',
    91,
    'proposal',
    'whatsapp',
    'Needs SLA and VIP human takeover.'
  ),
  (
    '55555555-5555-5555-5555-555555555003',
    '22222222-2222-2222-2222-222222222003',
    'Real Estate Inquiry Bot',
    '$5,500',
    '2-3 weeks',
    64,
    'new',
    'whatsapp',
    'Requested product brochure.'
  ),
  (
    '55555555-5555-5555-5555-555555555004',
    '22222222-2222-2222-2222-222222222002',
    'Patient Support Bot',
    '$4,000 - $6,000',
    '3 weeks',
    72,
    'contacted',
    'whatsapp',
    'Demo booked for appointment reminders.'
  ),
  (
    '55555555-5555-5555-5555-555555555005',
    '22222222-2222-2222-2222-222222222004',
    'EdTech Admissions Assistant',
    '$3,000 - $4,500',
    '1 month',
    58,
    'nurture',
    'whatsapp',
    'Liked multilingual demo.'
  )
ON CONFLICT (id) DO UPDATE
SET
  service = EXCLUDED.service,
  budget = EXCLUDED.budget,
  timeline = EXCLUDED.timeline,
  lead_score = EXCLUDED.lead_score,
  status = EXCLUDED.status,
  source = EXCLUDED.source,
  notes = EXCLUDED.notes,
  updated_at = TIMEZONE('utc', NOW());

-- -----------------------------------------------------------------------------
-- Appointments
-- -----------------------------------------------------------------------------
INSERT INTO public.appointments (
  id,
  contact_id,
  title,
  appointment_date,
  appointment_time,
  status,
  notes
) VALUES
  (
    '66666666-6666-6666-6666-666666666001',
    '22222222-2222-2222-2222-222222222001',
    'Discovery Call — BrightLabs',
    CURRENT_DATE,
    '14:30:00',
    'confirmed',
    'Discuss CRM scope and WhatsApp automation.'
  ),
  (
    '66666666-6666-6666-6666-666666666002',
    '22222222-2222-2222-2222-222222222002',
    'Demo — Medora Clinics',
    CURRENT_DATE + 1,
    '15:00:00',
    'confirmed',
    'Google Meet demo for appointment workflows.'
  ),
  (
    '66666666-6666-6666-6666-666666666003',
    '22222222-2222-2222-2222-222222222005',
    'Proposal Review — Northwave',
    CURRENT_DATE + 3,
    '11:00:00',
    'scheduled',
    'Enterprise SLA and pricing review.'
  ),
  (
    '66666666-6666-6666-6666-666666666004',
    '22222222-2222-2222-2222-222222222003',
    'Kickoff Workshop — Coastal Realty',
    CURRENT_DATE + 4,
    '16:15:00',
    'scheduled',
    'Property inquiry bot requirements workshop.'
  )
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  appointment_date = EXCLUDED.appointment_date,
  appointment_time = EXCLUDED.appointment_time,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

-- -----------------------------------------------------------------------------
-- Knowledge base
-- -----------------------------------------------------------------------------
INSERT INTO public.knowledge_base (
  id,
  title,
  content,
  category,
  file_url
) VALUES
  (
    '77777777-7777-7777-7777-777777777001',
    'Pricing & Packages Overview',
    'Starter: AI inbox for small teams. Growth: lead scoring + appointments. Enterprise: SLA, VIP routing, dedicated success manager.',
    'Sales',
    NULL
  ),
  (
    '77777777-7777-7777-7777-777777777002',
    'WhatsApp Cloud API Setup Guide',
    'Connect Meta Business account, verify phone number, set webhook verify token, and map phone_number_id in backend environment variables.',
    'Onboarding',
    NULL
  ),
  (
    '77777777-7777-7777-7777-777777777003',
    'Lead Qualification Script',
    'Ask for company size, service needed, budget range, timeline, and decision maker. Score above 70 as qualified.',
    'Support',
    NULL
  ),
  (
    '77777777-7777-7777-7777-777777777004',
    'Appointment Booking Policies',
    'Offer 30-minute discovery or 45-minute demo slots. Confirm timezone. Send calendar invite after booking.',
    'Operations',
    NULL
  ),
  (
    '77777777-7777-7777-7777-777777777005',
    'Escalation Rules for VIP Clients',
    'If lead score >= 85 or tag VIP, suggest human takeover within 2 minutes and notify Support Lead.',
    'Support',
    NULL
  )
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  file_url = EXCLUDED.file_url,
  updated_at = TIMEZONE('utc', NOW());

-- -----------------------------------------------------------------------------
-- AI settings (single active config for development)
-- -----------------------------------------------------------------------------
INSERT INTO public.ai_settings (
  id,
  agent_name,
  system_prompt,
  model,
  temperature,
  enabled
) VALUES (
  '88888888-8888-8888-8888-888888888001',
  'Nexora Support Agent',
  'You are a professional customer support and sales assistant for a software house named Nexora. Be concise, helpful, and business-friendly. Qualify leads by collecting service interest, budget, and timeline. Escalate VIP or complex billing issues to human agents. Never invent pricing outside the knowledge base.',
  'gpt-4o-mini',
  0.40,
  TRUE
)
ON CONFLICT (id) DO UPDATE
SET
  agent_name = EXCLUDED.agent_name,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  enabled = EXCLUDED.enabled,
  updated_at = TIMEZONE('utc', NOW());

-- -----------------------------------------------------------------------------
-- Attach profile / team / ownership to first Auth user (if present)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_name TEXT;
BEGIN
  SELECT id, email
  INTO v_user_id, v_email
  FROM auth.users
  ORDER BY created_at
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth.users row found. Create a user in Supabase Auth, then re-run 003_seed_dev_data.sql to attach profile/team seed.';
    RETURN;
  END IF;

  v_name := COALESCE(split_part(v_email, '@', 1), 'Admin User');

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (v_user_id, initcap(replace(v_name, '.', ' ')), v_email, 'admin')
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = 'admin',
    updated_at = TIMEZONE('utc', NOW());

  INSERT INTO public.team_members (id, profile_id, role, status)
  VALUES (
    '99999999-9999-9999-9999-999999999001',
    v_user_id,
    'admin',
    'online'
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    status = EXCLUDED.status;

  UPDATE public.conversations
  SET assigned_to = v_user_id
  WHERE id IN (
    '33333333-3333-3333-3333-333333333002',
    '33333333-3333-3333-3333-333333333004'
  );

  UPDATE public.knowledge_base
  SET created_by = v_user_id
  WHERE created_by IS NULL;
END $$;
