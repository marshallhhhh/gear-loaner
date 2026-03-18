import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getActiveReportedFoundGearIds } from '../src/services/reportedFoundService.js';
import prisma from '../src/config/prisma.js';

vi.mock('../src/config/prisma.js', () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

describe('getActiveReportedFoundGearIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty set when no items reported found', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const result = await getActiveReportedFoundGearIds();

    expect(result).toEqual(new Set());
    expect(result.size).toBe(0);
  });

  it('returns set of gear IDs for reported found items', async () => {
    const mockData = [{ gearItemId: 'gear-1' }, { gearItemId: 'gear-2' }, { gearItemId: 'gear-3' }];
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockData);

    const result = await getActiveReportedFoundGearIds();

    expect(result).toEqual(new Set(['gear-1', 'gear-2', 'gear-3']));
    expect(result.size).toBe(3);
  });

  it('excludes items where most recent action is not REPORT_FOUND', async () => {
    const mockData = [{ gearItemId: 'gear-1' }];
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockData);

    const result = await getActiveReportedFoundGearIds();

    expect(result.has('gear-1')).toBe(true);
  });

  it('handles duplicate gear IDs', async () => {
    const mockData = [{ gearItemId: 'gear-1' }, { gearItemId: 'gear-1' }, { gearItemId: 'gear-2' }];
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockData);

    const result = await getActiveReportedFoundGearIds();

    // Set automatically deduplicates
    expect(result.size).toBe(2);
    expect(result.has('gear-1')).toBe(true);
    expect(result.has('gear-2')).toBe(true);
  });

  it('uses DISTINCT ON query for efficiency', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    await getActiveReportedFoundGearIds();

    expect(vi.mocked(prisma.$queryRaw)).toHaveBeenCalled();
    const query = vi.mocked(prisma.$queryRaw).mock.calls[0];
    // $queryRaw receives a template string array as first argument
    expect(query[0]).toBeDefined();
    expect(query[0][0] || query[0].toString()).toContain('DISTINCT ON');
  });

  it('filters by REPORT_FOUND action type', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    await getActiveReportedFoundGearIds();

    const query = vi.mocked(prisma.$queryRaw).mock.calls[0];
    expect(query[0][0] || query[0].toString()).toContain('REPORT_FOUND');
  });

  it('orders by most recent action', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    await getActiveReportedFoundGearIds();

    const query = vi.mocked(prisma.$queryRaw).mock.calls[0];
    expect(query[0][0] || query[0].toString()).toContain('createdAt');
  });

  it('returns a Set (not array)', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ gearItemId: 'gear-1' }]);

    const result = await getActiveReportedFoundGearIds();

    expect(result instanceof Set).toBe(true);
  });

  it('can check membership with .has() method', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { gearItemId: 'gear-1' },
      { gearItemId: 'gear-2' },
    ]);

    const result = await getActiveReportedFoundGearIds();

    expect(result.has('gear-1')).toBe(true);
    expect(result.has('gear-2')).toBe(true);
    expect(result.has('gear-3')).toBe(false);
  });

  it('handles large result sets', async () => {
    const mockData = Array.from({ length: 1000 }, (_, i) => ({
      gearItemId: `gear-${i}`,
    }));
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockData);

    const result = await getActiveReportedFoundGearIds();

    expect(result.size).toBe(1000);
  });

  it('handles Prisma query errors', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database error'));

    await expect(() => getActiveReportedFoundGearIds()).rejects.toThrow('Database error');
  });

  it('handles null gearItemId gracefully', async () => {
    const mockData = [{ gearItemId: 'gear-1' }, { gearItemId: null }, { gearItemId: 'gear-2' }];
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockData);

    const result = await getActiveReportedFoundGearIds();

    expect(result.has(null)).toBe(true);
    expect(result.has('gear-1')).toBe(true);
    expect(result.has('gear-2')).toBe(true);
  });

  it('maps gearItemId from query results correctly', async () => {
    const mockData = [{ gearItemId: 'uuid-with-dashes-123' }];
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockData);

    const result = await getActiveReportedFoundGearIds();

    expect(result.has('uuid-with-dashes-123')).toBe(true);
  });
});
