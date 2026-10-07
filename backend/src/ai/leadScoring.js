export function scoreLead(leadInformation = {}, intent = 'other') {
  let score = 10

  const fields = ['name', 'email', 'phone', 'company', 'service', 'budget', 'timeline']
  for (const field of fields) {
    if (leadInformation[field]) score += 10
  }

  if (intent === 'pricing' || intent === 'appointment_request') score += 10
  if (intent === 'lead_qualification') score += 8
  if (intent === 'human_handoff') score += 5

  const budget = String(leadInformation.budget || '').toLowerCase()
  if (
    budget.includes('20') ||
    budget.includes('enterprise') ||
    budget.includes('urgent') ||
    /\$?\s?(1[5-9]|[2-9]\d)\s?,?000/.test(budget)
  ) {
    score += 10
  }

  const timeline = String(leadInformation.timeline || '').toLowerCase()
  if (
    timeline.includes('immediate') ||
    timeline.includes('asap') ||
    timeline.includes('this week') ||
    timeline.includes('1 week')
  ) {
    score += 8
  }

  return Math.max(0, Math.min(100, score))
}

export function isHighIntent(score, intent) {
  return (
    score >= 70 ||
    intent === 'appointment_request' ||
    intent === 'pricing'
  )
}
