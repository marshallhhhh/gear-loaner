import prisma from '../config/prisma.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAX_SUFFIX = 999;
const RANDOM_PREFIX_ATTEMPTS = 24;

/**
 * Generates random uppercase letters.
 */
function randomLetters(length = 3) {
  return Array.from({ length }, () => LETTERS[Math.floor(Math.random() * 26)]).join('');
}

/**
 * Normalizes a source string into a 3-letter uppercase prefix.
 * - strips non alphabetic chars
 * - uses first 3 alpha chars when available
 * - pads missing chars with random letters
 * Returns null when source has no alpha characters.
 */
export function normalizePrefix(source) {
  if (!source || typeof source !== 'string') return null;

  const alpha = source.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (!alpha) return null;

  const head = alpha.slice(0, 3);
  return head.length === 3 ? head : head + randomLetters(3 - head.length);
}

/**
 * Atomically reserves the next sequential value for a prefix.
 */
async function nextCounterValue(prefix) {
  const rows = await prisma.$queryRaw`
    INSERT INTO short_id_counters (prefix, current_value, created_at, updated_at)
    VALUES (${prefix}, 1, NOW(), NOW())
    ON CONFLICT (prefix)
    DO UPDATE
      SET current_value = short_id_counters.current_value + 1,
          updated_at = NOW()
    RETURNING current_value;
  `;

  if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0].current_value !== 'number') {
    throw new Error('Failed to reserve shortId counter value');
  }

  return rows[0].current_value;
}

/**
 * Chooses candidate prefixes in priority order: category, name, random.
 */
function buildCandidatePrefixes(name, category) {
  const prefixes = [];

  const categoryPrefix = normalizePrefix(category);
  if (categoryPrefix) prefixes.push(categoryPrefix);

  const namePrefix = normalizePrefix(name);
  if (namePrefix && namePrefix !== categoryPrefix) prefixes.push(namePrefix);

  for (let i = 0; i < RANDOM_PREFIX_ATTEMPTS; i++) {
    prefixes.push(randomLetters(3));
  }

  return prefixes;
}

/**
 * Generates a unique short identifier in the format AAA-999.
 * Uses DB-backed atomic counters to avoid full-table scans.
 *
 * @param {string|null} name
 * @param {string|null} category
 * @returns {Promise<string>}
 */
export async function generateShortId(name, category) {
  const candidates = buildCandidatePrefixes(name, category);

  try {
    for (const prefix of candidates) {
      const next = await nextCounterValue(prefix);
      if (next <= MAX_SUFFIX) {
        return `${prefix}-${String(next).padStart(3, '0')}`;
      }
    }
  } catch (err) {
    throw new Error(`Could not generate shortId: ${err.message}`, { cause: err });
  }

  throw new Error('Could not generate shortId: all candidate prefixes are exhausted');
}

/**
 * Pre-production helper to reset all prefix counters.
 */
export async function resetShortIdCounters() {
  await prisma.$executeRaw`TRUNCATE TABLE short_id_counters;`;
}
