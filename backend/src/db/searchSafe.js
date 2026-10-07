/**
 * Sanitize free-text search before interpolating into PostgREST `.or()` filters.
 * Strips filter metacharacters that could break or widen the query.
 */
export function sanitizeSearchTerm(value, { maxLength = 80 } = {}) {
  if (value == null) return ''

  return String(value)
    .normalize('NFKC')
    .replace(/[%_,.()"'\\]/g, ' ')
    .replace(/[^\p{L}\p{N}\s@.+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function buildIlikeOrFilter(columns, term) {
  const cleaned = sanitizeSearchTerm(term)
  if (!cleaned || !Array.isArray(columns) || columns.length === 0) return null

  const pattern = `%${cleaned}%`
  return columns.map((column) => `${column}.ilike.${pattern}`).join(',')
}
