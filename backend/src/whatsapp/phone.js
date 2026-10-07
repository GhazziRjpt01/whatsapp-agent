/**
 * Normalize WhatsApp phone numbers to E.164-ish form: +<digits>
 */
export function normalizeWhatsAppPhone(input) {
  if (!input) return null
  const digits = String(input).replace(/[^\d]/g, '')
  if (!digits) return null
  return `+${digits}`
}

export function phonesMatch(a, b) {
  const left = normalizeWhatsAppPhone(a)
  const right = normalizeWhatsAppPhone(b)
  return Boolean(left && right && left === right)
}
