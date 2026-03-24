import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { nanoidParamSchema, assignQrTagSchema, listUntaggedGearQuerySchema } from '../schemas.js';
import {
  getQrTag,
  createQrTagHandler,
  assignQrTag,
  unassignQrTag,
  listUntaggedGear,
} from '../controllers/qrTagController.js';

const router = Router();

/** Validate :nanoid param against the nanoid format. */
function validateNanoidParam(req, res, next) {
  const result = nanoidParamSchema.safeParse(req.params?.nanoid);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{ path: 'nanoid', message: 'Invalid nanoid format' }],
    });
  }
  next();
}

// Admin: list gear without QR tags (must be before /:nanoid to avoid conflict)
router.get(
  '/untagged-gear',
  authenticate,
  requireRole('ADMIN'),
  validateQuery(listUntaggedGearQuerySchema),
  listUntaggedGear,
);

// Public (with optional auth for admin detection)
router.get('/:nanoid', validateNanoidParam, optionalAuth, getQrTag);

// Admin only
router.post('/', authenticate, requireRole('ADMIN'), createQrTagHandler);
router.post(
  '/:nanoid/assign',
  validateNanoidParam,
  authenticate,
  requireRole('ADMIN'),
  validate(assignQrTagSchema),
  assignQrTag,
);
router.post(
  '/:nanoid/unassign',
  validateNanoidParam,
  authenticate,
  requireRole('ADMIN'),
  unassignQrTag,
);

export default router;
