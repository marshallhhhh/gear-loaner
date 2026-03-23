import logger from '../config/logger.js';

export function errorHandler(err, req, res, _next) {
  logger.error({ err, reqId: req.id, method: req.method, url: req.originalUrl }, 'Unhandled error');

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that unique value already exists' });
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : err.message || 'Internal server error',
  });
}
