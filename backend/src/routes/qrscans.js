import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { recordScan, listScans } from '../controllers/qrscanController.js';

const router = Router();

router.post('/', optionalAuth, recordScan);
router.get('/', authenticate, requireRole('ADMIN'), listScans);

export default router;
