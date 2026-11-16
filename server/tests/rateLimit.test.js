import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { startTestServer } from './helpers/testServer.js';

let server;
let api;

beforeAll(async () => {
  server = await startTestServer(5201);
  api = request(server.baseUrl);
});

afterAll(async () => {
  if (server) await server.stop();
});

describe('login rate limit', () => {
  it('returns 429 after 20 attempts in the window', async () => {
    const attempt = () => api.post('/api/auth/login').send({ email: 'receptionist@clinic.com', password: 'wrong' });

    for (let i = 1; i <= 20; i += 1) {
      const res = await attempt();
      expect(res.status).toBe(401);
      expect(Number(res.headers['x-ratelimit-limit'])).toBe(20);
      expect(Number(res.headers['x-ratelimit-remaining'])).toBe(20 - i);
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/too many login attempts/i);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);

    const stillBlocked = await api.post('/api/auth/login').send({ email: 'receptionist@clinic.com', password: 'password123' });
    expect(stillBlocked.status).toBe(429);
  });

  it('does not throttle other routes', async () => {
    const res = await api.post('/api/auth/verify-otp').send({ phone: '+919000000001', otp: '1234' });
    expect(res.status).toBe(200);
    expect((await api.get('/api/doctors')).status).toBe(200);
  });
});
