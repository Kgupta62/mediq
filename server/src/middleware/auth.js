import jwt from 'jsonwebtoken';

const IS_PROD = process.env.NODE_ENV === 'production';
const DEV_SECRET = 'mediq_dev_only_secret_change_me';

export function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (IS_PROD) throw new Error('JWT_SECRET must be set when NODE_ENV=production');
  console.warn('\x1b[33m[AUTH WARNING]\x1b[0m JWT_SECRET not set, using insecure dev fallback');
  return DEV_SECRET;
}

export const JWT_SECRET = getJwtSecret();
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }
  try {
    req.user = jwt.verify(header.slice(7).trim(), JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles) => [
  requireAuth,
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  }
];

export const requireStaff = requireRole('receptionist', 'doctor', 'admin');
