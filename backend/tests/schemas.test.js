import { describe, it, expect } from 'vitest';
import {
  createGearSchema,
  updateGearSchema,
  changeGearStatusSchema,
  checkoutSchema,
  returnGearSchema,
  updateUserSchema,
  listGearQuerySchema,
  listLoansQuerySchema,
  listUsersQuerySchema,
  reportLostSchema,
  overrideLoanSchema,
} from '../src/schemas.js';

describe('createGearSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createGearSchema.safeParse({ name: 'Rope' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Rope');
    expect(result.data.tags).toEqual([]);
    expect(result.data.defaultLoanDays).toBe(7);
  });

  it('accepts full input', () => {
    const result = createGearSchema.safeParse({
      name: 'Dynamic Rope 60m',
      description: 'A great rope',
      category: 'Ropes',
      tags: ['rope', 'dynamic'],
      serialNumber: 'SN-001',
      defaultLoanDays: 14,
    });
    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual(['rope', 'dynamic']);
  });

  it('rejects missing name', () => {
    const result = createGearSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createGearSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects defaultLoanDays > 30', () => {
    const result = createGearSchema.safeParse({ name: 'X', defaultLoanDays: 31 });
    expect(result.success).toBe(false);
  });

  it('rejects defaultLoanDays < 1', () => {
    const result = createGearSchema.safeParse({ name: 'X', defaultLoanDays: 0 });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = createGearSchema.safeParse({ name: 'X', hackerField: 'evil' });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('hackerField');
  });

  it('rejects too many tags', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    const result = createGearSchema.safeParse({ name: 'X', tags });
    expect(result.success).toBe(false);
  });
});

describe('updateGearSchema', () => {
  it('accepts empty update (all optional)', () => {
    const result = updateGearSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('strips unknown fields like loanStatus', () => {
    const result = updateGearSchema.safeParse({ loanStatus: 'RETIRED' });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('loanStatus');
  });
});

describe('changeGearStatusSchema', () => {
  it('accepts valid status', () => {
    const result = changeGearStatusSchema.safeParse({ newStatus: 'LOST' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = changeGearStatusSchema.safeParse({ newStatus: 'DELETED' });
    expect(result.success).toBe(false);
  });

  it('rejects missing newStatus', () => {
    const result = changeGearStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('checkoutSchema', () => {
  it('accepts valid checkout', () => {
    const result = checkoutSchema.safeParse({
      gearItemId: 'abc-123',
      latitude: 40.7128,
      longitude: -74.006,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing gearItemId', () => {
    const result = checkoutSchema.safeParse({ latitude: 0, longitude: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid latitude', () => {
    const result = checkoutSchema.safeParse({
      gearItemId: 'x',
      latitude: 91,
      longitude: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid longitude', () => {
    const result = checkoutSchema.safeParse({
      gearItemId: 'x',
      latitude: 0,
      longitude: 181,
    });
    expect(result.success).toBe(false);
  });

  it('rejects durationDays > 30', () => {
    const result = checkoutSchema.safeParse({
      gearItemId: 'x',
      latitude: 0,
      longitude: 0,
      durationDays: 31,
    });
    expect(result.success).toBe(false);
  });
});

describe('returnGearSchema', () => {
  it('accepts valid return', () => {
    const result = returnGearSchema.safeParse({ latitude: 0, longitude: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts optional notes and condition', () => {
    const result = returnGearSchema.safeParse({
      latitude: 0,
      longitude: 0,
      condition: 'Good',
      notes: 'No issues',
    });
    expect(result.success).toBe(true);
  });
});

describe('reportLostSchema', () => {
  it('accepts empty body (all optional with defaults)', () => {
    const result = reportLostSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.contactInfo).toBe('');
    expect(result.data.notes).toBe('');
  });

  it('accepts location coordinates', () => {
    const result = reportLostSchema.safeParse({ latitude: 45.0, longitude: -120.0 });
    expect(result.success).toBe(true);
  });
});

describe('overrideLoanSchema', () => {
  it('accepts valid status override', () => {
    const result = overrideLoanSchema.safeParse({ status: 'RETURNED' });
    expect(result.success).toBe(true);
  });

  it('accepts valid dueDate override', () => {
    const result = overrideLoanSchema.safeParse({ dueDate: '2026-04-01T00:00:00Z' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date string', () => {
    const result = overrideLoanSchema.safeParse({ dueDate: 'not-a-date' });
    expect(result.success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('accepts role change', () => {
    const result = updateUserSchema.safeParse({ role: 'ADMIN' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = updateUserSchema.safeParse({ role: 'SUPERUSER' });
    expect(result.success).toBe(false);
  });

  it('accepts isActive toggle', () => {
    const result = updateUserSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });
});

describe('listGearQuerySchema', () => {
  it('accepts empty query', () => {
    const result = listGearQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts pagination params', () => {
    const result = listGearQuerySchema.safeParse({ page: '1', pageSize: '25' });
    expect(result.success).toBe(true);
  });

  it('rejects non-numeric page', () => {
    const result = listGearQuerySchema.safeParse({ page: 'abc' });
    expect(result.success).toBe(false);
  });

  it('accepts all filters together', () => {
    const result = listGearQuerySchema.safeParse({
      category: 'Ropes',
      status: 'AVAILABLE',
      search: 'dynamic',
      page: '2',
      pageSize: '50',
    });
    expect(result.success).toBe(true);
  });
});

describe('listLoansQuerySchema', () => {
  it('accepts status filter', () => {
    const result = listLoansQuerySchema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(true);
  });

  it('accepts pagination', () => {
    const result = listLoansQuerySchema.safeParse({ page: '1', pageSize: '10' });
    expect(result.success).toBe(true);
  });
});

describe('listUsersQuerySchema', () => {
  it('accepts search and isActive filter', () => {
    const result = listUsersQuerySchema.safeParse({ search: 'john', isActive: 'true' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid isActive value', () => {
    const result = listUsersQuerySchema.safeParse({ isActive: 'yes' });
    expect(result.success).toBe(false);
  });
});
