import { describe, it, expect, vi } from 'vitest';
import { validate, validateQuery } from '../src/middleware/validate.js';
import { requireRole } from '../src/middleware/roles.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { z } from 'zod';

// Helper to create mock Express req/res/next
function mockReqResNext(overrides = {}) {
  const req = { body: {}, query: {}, headers: {}, method: 'GET', originalUrl: '/', ...overrides };
  const res = {
    statusCode: 200,
    _json: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this._json = data;
      return this;
    },
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('validate (body)', () => {
  const schema = z.object({ name: z.string().min(1) }).strip();

  it('calls next on valid body', () => {
    const { req, res, next } = mockReqResNext({ body: { name: 'Test' } });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'Test' });
  });

  it('strips unknown fields', () => {
    const { req, res, next } = mockReqResNext({ body: { name: 'Test', extra: 'bad' } });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).not.toHaveProperty('extra');
  });

  it('returns 400 on invalid body', () => {
    const { req, res, next } = mockReqResNext({ body: {} });
    validate(schema)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res._json.error).toBe('Validation failed');
    expect(res._json.details).toBeDefined();
  });
});

describe('validateQuery', () => {
  const schema = z.object({ page: z.string().regex(/^\d+$/).optional() }).strip();

  it('calls next on valid query', () => {
    const { req, res, next } = mockReqResNext({ query: { page: '1' } });
    validateQuery(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 on invalid query', () => {
    const { req, res, next } = mockReqResNext({ query: { page: 'abc' } });
    validateQuery(schema)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});

describe('requireRole', () => {
  it('calls next when user has required role', () => {
    const { req, res, next } = mockReqResNext();
    req.profile = { role: 'ADMIN' };
    requireRole('ADMIN')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('accepts multiple roles', () => {
    const { req, res, next } = mockReqResNext();
    req.profile = { role: 'MEMBER' };
    requireRole('MEMBER', 'ADMIN')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when role does not match', () => {
    const { req, res, next } = mockReqResNext();
    req.profile = { role: 'MEMBER' };
    requireRole('ADMIN')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('returns 401 when no profile attached', () => {
    const { req, res, next } = mockReqResNext();
    requireRole('ADMIN')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});

describe('errorHandler', () => {
  it('returns 404 for Prisma P2025 errors', () => {
    const { req, res, next } = mockReqResNext();
    const err = new Error('Not found');
    err.code = 'P2025';
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(404);
    expect(res._json.error).toBe('Record not found');
  });

  it('returns 409 for Prisma P2002 errors', () => {
    const { req, res, next } = mockReqResNext();
    const err = new Error('Unique constraint');
    err.code = 'P2002';
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(409);
  });

  it('returns 500 for generic errors', () => {
    const { req, res, next } = mockReqResNext();
    errorHandler(new Error('boom'), req, res, next);
    expect(res.statusCode).toBe(500);
  });

  it('uses custom status if set on error', () => {
    const { req, res, next } = mockReqResNext();
    const err = new Error('bad');
    err.status = 422;
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(422);
  });
});
