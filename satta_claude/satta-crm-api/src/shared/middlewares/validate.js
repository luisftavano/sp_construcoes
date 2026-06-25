import { ValidationError } from '../errors/index.js'

/**
 * Validates request parts against Zod schemas.
 * Usage: validate({ body: mySchema, params: paramsSchema, query: querySchema })
 */
export function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (body) req.body = body.parse(req.body)
      if (params) req.params = params.parse(req.params)
      if (query) req.query = query.parse(req.query)
      next()
    } catch (err) {
      const details = err.errors?.map(e => ({ path: e.path.join('.'), message: e.message })) ?? []
      next(new ValidationError('Validation failed', details))
    }
  }
}
