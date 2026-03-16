/**
 * Role-based access control middleware.
 * Usage: requireRole('ADMIN') or requireRole('MEMBER', 'ADMIN')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
