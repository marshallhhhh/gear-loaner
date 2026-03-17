import { createRemoteJWKSet, jwtVerify } from 'jose';
import prisma from '../config/prisma.js';
import logger from '../config/logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const JWKS = createRemoteJWKSet(
  new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
);

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

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    });

    req.user = payload;

    // Auto-create profile on first authenticated request
    let profile = await prisma.profile.findUnique({
      where: { id: payload.sub },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          id: payload.sub,
          email: payload.email,
          fullName: payload.user_metadata?.full_name || null,
        },
      });
    }

    if (!profile.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.profile = profile;
    next();
  } catch (err) {
    logger.warn({ err }, 'Auth token verification failed');
    return res.status(401).json({ error: 'Invalid or expired token' });
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

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    });

    req.user = payload;

    let profile = await prisma.profile.findUnique({
      where: { id: payload.sub },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          id: payload.sub,
          email: payload.email,
          fullName: payload.user_metadata?.full_name || null,
        },
      });
    }

    req.profile = profile;
  } catch {
    // Token invalid — proceed as unauthenticated
  }

  next();
}
