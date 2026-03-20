import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate, validateQuery, validateUuidParam } from '../middleware/validate.js';
import {
  createGearSchema,
  updateGearSchema,
  changeGearStatusSchema,
  listGearQuerySchema,
} from '../schemas.js';
import {
  listGear,
  getGear,
  createGear,
  updateGear,
  changeGearStatus,
  getCategories,
} from '../controllers/gearController.js';

const router = Router();

// Public
router.get('/categories', getCategories);
router.get('/:id', validateUuidParam('id', { allowShortId: true }), optionalAuth, getGear);

// Authenticated
router.get('/', authenticate, validateQuery(listGearQuerySchema), listGear);

// Admin only
router.post('/', authenticate, requireRole('ADMIN'), validate(createGearSchema), createGear);
router.put(
  '/:id',
  validateUuidParam(),
  authenticate,
  requireRole('ADMIN'),
  validate(updateGearSchema),
  updateGear,
);
router.post(
  '/:id/status',
  validateUuidParam(),
  authenticate,
  requireRole('ADMIN'),
  validate(changeGearStatusSchema),
  changeGearStatus,
);

export default router;
