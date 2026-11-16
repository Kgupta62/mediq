export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message) => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);

export const handler = (fn) => (req, res) => {
  try {
    fn(req, res);
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const emit = (req, event, payload) => {
  const io = req.app.get('io');
  if (io) io.emit(event, payload);
};

export const queueUpdated = (req, reason, doctorId = null, tokenId = null) => emit(req, 'QUEUE_UPDATED', { doctorId, tokenId, reason });
