import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  exportLoans,
  exportGear,
  getDashboardStats,
  getAuditLog,
  getAdminGearDetail,
  markFound,
} from '../controllers/adminController.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', getDashboardStats);
router.get('/export/loans', exportLoans);
router.get('/export/gear', exportGear);
router.get('/audit-log', getAuditLog);
router.get('/gear/:id', getAdminGearDetail);
router.post('/gear/:id/mark-found', markFound);

export default router;
