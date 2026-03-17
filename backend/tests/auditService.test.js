import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAction } from '../src/services/auditService.js';
import prisma from '../src/config/prisma.js';

vi.mock('../src/config/prisma.js', () => ({
  default: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('logAction', () => {
  const mockAuditLog = {
    id: 'log-123',
    userId: 'user-456',
    action: 'CHECKOUT',
    entity: 'Loan',
    entityId: 'loan-789',
    details: { gearName: 'Rope' },
    createdAt: new Date('2026-03-18'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.auditLog.create).mockResolvedValue(mockAuditLog);
  });

  it('creates audit log with all provided fields', async () => {
    const result = await logAction({
      userId: 'user-456',
      action: 'CHECKOUT',
      entity: 'Loan',
      entityId: 'loan-789',
      details: { gearName: 'Rope' },
    });

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith({
      data: {
        userId: 'user-456',
        action: 'CHECKOUT',
        entity: 'Loan',
        entityId: 'loan-789',
        details: { gearName: 'Rope' },
      },
    });
    expect(result).toEqual(mockAuditLog);
  });

  it('logs CHECKOUT action', async () => {
    await logAction({
      userId: 'user-1',
      action: 'CHECKOUT',
      entity: 'Loan',
      entityId: 'loan-1',
      details: null,
    });

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'CHECKOUT',
      }),
    });
  });

  it('logs RETURN action', async () => {
    await logAction({
      userId: 'user-1',
      action: 'RETURN',
      entity: 'Loan',
      entityId: 'loan-1',
      details: { condition: 'Good' },
    });

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'RETURN',
        details: { condition: 'Good' },
      }),
    });
  });

  it('logs REPORT_LOST action', async () => {
    await logAction({
      userId: 'user-1',
      action: 'REPORT_LOST',
      entity: 'GearItem',
      entityId: 'gear-1',
      details: { location: 'Outdoor wall' },
    });

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'REPORT_LOST',
        entity: 'GearItem',
      }),
    });
  });

  it('logs STATUS_CHANGE action', async () => {
    await logAction({
      userId: 'user-admin',
      action: 'STATUS_CHANGE',
      entity: 'GearItem',
      entityId: 'gear-1',
      details: { oldStatus: 'AVAILABLE', newStatus: 'RETIRED' },
    });

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'STATUS_CHANGE',
        entity: 'GearItem',
        details: { oldStatus: 'AVAILABLE', newStatus: 'RETIRED' },
      }),
    });
  });

  it('logs CREATE action for new gear', async () => {
    await logAction({
      userId: 'user-admin',
      action: 'CREATE',
      entity: 'GearItem',
      entityId: 'gear-new',
      details: { name: 'New Rope' },
    });

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'CREATE',
        entity: 'GearItem',
      }),
    });
  });

  it('logs UPDATE action', async () => {
    await logAction({
      userId: 'user-admin',
      action: 'UPDATE',
      entity: 'GearItem',
      entityId: 'gear-1',
      details: { field: 'description', oldValue: 'old', newValue: 'new' },
    });

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'UPDATE',
      }),
    });
  });

  it('logs USER_ROLE_CHANGE action', async () => {
    await logAction({
      userId: 'admin-1',
      action: 'USER_ROLE_CHANGE',
      entity: 'Profile',
      entityId: 'user-2',
      details: { oldRole: 'MEMBER', newRole: 'ADMIN' },
    });

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'USER_ROLE_CHANGE',
        entity: 'Profile',
      }),
    });
  });

  it('supports null details', async () => {
    await logAction({
      userId: 'user-1',
      action: 'CHECKOUT',
      entity: 'Loan',
      entityId: 'loan-1',
      details: null,
    });

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: null,
      }),
    });
  });

  it('supports complex nested details object', async () => {
    const complexDetails = {
      gearName: 'Dynamic Rope',
      user: { id: 'user-1', name: 'John' },
      location: { lat: 40.7128, lng: -74.006 },
      metadata: ['tag1', 'tag2'],
    };

    await logAction({
      userId: 'user-1',
      action: 'CHECKOUT',
      entity: 'Loan',
      entityId: 'loan-1',
      details: complexDetails,
    });

    expect(vi.mocked(prisma.auditLog.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: complexDetails,
      }),
    });
  });

  it('handles Prisma errors appropriately', async () => {
    vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error('Database error'));

    await expect(() =>
      logAction({
        userId: 'user-1',
        action: 'CHECKOUT',
        entity: 'Loan',
        entityId: 'loan-1',
        details: null,
      }),
    ).rejects.toThrow('Database error');
  });

  it('returns the created audit log record', async () => {
    const result = await logAction({
      userId: 'user-1',
      action: 'CHECKOUT',
      entity: 'Loan',
      entityId: 'loan-1',
      details: null,
    });

    expect(result).toEqual(mockAuditLog);
    expect(result.id).toBe('log-123');
    expect(result.createdAt).toEqual(new Date('2026-03-18'));
  });
});
