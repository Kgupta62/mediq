const IS_PROD = process.env.NODE_ENV === 'production';
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const configured = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowAll = configured.includes('*');
if (allowAll && IS_PROD) {
  console.warn('\x1b[33m[CORS WARNING]\x1b[0m CLIENT_URL is "*", set it to your frontend origin(s)');
}

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowAll || configured.includes(origin) || (!IS_PROD && LOCAL_ORIGIN.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
