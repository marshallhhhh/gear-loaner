import { z } from 'zod';

/**
 * Express middleware that validates req.body against a Zod schema.
 * Replaces req.body with the parsed (stripped) output on success.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Express middleware that validates req.query against a Zod schema.
 * Replaces req.query with the parsed output on success.
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = result.error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}

const shortIdSchema = z.string().regex(/^[A-Za-z]{3}-\d{3}$/);

/**
 * Express middleware that validates a route param as UUID.
 * Can optionally allow the gear short-id format (AAA-123).
 */
export function validateUuidParam(paramName = 'id', { allowShortId = false } = {}) {
  const schema = allowShortId ? z.union([z.uuid(), shortIdSchema]) : z.uuid();

  return (req, res, next) => {
    const result = schema.safeParse(req.params?.[paramName]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ path: paramName, message: `Invalid ${paramName}` }],
      });
    }

    req.params[paramName] = typeof result.data === 'string' ? result.data : req.params[paramName];
    next();
  };
}
