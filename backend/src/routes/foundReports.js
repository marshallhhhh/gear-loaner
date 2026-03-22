import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate, validateQuery, validateUuidParam } from '../middleware/validate.js';
import { createFoundReportSchema, listFoundReportsQuerySchema } from '../schemas.js';
import {
  createFoundReport,
  listFoundReports,
  closeFoundReport,
} from '../controllers/foundReportController.js';

const router = Router();
const createFoundReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public (anyone who scans a QR code can submit a report)
router.post(
  '/:id',
  createFoundReportLimiter,
  optionalAuth,
  validate(createFoundReportSchema),
  createFoundReport,
);

// Admin only
router.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validateQuery(listFoundReportsQuerySchema),
  listFoundReports,
);
router.patch(
  '/:id/close',
  validateUuidParam(),
  authenticate,
  requireRole('ADMIN'),
  closeFoundReport,
);

export default router;
