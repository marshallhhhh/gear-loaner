/**
 * Flatten a Prisma category relation `{ name: string }` to a plain string.
 * Returns `null` when the relation is absent, or the fallback value for CSV contexts.
 */
export function categoryName(category, fallback = null) {
  return category?.name ?? fallback;
}

/**
 * Normalize a gear record's category relation in-place (mutates the object).
 * Works for both top-level `obj.category` and nested `obj.gearItem.category`.
 */
export function normalizeGearCategory(obj) {
  if (obj && typeof obj === 'object' && 'category' in obj) {
    obj.category = categoryName(obj.category);
  }
  return obj;
}
