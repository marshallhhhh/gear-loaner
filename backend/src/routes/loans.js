import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  checkoutSchema,
  returnGearSchema,
  overrideLoanSchema,
  listLoansQuerySchema,
} from '../schemas.js';
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
router.post('/checkout', authenticate, validate(checkoutSchema), checkout);
router.post('/:id/return', authenticate, validate(returnGearSchema), returnGear);

// Admin
router.get('/', authenticate, requireRole('ADMIN'), validateQuery(listLoansQuerySchema), listLoans);
router.put(
  '/:id/override',
  authenticate,
  requireRole('ADMIN'),
  validate(overrideLoanSchema),
  overrideLoan,
);

export default router;
