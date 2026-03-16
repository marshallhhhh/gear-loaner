export function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err);

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that unique value already exists' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}
