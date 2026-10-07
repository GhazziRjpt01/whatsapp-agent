import { createToolExecutor } from '../toolExecutor.js'
import { scoreLead, isHighIntent } from '../leadScoring.js'
import { createEmptyAgentOutput } from '../schemas.js'
import { aiLogger } from '../logger.js'

function extractLeadInformation(message, contact) {
  const emailMatch = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  const phoneMatch = message.match(/(\+?\d[\d\s()-]{7,}\d)/)
  const budgetMatch = message.match(/\$?\s?\d[\d,]*(?:\s*-\s*\$?\s?\d[\d,]*)?/)
  const companyMatch = message.match(
    /(?:company|at)\s*[:\-]?\s*([A-Za-z0-9 &._-]{2,60})/i,
  )

  let service = null
  if (/crm/i.test(message)) service = 'Custom CRM Development'
  else if (/whatsapp|inbox|support desk/i.test(message))
    service = 'WhatsApp AI Support Desk'
  else if (/appointment|booking/i.test(message))
    service = 'Appointment Booking Bots'
  else if (/real estate|property/i.test(message))
    service = 'Real Estate Inquiry Bot'

  let timeline = null
  if (/asap|immediate|this week/i.test(message)) timeline = 'Immediate'
  else if (/(\d+)\s*(week|weeks|month|months)/i.test(message)) {
    timeline = message.match(/(\d+\s*(?:week|weeks|month|months))/i)?.[1] || null
  }

  return {
    name: contact?.name || null,
    email: emailMatch?.[0] || contact?.email || null,
    phone: phoneMatch?.[0]?.replace(/\s+/g, '') || contact?.phone || null,
    company: companyMatch?.[1]?.trim() || contact?.company || null,
    service,
    budget: budgetMatch?.[0] || null,
    timeline,
    notes: null,
  }
}

function detectIntent(message) {
  const text = message.toLowerCase()
  if (/complaint|angry|refund|lawsuit|unacceptable/i.test(text))
    return 'complaint'
  if (/human|live agent|real person|representative|speak to/i.test(text))
    return 'human_handoff'
  if (/salary|api key|bank details|confidential|credentials|password/i.test(text))
    return 'support'
  if (/appointment|demo|call|schedule|meeting/i.test(text))
    return 'appointment_request'
  if (/price|pricing|cost|budget|quote/i.test(text)) return 'pricing'
  if (/crm|whatsapp|service|bot|build|develop/i.test(text))
    return 'service_inquiry'
  if (/hello|hi|salam|assalam|hey/i.test(text)) return 'greeting'
  return 'lead_qualification'
}

function resolveMockHandoff(message, intent) {
  if (intent === 'complaint') {
    return {
      reason: 'Customer complaint detected',
      reason_code: 'complaint',
    }
  }
  if (intent === 'human_handoff') {
    return {
      reason: 'Customer requested a human agent',
      reason_code: 'customer_request',
    }
  }
  if (/salary|api key|bank details|confidential|credentials|password/i.test(message)) {
    return {
      reason: 'Sensitive business information requested',
      reason_code: 'sensitive_info',
    }
  }
  if (/refund|legal|lawsuit/i.test(message)) {
    return {
      reason: 'Sensitive issue requiring human review',
      reason_code: 'sensitive_info',
    }
  }
  return null
}

function craftResponse({ message, intent, leadInformation, languageHint, handoff }) {
  const isUrdu = languageHint === 'urdu'
  const isRoman = languageHint === 'roman_urdu'

  if (handoff) {
    if (isUrdu) return 'میں آپ کو ابھی ایک انسانی ایجنٹ سے منسلک کر رہا/رہی ہوں۔'
    if (isRoman)
      return 'Main aapko abhi human agent se connect kar raha/rahi hoon.'
    return 'I am connecting you with a human agent now.'
  }

  if (intent === 'greeting') {
    if (isRoman)
      return 'Assalam o alaikum! Main Nexora support assistant hoon. Aap ko kis service mein madad chahiye?'
    return 'Hello! I am the Nexora support assistant. Which service can I help you with today?'
  }

  if (intent === 'appointment_request') {
    if (isRoman)
      return 'Bilkul — main demo schedule kar sakta/sakti hoon. Apna preferred date/time aur email share kar dein.'
    return 'Absolutely — I can schedule a demo. Please share your preferred date/time and email.'
  }

  if (intent === 'pricing' || intent === 'service_inquiry') {
    const service =
      leadInformation.service || 'WhatsApp AI Support Desk / Custom CRM'
    const missing = ['budget', 'timeline', 'company'].filter(
      (field) => !leadInformation[field],
    )
    if (isRoman) {
      return `Aap ${service} ke bare mein pooch rahe hain. Yeh Nexora ki core services mein se hai. ${
        missing.length
          ? `Agle step ke liye ${missing.join(', ')} share kar dein.`
          : 'Main aapke lead ko qualify karke team ko forward kar deta/deti hoon.'
      }`
    }
    return `You are asking about ${service}. That fits Nexora's core offerings. ${
      missing.length
        ? `To qualify your request, please share your ${missing.join(', ')}.`
        : 'I have enough detail to qualify this lead for our team.'
    }`
  }

  if (isRoman) {
    return `Shukriya! Main aapki request samajh gaya/gayi: "${message.slice(0, 120)}". Thora aur detail dein taake main best next step suggest kar sakoon.`
  }

  return `Thanks! I understood your request. Please share any missing details (company, budget, timeline) so I can recommend the best next step.`
}

export async function runMockAgent({
  message,
  settings,
  context,
  languageHint,
}) {
  aiLogger.info('Mock AI provider used', {
    conversationId: context.conversation.id,
    reason: 'OPENAI_API_KEY not configured or AI_PROVIDER=mock',
  })

  const toolRunner = createToolExecutor({
    contact: context.contact,
    conversation: context.conversation,
    existingLead: context.existingLead,
  })

  const intent = detectIntent(message)
  const leadInformation = extractLeadInformation(message, context.contact)
  const leadScore = scoreLead(leadInformation, intent)
  const highIntent = isHighIntent(leadScore, intent)
  const handoff = resolveMockHandoff(message, intent)
  const requiresHuman = Boolean(handoff)

  const knowledgeHits = await toolRunner.execute('search_knowledge_base', {
    query: leadInformation.service || message,
  })

  if (leadInformation.phone || leadInformation.email || leadInformation.name) {
    await toolRunner.execute('upsert_contact_details', leadInformation)
  }

  if (
    leadInformation.service ||
    leadInformation.budget ||
    leadInformation.timeline ||
    highIntent
  ) {
    await toolRunner.execute('create_or_update_lead', {
      ...leadInformation,
      lead_score: leadScore,
      status: highIntent ? 'qualified' : 'new',
      notes: `Mock AI qualification. Knowledge hits: ${
        Array.isArray(knowledgeHits) ? knowledgeHits.length : 0
      }`,
    })
  }

  if (intent === 'appointment_request' && !requiresHuman) {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    await toolRunner.execute('schedule_appointment', {
      title: `Discovery Call — ${leadInformation.company || leadInformation.name || 'Prospect'}`,
      appointment_date: date.toISOString().slice(0, 10),
      appointment_time: '15:00',
      notes: 'Auto-scheduled by mock AI provider',
    })
  }

  if (requiresHuman) {
    await toolRunner.execute('request_human_handoff', handoff)
  }

  const response = craftResponse({
    message,
    intent,
    leadInformation,
    languageHint,
    handoff: requiresHuman,
  })

  const output = createEmptyAgentOutput(response, {
    intent,
    lead_information: leadInformation,
    lead_score: leadScore,
    requires_human: requiresHuman,
    suggested_service: leadInformation.service || 'WhatsApp AI Support Desk',
  })

  await toolRunner.execute('finalize_response', output)

  return {
    output,
    provider: 'mock',
    model: 'mock-agent-v1',
    toolTrace: toolRunner.getState().toolTrace,
    session: toolRunner.getState(),
  }
}
