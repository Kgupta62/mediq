import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'crypto';
import { db } from '../config/db.js';
import { JWT_SECRET, JWT_EXPIRES_IN, requireAuth } from '../middleware/auth.js';

const DEMO_OTP = process.env.DEMO_OTP || '1234';
const PHONE_RE = /^\+?\d{10,15}$/;

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function passwordMatches(stored, supplied) {
  if (typeof stored !== 'string' || typeof supplied !== 'string') return false;
  if (stored.startsWith('$2')) return bcrypt.compareSync(supplied, stored);
  return safeEqual(stored, supplied);
}

export const login = (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.findUserByEmail(email.trim());
  if (!user || !passwordMatches(user.password, password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!user.password.startsWith('$2')) db.updateUserPassword(user.id, password);

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, doctorId: user.doctorId || null },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      doctorId: user.doctorId || null,
      avatar: user.avatar
    }
  });
};

export const verifyPatientOTP = (req, res) => {
  const { phone, otp } = req.body || {};

  if (typeof phone !== 'string' || !PHONE_RE.test(phone.replace(/[\s-]/g, ''))) {
    return res.status(400).json({ error: 'A valid phone number is required' });
  }

  if (otp !== undefined && otp !== null && safeEqual(String(otp).trim(), DEMO_OTP)) {
    return res.json({
      verified: true,
      phone,
      message: 'Mobile number verified successfully'
    });
  }

  return res.status(400).json({ verified: false, error: `Please enter a valid OTP code (Demo OTP: ${DEMO_OTP})` });
};

export const authMiddleware = requireAuth;
