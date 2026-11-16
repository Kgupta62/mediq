export const notFound = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: err.message });
  }
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('\x1b[31m[ERROR]\x1b[0m', err);
  return res.status(status).json({
    error: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
};
