import prisma from '../config/prisma.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Extracts the first `n` alpha characters from a string, uppercased.
 * Returns null if fewer than `n` alpha characters are found.
 */
function alphaPrefix(str, n) {
  if (!str) return null;
  const letters = str.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.length >= n ? letters.slice(0, n) : letters.padEnd(n, 'X');
}

/**
 * Generates 3 random uppercase letters.
 */
function randomLetters() {
  return Array.from({ length: 3 }, () => LETTERS[Math.floor(Math.random() * 26)]).join('');
}

/**
 * Generates a random 3-digit string (001–999).
 */
function randomNumber() {
  return String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
}

/**
 * Given a 3-letter prefix and the set of all existing shortIds,
 * returns the lowest available number suffix as a zero-padded 3-digit string.
 * e.g. "001", "002", ... "999"
 * Returns null if all 999 slots are taken.
 */
function lowestAvailableNumber(prefix, existingIds) {
  const used = new Set();
  const prefixUpper = prefix.toUpperCase();
  for (const id of existingIds) {
    const match = id.match(/^([A-Z]{3})-(\d{3})$/);
    if (match && match[1] === prefixUpper) {
      used.add(match[2]);
    }
  }
  for (let i = 1; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    if (!used.has(num)) return num;
  }
  return null;
}

/**
 * Generates a unique short identifier in the format AAA-XXX.
 *
 * Priority for the 3-letter prefix:
 *  1. First 3 alpha chars of category
 *  2. First 3 alpha chars of name
 *  3. Random 3 letters
 *
 * The numeric suffix is the lowest available number for that prefix.
 * Falls back to random prefix + random number if all 999 slots for every
 * attempted prefix are exhausted.
 *
 * @param {string|null} name
 * @param {string|null} category
 * @param {string[]|null} existingIds - pass in if you already have them (avoids extra DB query)
 * @returns {Promise<string>}
 */
export async function generateShortId(name, category, existingIds = null) {
  // Fetch all current shortIds once if not provided
  const allIds = existingIds ?? (await prisma.gear.findMany({
    select: { shortId: true },
  })).map((g) => g.shortId).filter(Boolean);

  const existingSet = new Set(allIds);

  // Build list of prefixes to try in priority order
  const prefixes = [];

  const catPrefix = category ? alphaPrefix(category, 3) : null;
  if (catPrefix) prefixes.push(catPrefix);

  const namePrefix = name ? alphaPrefix(name, 3) : null;
  if (namePrefix && namePrefix !== catPrefix) prefixes.push(namePrefix);

  // Try each candidate prefix
  for (const prefix of prefixes) {
    const num = lowestAvailableNumber(prefix, allIds);
    if (num !== null) {
      const candidate = `${prefix}-${num}`;
      if (!existingSet.has(candidate)) return candidate;
    }
  }

  // Fallback: random prefix + random number, retry until unique
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = `${randomLetters()}-${randomNumber()}`;
    if (!existingSet.has(candidate)) return candidate;
  }

  throw new Error('Could not generate a unique shortId after 100 attempts');
}
