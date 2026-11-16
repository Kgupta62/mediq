import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { startSession } from './helpers/session.js';

let s;
const secret = process.env.JWT_SECRET || 'mediq_dev_only_secret_change_me';

beforeAll(async () => {
  s = await startSession();
});

afterAll(async () => {
  if (s) await s.stop();
});

describe('token checks', () => {
  it('returns 401 without a token', async () => {
    const res = await s.api.post('/api/queue/walk-in').send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token required/i);
  });

  it('returns 401 for a non-bearer header', async () => {
    const res = await s.api.post('/api/queue/walk-in').set('Authorization', `Basic ${s.token}`).send({});
    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed token', async () => {
    const res = await s.api.post('/api/queue/walk-in').set('Authorization', 'Bearer not.a.jwt').send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('returns 401 for an expired token', async () => {
    const expired = jwt.sign({ id: 'usr-1', role: 'receptionist' }, secret, { expiresIn: -10 });
    const res = await s.api.post('/api/queue/walk-in').set('Authorization', `Bearer ${expired}`).send({});
    expect(res.status).toBe(401);
  });

  it('returns 403 for a valid token with a non-staff role', async () => {
    const patient = jwt.sign({ id: 'usr-x', role: 'patient' }, secret, { expiresIn: '1h' });
    const res = await s.api.post('/api/queue/walk-in').set('Authorization', `Bearer ${patient}`).send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/permission/i);
  });

  it('accepts a doctor login on staff routes', async () => {
    const login = await s.api.post('/api/auth/login').send({ email: 'doctor.sharma@clinic.com', password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ role: 'doctor', doctorId: 'doc-1' });
    const res = await s.api.get('/api/patients/9823111223/history').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
  });

  it('matches login email case-insensitively', async () => {
    const res = await s.api.post('/api/auth/login').send({ email: 'Receptionist@Clinic.com', password: 'password123' });
    expect(res.status).toBe(200);
  });
});

describe('patient OTP', () => {
  it('rejects a wrong code with 400', async () => {
    const res = await s.api.post('/api/auth/verify-otp').send({ phone: '+919000000001', otp: '0000' });
    expect(res.status).toBe(400);
    expect(res.body.verified).toBe(false);
  });

  it('rejects an invalid phone with 400', async () => {
    const res = await s.api.post('/api/auth/verify-otp').send({ phone: '123', otp: '1234' });
    expect(res.status).toBe(400);
  });

  it('accepts the demo code', async () => {
    const res = await s.api.post('/api/auth/verify-otp').send({ phone: '+91 90000 00001', otp: '1234' });
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
  });
});

describe('http plumbing', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const res = await s.api.get('/api/nothing/here');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error).toMatch(/GET \/api\/nothing\/here not found/);
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await s.api.post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid json/i);
  });

  it('health exposes uptime', async () => {
    const res = await s.api.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
