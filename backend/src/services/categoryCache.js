import prisma from '../config/prisma.js';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

let cached = null;
let expiresAt = 0;
let loadingPromise = null;

async function fetchFromDb() {
  const rows = await prisma.category.findMany({ select: { name: true }, orderBy: { name: 'asc' } });
  return rows.map((r) => r.name);
}

export async function getCategories({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && cached && now < expiresAt) {
    return cached;
  }

  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const categories = await fetchFromDb();
      cached = categories;
      expiresAt = Date.now() + TTL_MS;
      return cached;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

export function invalidateCategories() {
  cached = null;
  expiresAt = 0;
}

// test helper
export function setCategoriesForTest(categories) {
  cached = categories;
  expiresAt = Date.now() + TTL_MS;
}

export default { getCategories, invalidateCategories, setCategoriesForTest };
