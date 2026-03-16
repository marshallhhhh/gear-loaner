import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  listLoans,
  getMyLoans,
  checkout,
  returnGear,
  overrideLoan,
} from '../controllers/loanController.js';

const router = Router();

// Member
router.get('/my', authenticate, getMyLoans);
router.post('/checkout', authenticate, checkout);
router.post('/:id/return', authenticate, returnGear);

// Admin
router.get('/', authenticate, requireRole('ADMIN'), listLoans);
router.put('/:id/override', authenticate, requireRole('ADMIN'), overrideLoan);

export default router;
