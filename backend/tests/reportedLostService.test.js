import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGearIdsWithOpenReports, countOpenReports } from '../src/services/foundReportService.js';
import prisma from '../src/config/prisma.js';

vi.mock('../src/config/prisma.js', () => ({
  default: {
    foundReport: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('getGearIdsWithOpenReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty set when no open reports exist', async () => {
    vi.mocked(prisma.foundReport.findMany).mockResolvedValue([]);

    const result = await getGearIdsWithOpenReports();

    expect(result).toEqual(new Set());
    expect(result.size).toBe(0);
    expect(prisma.foundReport.findMany).toHaveBeenCalledWith({
      where: { status: 'OPEN' },
      select: { gearItemId: true },
      distinct: ['gearItemId'],
    });
  });

  it('returns set of gear IDs with open reports', async () => {
    vi.mocked(prisma.foundReport.findMany).mockResolvedValue([
      { gearItemId: 'gear-1' },
      { gearItemId: 'gear-2' },
      { gearItemId: 'gear-3' },
    ]);

    const result = await getGearIdsWithOpenReports();

    expect(result).toEqual(new Set(['gear-1', 'gear-2', 'gear-3']));
    expect(result.size).toBe(3);
  });

  it('returns a Set instance', async () => {
    vi.mocked(prisma.foundReport.findMany).mockResolvedValue([{ gearItemId: 'gear-1' }]);

    const result = await getGearIdsWithOpenReports();

    expect(result instanceof Set).toBe(true);
  });

  it('can check membership with .has()', async () => {
    vi.mocked(prisma.foundReport.findMany).mockResolvedValue([
      { gearItemId: 'gear-1' },
      { gearItemId: 'gear-2' },
    ]);

    const result = await getGearIdsWithOpenReports();

    expect(result.has('gear-1')).toBe(true);
    expect(result.has('gear-2')).toBe(true);
    expect(result.has('gear-3')).toBe(false);
  });

  it('handles Prisma query errors', async () => {
    vi.mocked(prisma.foundReport.findMany).mockRejectedValue(new Error('Database error'));

    await expect(() => getGearIdsWithOpenReports()).rejects.toThrow('Database error');
  });
});

describe('countOpenReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns count of open reports', async () => {
    vi.mocked(prisma.foundReport.count).mockResolvedValue(5);

    const result = await countOpenReports();

    expect(result).toBe(5);
    expect(prisma.foundReport.count).toHaveBeenCalledWith({ where: { status: 'OPEN' } });
  });

  it('returns 0 when no open reports', async () => {
    vi.mocked(prisma.foundReport.count).mockResolvedValue(0);

    const result = await countOpenReports();

    expect(result).toBe(0);
  });
});
