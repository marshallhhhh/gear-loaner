import { describe, it, expect } from 'vitest';
import { categoryName, normalizeGearCategory } from '../src/services/normalize.js';

describe('categoryName', () => {
  it('extracts name from category object', () => {
    expect(categoryName({ name: 'Ropes' })).toBe('Ropes');
  });

  it('returns null for null category', () => {
    expect(categoryName(null)).toBeNull();
  });

  it('returns null for undefined category', () => {
    expect(categoryName(undefined)).toBeNull();
  });

  it('returns custom fallback when specified', () => {
    expect(categoryName(null, '')).toBe('');
    expect(categoryName(undefined, 'N/A')).toBe('N/A');
  });

  it('returns name even when fallback is provided', () => {
    expect(categoryName({ name: 'Helmets' }, '')).toBe('Helmets');
  });
});

describe('normalizeGearCategory', () => {
  it('normalizes category relation in-place', () => {
    const gear = { id: '1', name: 'Rope', category: { name: 'Ropes' } };
    normalizeGearCategory(gear);
    expect(gear.category).toBe('Ropes');
  });

  it('sets null when category is absent', () => {
    const gear = { id: '1', name: 'Rope', category: null };
    normalizeGearCategory(gear);
    expect(gear.category).toBeNull();
  });

  it('handles objects without category key', () => {
    const obj = { id: '1' };
    normalizeGearCategory(obj);
    expect(obj).toEqual({ id: '1' });
  });

  it('returns the object for chaining', () => {
    const gear = { category: { name: 'X' } };
    const result = normalizeGearCategory(gear);
    expect(result).toBe(gear);
  });
});
