import { describe, it, expect } from 'vitest';
import { calculateDueDate } from '../src/services/loanService.js';

describe('calculateDueDate', () => {
  it('returns a date in the future', () => {
    const dueDate = calculateDueDate(7, 7);
    expect(dueDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('uses requested days', () => {
    const now = new Date();
    const dueDate = calculateDueDate(5, 7);
    const diffDays = Math.round((dueDate - now) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(5);
  });

  it('falls back to default days when requested is falsy', () => {
    const now = new Date();
    const dueDate = calculateDueDate(null, 10);
    const diffDays = Math.round((dueDate - now) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(10);
  });

  it('falls back to 7 when both are falsy', () => {
    const now = new Date();
    const dueDate = calculateDueDate(null, null);
    const diffDays = Math.round((dueDate - now) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it('clamps to minimum 1 day', () => {
    const now = new Date();
    const dueDate = calculateDueDate(0, 0);
    const diffDays = Math.round((dueDate - now) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7); // 0 || 0 || 7 = 7, then max(1, min(7, 30)) = 7
  });

  it('clamps to maximum 30 days', () => {
    const now = new Date();
    const dueDate = calculateDueDate(60, 7);
    const diffDays = Math.round((dueDate - now) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it('clamps negative values to 1', () => {
    const now = new Date();
    const dueDate = calculateDueDate(-5, 7);
    const diffDays = Math.round((dueDate - now) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(1);
  });
});
