import { ApiError } from '../utils/ApiError.js'

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))

      return next(new ApiError(400, 'Validation failed', details))
    }

    req.validated = {
      ...(req.validated || {}),
      [source]: result.data,
    }

    // Express 5 makes req.query / req.params read-only getters.
    if (source === 'body') {
      req.body = result.data
    }

    return next()
  }
}

export function getValidated(req, source, fallback = {}) {
  return req.validated?.[source] || req[source] || fallback
}
