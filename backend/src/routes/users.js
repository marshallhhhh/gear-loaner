import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  listUsers,
  getUser,
  updateUser,
  getMyProfile,
  updateMyProfile,
} from '../controllers/userController.js';

const router = Router();

// Own profile
router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, updateMyProfile);

// Admin
router.get('/', authenticate, requireRole('ADMIN'), listUsers);
router.get('/:id', authenticate, requireRole('ADMIN'), getUser);
router.put('/:id', authenticate, requireRole('ADMIN'), updateUser);

export default router;
