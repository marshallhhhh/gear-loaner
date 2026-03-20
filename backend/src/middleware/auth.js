import { createRemoteJWKSet, jwtVerify } from 'jose';
import prisma from '../config/prisma.js';
import logger from '../config/logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const JWKS = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));

function isExplicitlyUnverified(payload) {
  if (payload.email_verified === false) return true;
  if (Object.prototype.hasOwnProperty.call(payload, 'email_confirmed_at')) {
    return !payload.email_confirmed_at;
  }
  return false;
}

/**
 * Verifies the Supabase JWT using JWKS and attaches user + profile to req.
 * Sets req.user (token payload) and req.profile (database profile).
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);

  // Step 1: JWT verification only — 401 on failure
  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    }));
  } catch (err) {
    logger.warn({ err }, 'Auth token verification failed');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (isExplicitlyUnverified(payload)) {
    return res.status(403).json({ error: 'Email must be verified' });
  }

  req.user = payload;

  // Step 2: Profile lookup / auto-create — 500 on DB failure
  try {
    let profile = await prisma.profile.findUnique({
      where: { id: payload.sub },
    });

    if (!profile) {
      try {
        profile = await prisma.profile.create({
          data: {
            id: payload.sub,
            email: payload.email,
            fullName: payload.user_metadata?.full_name || null,
          },
        });
      } catch (createErr) {
        // P2002 = unique constraint violation from a concurrent first-login race
        if (createErr.code === 'P2002') {
          profile = await prisma.profile.findUnique({ where: { id: payload.sub } });
        } else {
          throw createErr;
        }
      }
    }

    if (!profile.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.profile = profile;
    next();
  } catch (err) {
    logger.error({ err }, 'Database error during profile lookup');
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Optional authentication — attaches user if token present, but doesn't block.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);

  // Step 1: JWT verification only — silently skip auth on failure
  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    }));
  } catch {
    // Token invalid — proceed as unauthenticated
    return next();
  }

  if (isExplicitlyUnverified(payload)) {
    return next();
  }

  req.user = payload;

  // Step 2: Profile lookup / auto-create — log DB errors but don't block the request
  try {
    let profile = await prisma.profile.findUnique({
      where: { id: payload.sub },
    });

    if (!profile) {
      try {
        profile = await prisma.profile.create({
          data: {
            id: payload.sub,
            email: payload.email,
            fullName: payload.user_metadata?.full_name || null,
          },
        });
      } catch (createErr) {
        // P2002 = unique constraint violation from a concurrent first-login race
        if (createErr.code === 'P2002') {
          profile = await prisma.profile.findUnique({ where: { id: payload.sub } });
        } else {
          throw createErr;
        }
      }
    }

    req.profile = profile;
  } catch (err) {
    logger.error({ err }, 'Database error during optional auth profile lookup');
    // Token is valid; proceed without profile rather than failing the request
  }

  next();
}
