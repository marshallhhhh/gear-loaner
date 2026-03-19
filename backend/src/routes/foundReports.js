import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  createFoundReportSchema,
  listFoundReportsQuerySchema,
} from '../schemas.js';
import {
  createFoundReport,
  listFoundReports,
  closeFoundReport,
} from '../controllers/foundReportController.js';

const router = Router();

// Public (anyone who scans a QR code can submit a report)
router.post('/:id', optionalAuth, validate(createFoundReportSchema), createFoundReport);

// Admin only
router.get('/', authenticate, requireRole('ADMIN'), validateQuery(listFoundReportsQuerySchema), listFoundReports);
router.patch('/:id/close', authenticate, requireRole('ADMIN'), closeFoundReport);

export default router;
