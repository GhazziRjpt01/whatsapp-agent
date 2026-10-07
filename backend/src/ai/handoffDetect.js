import { HANDOFF_REASON_CODES, REASON_LABELS } from '../services/handoff.constants.js'

const CUSTOMER_REQUEST_RE =
  /\b(human|real person|live agent|speak to (a |an )?(agent|person|representative|someone)|talk to (a |an )?(human|agent|person)|customer service|representative)\b/i

const COMPLAINT_RE =
  /\b(complaint|complain|angry|frustrated|terrible|awful|refund|scam|lawsuit|legal action|unacceptable|worst|furious)\b/i

const SENSITIVE_RE =
  /\b(salary|payroll|bank (account|details)|wire transfer|api[_ ]?key|credentials|password|profit margin|internal (pricing|cost)|employee (list|data)|confidential contract|source code|database (dump|access)|ssn|national id)\b/i

const LOW_CONFIDENCE_CUSTOMER_RE =
  /\b(you (don'?t|do not) understand|that('?s| is) not (what|helpful)|wrong answer|useless)\b/i

/**
 * Decide whether AI should escalate, and why.
 * Priority order matters (first match wins).
 */
export function detectHandoffNeed({
  message = '',
  output = {},
  knowledgeHits = 0,
  alreadyRequested = false,
} = {}) {
  if (alreadyRequested) {
    return {
      reasonCode: HANDOFF_REASON_CODES.CUSTOMER_REQUEST,
      reason: REASON_LABELS.customer_request,
    }
  }

  const text = String(message || '')
  const intent = output.intent || 'other'
  const leadScore = Number(output.lead_score || 0)
  const requiresHuman = Boolean(output.requires_human)

  if (CUSTOMER_REQUEST_RE.test(text) || intent === 'human_handoff') {
    return {
      reasonCode: HANDOFF_REASON_CODES.CUSTOMER_REQUEST,
      reason: REASON_LABELS.customer_request,
    }
  }

  if (COMPLAINT_RE.test(text) || intent === 'complaint') {
    return {
      reasonCode: HANDOFF_REASON_CODES.COMPLAINT,
      reason: REASON_LABELS.complaint,
    }
  }

  if (SENSITIVE_RE.test(text)) {
    return {
      reasonCode: HANDOFF_REASON_CODES.SENSITIVE_INFO,
      reason: REASON_LABELS.sensitive_info,
    }
  }

  if (
    requiresHuman ||
    LOW_CONFIDENCE_CUSTOMER_RE.test(text) ||
    (intent === 'support' && Number(knowledgeHits) === 0)
  ) {
    return {
      reasonCode: HANDOFF_REASON_CODES.LOW_CONFIDENCE,
      reason: REASON_LABELS.low_confidence,
    }
  }

  const lead = output.lead_information || {}
  // Require strong commercial signal: score + service + budget + timeline.
  const qualifiedHighIntent =
    leadScore >= 75 &&
    Boolean(lead.service) &&
    Boolean(lead.budget) &&
    Boolean(lead.timeline)

  if (qualifiedHighIntent) {
    return {
      reasonCode: HANDOFF_REASON_CODES.HIGH_INTENT,
      reason: REASON_LABELS.high_intent,
    }
  }

  return null
}
