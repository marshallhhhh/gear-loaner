import { describe, it, expect } from 'vitest';
import { parsePagination } from '../src/utils/pagination.js';

describe('parsePagination', () => {
  it('parses valid page and pageSize', () => {
    const result = parsePagination({ page: '2', pageSize: '25' });
    expect(result).toEqual({
      page: 2,
      pageSize: 25,
      skip: 25,
      take: 25,
    });
  });

  it('defaults to page 1 when missing', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('defaults to DEFAULT_PAGE_SIZE (50) when missing', () => {
    const result = parsePagination({});
    expect(result.pageSize).toBe(50);
    expect(result.take).toBe(50);
  });

  it('enforces minimum page of 1', () => {
    const result = parsePagination({ page: '0' });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('enforces minimum page of 1 for negative values', () => {
    const result = parsePagination({ page: '-5' });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('enforces minimum pageSize of 1', () => {
    const result = parsePagination({ pageSize: '0' });
    // '0' parses to 0 which is falsy, so || DEFAULT_PAGE_SIZE applies -> 50
    expect(result.pageSize).toBe(50);
    expect(result.take).toBe(50);
  });

  it('enforces minimum pageSize of 1 for negative values', () => {
    const result = parsePagination({ pageSize: '-10' });
    expect(result.pageSize).toBe(1);
    expect(result.take).toBe(1);
  });

  it('enforces maximum pageSize of 200', () => {
    const result = parsePagination({ pageSize: '500' });
    expect(result.pageSize).toBe(200);
    expect(result.take).toBe(200);
  });

  it('calculates skip correctly for page 3 with pageSize 20', () => {
    const result = parsePagination({ page: '3', pageSize: '20' });
    expect(result.skip).toBe(40);
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(20);
  });

  it('handles large page numbers', () => {
    const result = parsePagination({ page: '999', pageSize: '50' });
    expect(result.page).toBe(999);
    expect(result.skip).toBe(49900);
  });

  it('handles non-numeric page gracefully (defaults to 1)', () => {
    const result = parsePagination({ page: 'abc' });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('handles non-numeric pageSize gracefully (defaults to 50)', () => {
    const result = parsePagination({ pageSize: 'xyz' });
    expect(result.pageSize).toBe(50);
    expect(result.take).toBe(50);
  });

  it('handles both invalid', () => {
    const result = parsePagination({ page: 'bad', pageSize: 'data' });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.skip).toBe(0);
  });

  it('handles page as number (edge case)', () => {
    const result = parsePagination({ page: 5, pageSize: 10 });
    // Numbers are coerced to strings by parseInt, so 5 becomes 5 and 10 becomes 10
    expect(result.page).toBe(5);
    expect(result.pageSize).toBe(10);
  });

  it('handles empty query object', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(50);
  });

  it('handles pageSize exactly at maximum', () => {
    const result = parsePagination({ pageSize: '200' });
    expect(result.pageSize).toBe(200);
  });

  it('handles pageSize one above maximum', () => {
    const result = parsePagination({ pageSize: '201' });
    expect(result.pageSize).toBe(200);
  });
});
