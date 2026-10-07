const SENSITIVE =
  /(api[_-]?key|authorization|bearer\s+[a-z0-9._-]+|sk-[a-z0-9]+|system_prompt|service_role|openai_api_key)/i

function redact(value) {
  if (typeof value === 'string') {
    if (SENSITIVE.test(value)) return '[REDACTED]'
    return value.length > 500 ? `${value.slice(0, 500)}…` : value
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item))
  }

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

export const aiLogger = {
  info(message, meta = undefined) {
    if (meta === undefined) {
      console.log(`[ai] ${message}`)
      return
    }
    console.log(`[ai] ${message}`, redact(meta))
  },
  warn(message, meta = undefined) {
    if (meta === undefined) {
      console.warn(`[ai] ${message}`)
      return
    }
    console.warn(`[ai] ${message}`, redact(meta))
  },
  error(message, meta = undefined) {
    if (meta === undefined) {
      console.error(`[ai] ${message}`)
      return
    }
    console.error(`[ai] ${message}`, redact(meta))
  },
}
