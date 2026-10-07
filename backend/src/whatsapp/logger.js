const SENSITIVE =
  /(access[_-]?token|authorization|bearer\s+[a-z0-9._-]+|verify[_-]?token|api[_-]?key|sk-[a-z0-9]+|service[_-]?role)/i

function redact(value) {
  if (typeof value === 'string') {
    if (SENSITIVE.test(value)) return '[REDACTED]'
    return value.length > 800 ? `${value.slice(0, 800)}…` : value
  }

  if (Array.isArray(value)) return value.map((item) => redact(item))

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SENSITIVE.test(key) ? '[REDACTED]' : redact(nested),
      ]),
    )
  }

  return value
}

export const waLogger = {
  info(message, meta) {
    if (meta === undefined) console.log(`[whatsapp] ${message}`)
    else console.log(`[whatsapp] ${message}`, redact(meta))
  },
  warn(message, meta) {
    if (meta === undefined) console.warn(`[whatsapp] ${message}`)
    else console.warn(`[whatsapp] ${message}`, redact(meta))
  },
  error(message, meta) {
    if (meta === undefined) console.error(`[whatsapp] ${message}`)
    else console.error(`[whatsapp] ${message}`, redact(meta))
  },
}
