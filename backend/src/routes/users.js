import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate, validateQuery, validateUuidParam } from '../middleware/validate.js';
import { authSensitiveLimiter, profileUpdateLimiter } from '../middleware/rateLimiters.js';
import { updateUserSchema, updateMyProfileSchema, listUsersQuerySchema } from '../schemas.js';
import {
  listUsers,
  getUser,
  updateUser,
  getMyProfile,
  updateMyProfile,
} from '../controllers/userController.js';

const router = Router();

// Own profile
router.get('/me', authSensitiveLimiter, authenticate, getMyProfile);
router.put(
  '/me',
  authSensitiveLimiter,
  profileUpdateLimiter,
  authenticate,
  validate(updateMyProfileSchema),
  updateMyProfile,
);

// Admin
router.get('/', authenticate, requireRole('ADMIN'), validateQuery(listUsersQuerySchema), listUsers);
router.get('/:id', validateUuidParam(), authenticate, requireRole('ADMIN'), getUser);
router.put('/:id', validateUuidParam(), authenticate, requireRole('ADMIN'), validate(updateUserSchema), updateUser);

export default router;
