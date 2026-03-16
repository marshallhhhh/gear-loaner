import prisma from '../config/prisma.js';

/**
 * Record an action in the audit log.
 */
export async function logAction({ userId, action, entity, entityId, details }) {
  return prisma.auditLog.create({
    data: { userId, action, entity, entityId, details },
  });
}
