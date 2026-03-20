import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateShortId } from '../src/services/shortIdService.js';
import prisma from '../src/config/prisma.js';

vi.mock('../src/config/prisma.js', () => ({
  default: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

describe('generateShortId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates ID from category prefix first', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ current_value: 1 }]);
    const id = await generateShortId('Rope', 'Carabiners');
    expect(id).toBe('CAR-001');
  });

  it('generates ID from gear name when category is missing', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ current_value: 1 }]);
    const id = await generateShortId('Dynamic Rope', null);
    expect(id).toBe('DYN-001');
  });

  it('pads short prefixes with random letters', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ current_value: 1 }]);
    const id = await generateShortId('A', null);
    expect(id).toBe('AAA-001');
  });

  it('uses random prefix when both category and name are non-alpha', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ current_value: 1 }]);
    const id = await generateShortId('123', '456');
    expect(id).toMatch(/^[A-Z]{3}-001$/);
  });

  it('formats sequential counter values with zero padding', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ current_value: 12 }]);
    const id = await generateShortId('Helmet', null);
    expect(id).toBe('HEL-012');
  });

  it('tries name prefix when category prefix is exhausted', async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ current_value: 1000 }])
      .mockResolvedValueOnce([{ current_value: 1 }]);

    const id = await generateShortId('Helmet', 'Cat');
    expect(id).toBe('HEL-001');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('falls back to random prefixes after deterministic prefixes are exhausted', async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ current_value: 1000 }])
      .mockResolvedValueOnce([{ current_value: 1000 }])
      .mockResolvedValueOnce([{ current_value: 1 }]);

    const id = await generateShortId('Dynamic Rope', 'Robe');
    expect(id).toMatch(/^[A-Z]{3}-001$/);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
  });

  it('extracts only alphabetic characters from source', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ current_value: 1 }]);
    const id = await generateShortId('Rope-123-XL', null);
    expect(id).toBe('ROP-001');
  });

  it('throws a descriptive error when db increment fails', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('db unavailable'));
    await expect(generateShortId('Helmet', null)).rejects.toThrow(
      'Could not generate shortId: db unavailable',
    );
  });
});
