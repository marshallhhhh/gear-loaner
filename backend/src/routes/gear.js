import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  createGearSchema,
  updateGearSchema,
  reportLostSchema,
  listGearQuerySchema,
} from '../schemas.js';
import {
  listGear,
  getGear,
  createGear,
  updateGear,
  deleteGear,
  reportLost,
  getCategories,
} from '../controllers/gearController.js';

const router = Router();

// Public
router.get('/categories', getCategories);
router.get('/:id', optionalAuth, getGear);
router.post('/:id/report-lost', optionalAuth, validate(reportLostSchema), reportLost);

// Authenticated
router.get('/', authenticate, validateQuery(listGearQuerySchema), listGear);

// Admin only
router.post('/', authenticate, requireRole('ADMIN'), validate(createGearSchema), createGear);
router.put('/:id', authenticate, requireRole('ADMIN'), validate(updateGearSchema), updateGear);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteGear);

export default router;
