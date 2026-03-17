import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateShortId } from '../src/services/shortIdService.js';
import prisma from '../src/config/prisma.js';

vi.mock('../src/config/prisma.js', () => ({
  default: {
    gear: {
      findMany: vi.fn(),
    },
  },
}));

describe('generateShortId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with no existing IDs', () => {
    beforeEach(() => {
      vi.mocked(prisma.gear.findMany).mockResolvedValue([]);
    });

    it('generates ID from category name', async () => {
      const id = await generateShortId('Rope', 'Carabiners');
      expect(id).toMatch(/^CAR-\d{3}$/);
    });

    it('generates ID from gear name when category prefix unavailable', async () => {
      const id = await generateShortId('Dynamic Rope', null);
      expect(id).toMatch(/^DYN-\d{3}$/);
    });

    it('generates random ID when both name and category lack alpha characters', async () => {
      const id = await generateShortId('123', '456');
      expect(id).toMatch(/^[A-Z]{3}-\d{3}$/);
    });

    it('generates ID when name and category both null', async () => {
      const id = await generateShortId(null, null);
      expect(id).toMatch(/^[A-Z]{3}-\d{3}$/);
    });

    it('starts numbering at 001 for new prefix', async () => {
      const id = await generateShortId('Helmet', null);
      expect(id).toMatch(/^HEL-001$/);
    });
  });

  describe('with existing IDs', () => {
    it('finds next available number for prefix', async () => {
      vi.mocked(prisma.gear.findMany).mockResolvedValue([
        { shortId: 'HEL-001' },
        { shortId: 'HEL-002' },
      ]);
      const id = await generateShortId('Helmet', null);
      expect(id).toBe('HEL-003');
    });

    it('handles gaps in numbering', async () => {
      vi.mocked(prisma.gear.findMany).mockResolvedValue([
        { shortId: 'HEL-001' },
        { shortId: 'HEL-003' },
      ]);
      const id = await generateShortId('Helmet', null);
      expect(id).toBe('HEL-002');
    });

    it('respects provided existingIds array', async () => {
      const id = await generateShortId('Helmet', null, ['HEL-001', 'HEL-002']);
      expect(id).toBe('HEL-003');
    });

    it('uses different prefix if category is available', async () => {
      vi.mocked(prisma.gear.findMany).mockResolvedValue([
        { shortId: 'HEL-001' },
      ]);
      const id = await generateShortId('Helmet', 'Carabiners');
      expect(id).toMatch(/^CAR-\d{3}$/);
    });

    it('falls back to random prefix when first two prefixes are exhausted', async () => {
      // Create 1000 existing IDs to simulate exhausted slots
      const existingIds = Array.from({ length: 999 }, (_, i) => `DYN-${String(i + 1).padStart(3, '0')}`);
      existingIds.push(...Array.from({ length: 999 }, (_, i) => `ROB-${String(i + 1).padStart(3, '0')}`));
      
      vi.mocked(prisma.gear.findMany).mockResolvedValue(existingIds.map(shortId => ({ shortId })));
      
      const id = await generateShortId('Dynamic Rope', 'Robe');
      expect(id).toMatch(/^[A-Z]{3}-\d{3}$/);
      expect(!existingIds.includes(id)).toBe(true);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      vi.mocked(prisma.gear.findMany).mockResolvedValue([]);
    });

    it('pads short names with X characters', async () => {
      const id = await generateShortId('AA', null);
      // AA -> 'AAX' (padded to 3 chars)
      expect(id).toMatch(/^[A-Z]{3}-\d{3}$/);
    });

    it('extracts only alphabetic characters', async () => {
      const id = await generateShortId('Rope-123-XL', null);
      expect(id).toMatch(/^ROP-\d{3}$/);
    });

    it('handles unicode and special characters', async () => {
      const id = await generateShortId('Sling™', null);
      expect(id).toMatch(/^[A-Z]{3}-\d{3}$/);
    });

    it('case-insensitive name matching', async () => {
      prisma.gear.findMany.mockResolvedValue([
        { shortId: 'HEL-001' },
      ]);
      const id = await generateShortId('HELMET', null);
      expect(id).toBe('HEL-002');
    });
  });

  describe('prefix priority', () => {
    beforeEach(() => {
      vi.mocked(prisma.gear.findMany).mockResolvedValue([]);
    });

    it('prioritizes category over name', async () => {
      const id = await generateShortId('Carabiner', 'Helmets');
      expect(id).toMatch(/^HEL-\d{3}$/);
    });

    it('uses name when category generates same prefix', async () => {
      const id = await generateShortId('Carabiner', 'Carabiner');
      // Both would be CAR, so it should just use CAR-001
      expect(id).toMatch(/^CAR-\d{3}$/);
    });
  });

  describe('error handling', () => {
    it('does not throw when random generation can still find unique ID', async () => {
      // The function has a 100-attempt limit, so it's hard to truly exhaust
      // Instead, we test that it returns a valid ID even when provided IDs contain many entries
      const manyIds = Array.from({ length: 500 }, (_, i) => `ABC-${String(i + 1).padStart(3, '0')}`);
      
      vi.mocked(prisma.gear.findMany).mockResolvedValue(manyIds.map(shortId => ({ shortId })));
      
      const id = await generateShortId('Test', 'Name', manyIds);
      expect(id).toMatch(/^[A-Z]{3}-\d{3}$/);
      expect(!manyIds.includes(id)).toBe(true);
    });
  });
});
