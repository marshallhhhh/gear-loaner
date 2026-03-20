import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateUuidParam } from '../middleware/validate.js';
import { adminExportLimiter } from '../middleware/rateLimiters.js';
import {
  exportLoans,
  exportGear,
  getDashboardStats,
  getAuditLog,
  getAdminGearDetail,
  closeAllOpenReports,
} from '../controllers/adminController.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', getDashboardStats);
router.get('/export/loans', adminExportLimiter, exportLoans);
router.get('/export/gear', adminExportLimiter, exportGear);
router.get('/audit-log', getAuditLog);
router.get('/gear/:id', validateUuidParam(), getAdminGearDetail);
router.post('/gear/:id/close-reports', validateUuidParam(), closeAllOpenReports);

export default router;
