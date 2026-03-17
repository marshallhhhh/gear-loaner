import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasOverdueLoans, getOverdueLoans } from '../src/services/loanService.js';
import prisma from '../src/config/prisma.js';

vi.mock('../src/config/prisma.js', () => ({
  default: {
    loan: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('loanService - hasOverdueLoans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when user has overdue active loans', async () => {
    vi.mocked(prisma.loan.count).mockResolvedValue(1);

    const result = await hasOverdueLoans('user-123');

    expect(result).toBe(true);
  });

  it('returns false when user has no overdue loans', async () => {
    vi.mocked(prisma.loan.count).mockResolvedValue(0);

    const result = await hasOverdueLoans('user-123');

    expect(result).toBe(false);
  });

  it('queries with correct filters', async () => {
    vi.mocked(prisma.loan.count).mockResolvedValue(0);

    await hasOverdueLoans('user-123');

    expect(vi.mocked(prisma.loan.count)).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        status: 'ACTIVE',
        dueDate: { lt: expect.any(Date) },
      },
    });
  });

  it('uses ACTIVE status filter', async () => {
    vi.mocked(prisma.loan.count).mockResolvedValue(0);

    await hasOverdueLoans('user-123');

    const callArgs = vi.mocked(prisma.loan.count).mock.calls[0][0];
    expect(callArgs.where.status).toBe('ACTIVE');
  });

  it('compares due date to current time', async () => {
    vi.mocked(prisma.loan.count).mockResolvedValue(0);
    const beforeCall = new Date();

    await hasOverdueLoans('user-123');

    const afterCall = new Date();
    const callArgs = vi.mocked(prisma.loan.count).mock.calls[0][0];
    const dueDate = callArgs.where.dueDate.lt;

    expect(dueDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime() - 1000);
    expect(dueDate.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 1000);
  });

  it('returns false when count is 0', async () => {
    vi.mocked(prisma.loan.count).mockResolvedValue(0);

    const result = await hasOverdueLoans('user-456');

    expect(result).toBe(false);
  });

  it('returns true when count is greater than 1', async () => {
    vi.mocked(prisma.loan.count).mockResolvedValue(5);

    const result = await hasOverdueLoans('user-456');

    expect(result).toBe(true);
  });

  it('handles different user IDs', async () => {
    vi.mocked(prisma.loan.count).mockResolvedValue(0);

    await hasOverdueLoans('user-abc-123');

    expect(vi.mocked(prisma.loan.count)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-abc-123',
        }),
      })
    );
  });

  it('handles database errors', async () => {
    vi.mocked(prisma.loan.count).mockRejectedValue(new Error('Database connection failed'));

    await expect(() => hasOverdueLoans('user-123')).rejects.toThrow('Database connection failed');
  });

  it('returns boolean type', async () => {
    vi.mocked(prisma.loan.count).mockResolvedValue(0);
    const result = await hasOverdueLoans('user-123');
    expect(typeof result).toBe('boolean');
  });
});

describe('loanService - getOverdueLoans', () => {
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    fullName: 'John Doe',
    role: 'MEMBER',
  };

  const mockGearItem = {
    id: 'gear-456',
    name: 'Dynamic Rope 60m',
    shortId: 'DYN-001',
    loanStatus: 'CHECKED_OUT',
  };

  const mockLoan = {
    id: 'loan-789',
    userId: 'user-123',
    gearItemId: 'gear-456',
    status: 'ACTIVE',
    dueDate: new Date('2026-03-15'),
    checkedOutAt: new Date('2026-03-10'),
    user: mockUser,
    gearItem: mockGearItem,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of overdue loans', async () => {
    vi.mocked(prisma.loan.findMany).mockResolvedValue([mockLoan]);

    const result = await getOverdueLoans();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
  });

  it('returns empty array when no overdue loans', async () => {
    vi.mocked(prisma.loan.findMany).mockResolvedValue([]);

    const result = await getOverdueLoans();

    expect(result).toEqual([]);
  });

  it('includes user data in result', async () => {
    vi.mocked(prisma.loan.findMany).mockResolvedValue([mockLoan]);

    const result = await getOverdueLoans();

    expect(result[0].user).toEqual(mockUser);
    expect(result[0].user.email).toBe('user@example.com');
  });

  it('includes gear item data in result', async () => {
    vi.mocked(prisma.loan.findMany).mockResolvedValue([mockLoan]);

    const result = await getOverdueLoans();

    expect(result[0].gearItem).toEqual(mockGearItem);
    expect(result[0].gearItem.name).toBe('Dynamic Rope 60m');
  });

  it('filters by ACTIVE status', async () => {
    vi.mocked(prisma.loan.findMany).mockResolvedValue([]);

    await getOverdueLoans();

    expect(vi.mocked(prisma.loan.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
        }),
      })
    );
  });

  it('filters by past due dates', async () => {
    vi.mocked(prisma.loan.findMany).mockResolvedValue([]);

    await getOverdueLoans();

    const callArgs = vi.mocked(prisma.loan.findMany).mock.calls[0][0];
    expect(callArgs.where.dueDate).toEqual({ lt: expect.any(Date) });
  });

  it('includes user relationship', async () => {
    vi.mocked(prisma.loan.findMany).mockResolvedValue([]);

    await getOverdueLoans();

    expect(vi.mocked(prisma.loan.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          user: true,
        }),
      })
    );
  });

  it('includes gearItem relationship', async () => {
    vi.mocked(prisma.loan.findMany).mockResolvedValue([]);

    await getOverdueLoans();

    expect(vi.mocked(prisma.loan.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          gearItem: true,
        }),
      })
    );
  });

  it('returns multiple overdue loans', async () => {
    const loan1 = { ...mockLoan, id: 'loan-1' };
    const loan2 = { ...mockLoan, id: 'loan-2', userId: 'user-456' };
    const loan3 = { ...mockLoan, id: 'loan-3', userId: 'user-789' };

    vi.mocked(prisma.loan.findMany).mockResolvedValue([loan1, loan2, loan3]);

    const result = await getOverdueLoans();

    expect(result.length).toBe(3);
    expect(result[0].id).toBe('loan-1');
    expect(result[1].id).toBe('loan-2');
    expect(result[2].id).toBe('loan-3');
  });

  it('preserves loan data structure', async () => {
    vi.mocked(prisma.loan.findMany).mockResolvedValue([mockLoan]);

    const result = await getOverdueLoans();

    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('userId');
    expect(result[0]).toHaveProperty('gearItemId');
    expect(result[0]).toHaveProperty('status');
    expect(result[0]).toHaveProperty('dueDate');
    expect(result[0]).toHaveProperty('checkedOutAt');
    expect(result[0]).toHaveProperty('user');
    expect(result[0]).toHaveProperty('gearItem');
  });

  it('handles database errors', async () => {
    vi.mocked(prisma.loan.findMany).mockRejectedValue(new Error('Query failed'));

    await expect(() => getOverdueLoans()).rejects.toThrow('Query failed');
  });

  it('handles no results from database', async () => {
    vi.mocked(prisma.loan.findMany).mockResolvedValue(null);

    const result = await getOverdueLoans();

    expect(result).toBeNull();
  });

  it('returns loans with correct status', async () => {
    const returnedLoan = { ...mockLoan, status: 'RETURNED' };
    vi.mocked(prisma.loan.findMany).mockResolvedValue([mockLoan]); // Only ACTIVE loans

    const result = await getOverdueLoans();

    expect(result[0].status).toBe('ACTIVE');
  });

  it('returns loans with overdue due dates', async () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000); // 1 day ago

    const overdueLoan = { ...mockLoan, dueDate: pastDate };
    vi.mocked(prisma.loan.findMany).mockResolvedValue([overdueLoan]);

    const result = await getOverdueLoans();

    expect(result[0].dueDate.getTime()).toBeLessThan(now.getTime());
  });
});
