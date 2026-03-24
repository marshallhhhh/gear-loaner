import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './config/logger.js';
import { requestLogger } from './config/logger.js';
import prisma from './config/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import gearRoutes from './routes/gear.js';
import loanRoutes from './routes/loans.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import foundReportRoutes from './routes/foundReports.js';
import qrTagRoutes from './routes/qrTags.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);
const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

function getCorsOrigin() {
  const configured = process.env.FRONTEND_URL;

  if (isProd) {
    if (!configured) {
      throw new Error('FRONTEND_URL is required in production');
    }

    if (configured === '*' || !configured.startsWith('https://')) {
      throw new Error('FRONTEND_URL must be a specific HTTPS origin in production');
    }

    // Validate format early so startup fails fast on invalid configuration.
    new URL(configured);
  }

  return configured || 'http://localhost:5173';
}

const corsOrigin = getCorsOrigin();
const cspConnectSources = [...new Set(["'self'", corsOrigin, appUrl])];

// Security
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", corsOrigin],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: cspConnectSources,
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

// Trust proxy for correct req.ip behind reverse proxies (production only)
if (isProd) {
  app.set('trust proxy', 1);
}

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// HTTP request logging
app.use(requestLogger);

// Request timeout protection for stuck upstream/database calls.
app.use((req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT_MS);
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timed out' });
    }
  });
  next();
});

// Routes
app.use('/api/gear', gearRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/found-reports', foundReportRoutes);
app.use('/api/qr-tags', qrTagRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'Server running');
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down server');

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);

  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await prisma.$disconnect();
    clearTimeout(forceExit);
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    clearTimeout(forceExit);
    logger.error({ err }, 'Shutdown failed');
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

export default app;
