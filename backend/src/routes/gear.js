import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
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
router.post('/:id/report-lost', optionalAuth, reportLost);

// Authenticated
router.get('/', authenticate, listGear);

// Admin only
router.post('/', authenticate, requireRole('ADMIN'), createGear);
router.put('/:id', authenticate, requireRole('ADMIN'), updateGear);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteGear);

export default router;
