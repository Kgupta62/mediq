import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startSession, uniquePhone } from './helpers/session.js';

let s;

const walkIn = (overrides = {}) => s.staff(s.api.post('/api/queue/walk-in')).send({
  patientName: 'History Tester',
  patientPhone: uniquePhone(),
  doctorId: s.doctor.id,
  ...overrides
});

beforeAll(async () => {
  s = await startSession();
});

afterAll(async () => {
  if (s) await s.stop();
});

describe('patient history', () => {
  it('finds seeded rows by digits-only phone', async () => {
    const res = await s.staff(s.api.get('/api/patients/9823111223/history'));
    expect(res.status).toBe(200);
    expect(res.body.appointments.length).toBeGreaterThan(0);
    expect(res.body.appointments[0].patientName).toBe('Aarav Mehta');
    expect(res.body.queueTokens.some((t) => t.patientPhone === '+91 98231 11223')).toBe(true);
    expect(Array.isArray(res.body.consultations)).toBe(true);
  });

  it('matches a partial digit suffix', async () => {
    const res = await s.staff(s.api.get('/api/patients/11223/history'));
    expect(res.status).toBe(200);
    expect(res.body.appointments.some((a) => a.patientPhone === '+91 98231 11223')).toBe(true);
  });

  it('rejects fewer than 4 digits', async () => {
    const res = await s.staff(s.api.get('/api/patients/123/history'));
    expect(res.status).toBe(400);
  });

  it('requires a staff token', async () => {
    const res = await s.api.get('/api/patients/9823111223/history');
    expect(res.status).toBe(401);
  });
});

describe('prescription by token', () => {
  it('returns 404 before the consultation is completed', async () => {
    const { body } = await walkIn();
    const res = await s.api.get(`/api/prescriptions/token/${body.token.id}`);
    expect(res.status).toBe(404);
    expect(res.body.token.id).toBe(body.token.id);
  });

  it('returns the consultation after completing', async () => {
    const { body } = await walkIn();
    await s.staff(s.api.post('/api/queue/call-next')).send({ doctorId: s.doctor.id, specificTokenId: body.token.id });
    const done = await s.staff(s.api.post('/api/queue/complete')).send({
      tokenId: body.token.id,
      diagnosis: 'Viral fever',
      prescription: 'Paracetamol 500mg',
      vitals: { temp: '101F' }
    });
    expect(done.status).toBe(200);

    const byId = await s.api.get(`/api/prescriptions/token/${body.token.id}`);
    expect(byId.status).toBe(200);
    expect(byId.body.consultation).toMatchObject({ diagnosis: 'Viral fever', prescription: 'Paracetamol 500mg' });
    expect(byId.body.consultation.vitals).toEqual({ temp: '101F' });
    expect(byId.body.doctor.id).toBe(s.doctor.id);
    expect(byId.body.clinic).toBeTruthy();

    const byDisplay = await s.api.get(`/api/prescriptions/token/${encodeURIComponent(body.token.displayToken)}`);
    expect(byDisplay.status).toBe(200);
    expect(byDisplay.body.consultation.id).toBe(byId.body.consultation.id);

    const direct = await s.api.get(`/api/prescriptions/${byId.body.consultation.id}`);
    expect(direct.status).toBe(200);
    expect(direct.body.consultation.id).toBe(byId.body.consultation.id);
  });

  it('returns 404 for unknown token and prescription ids', async () => {
    expect((await s.api.get('/api/prescriptions/token/nope')).status).toBe(404);
    expect((await s.api.get('/api/prescriptions/nope')).status).toBe(404);
  });
});

describe('notifications', () => {
  it('lists notifications with a clamped limit', async () => {
    await walkIn();
    await walkIn();
    await walkIn();

    const two = await s.api.get('/api/notifications?limit=2');
    expect(two.status).toBe(200);
    expect(two.body.notifications).toHaveLength(2);
    expect(two.body.notifications[0]).toMatchObject({ id: expect.any(String), status: 'delivered' });

    const huge = await s.api.get('/api/notifications?limit=9999');
    expect(huge.status).toBe(200);
    expect(huge.body.notifications.length).toBeLessThanOrEqual(200);

    const zero = await s.api.get('/api/notifications?limit=0');
    expect(zero.status).toBe(200);
    expect(zero.body.notifications.length).toBeGreaterThanOrEqual(3);
    expect(zero.body.notifications.length).toBeLessThanOrEqual(25);

    const junk = await s.api.get('/api/notifications?limit=abc');
    expect(junk.status).toBe(200);
    expect(junk.body.notifications.length).toBeLessThanOrEqual(25);
  });
});
