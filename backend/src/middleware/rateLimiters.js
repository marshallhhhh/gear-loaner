import rateLimit from 'express-rate-limit';

// Protect auth-dependent endpoints from token spraying and abuse.
export const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again shortly.',
  },
});

// Profile updates are low-volume user actions and should be tightly throttled.
export const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many profile updates. Please wait before trying again.',
  },
});

// CSV exports can be expensive and should have stricter limits.
export const adminExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many export requests. Please try again later.',
  },
});
