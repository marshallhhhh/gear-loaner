import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  exportLoans,
  exportGear,
  getDashboardStats,
  getAuditLog,
  getAdminGearDetail,
} from '../controllers/adminController.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', getDashboardStats);
router.get('/export/loans', exportLoans);
router.get('/export/gear', exportGear);
router.get('/audit-log', getAuditLog);
router.get('/gear/:id', getAdminGearDetail);

export default router;
