import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startSession } from './helpers/session.js';

let s;
let completedToken;

beforeAll(async () => {
  s = await startSession();
  const res = await s.api.get('/api/queue?status=completed');
  completedToken = res.body.tokens[0];
});

afterAll(async () => {
  if (s) await s.stop();
});

describe('POST /api/feedback', () => {
  it('rejects a missing or out of range rating', async () => {
    const noRating = await s.api.post('/api/feedback').send({ tokenId: completedToken.id });
    expect(noRating.status).toBe(400);
    const tooHigh = await s.api.post('/api/feedback').send({ tokenId: completedToken.id, rating: 6 });
    expect(tooHigh.status).toBe(400);
    const noToken = await s.api.post('/api/feedback').send({ rating: 4 });
    expect(noToken.status).toBe(400);
  });

  it('returns 404 for an unknown token', async () => {
    const res = await s.api.post('/api/feedback').send({ displayToken: 'ZZ-999', rating: 4 });
    expect(res.status).toBe(404);
  });

  it('rejects feedback for a token that is not completed', async () => {
    const waiting = (await s.api.get('/api/queue?status=waiting')).body.tokens[0];
    const res = await s.api.post('/api/feedback').send({ tokenId: waiting.id, rating: 5 });
    expect(res.status).toBe(400);
  });

  it('creates feedback without auth and blocks a duplicate with 409', async () => {
    const seeded = await s.api.post('/api/feedback').send({ tokenId: completedToken.id, rating: 5 });
    expect(seeded.status).toBe(409);

    const walkIn = await s.staff(s.api.post('/api/queue/walk-in')).send({
      patientName: 'Feedback Tester', patientPhone: '+91 91000 77001', doctorId: s.doctors[2].id
    });
    const tokenId = walkIn.body.token.id;
    await s.staff(s.api.post('/api/queue/call-next')).send({ doctorId: s.doctors[2].id, specificTokenId: tokenId });
    await s.staff(s.api.post('/api/queue/complete')).send({ tokenId, diagnosis: 'Routine' });

    const res = await s.api.post('/api/feedback').send({ displayToken: walkIn.body.token.displayToken, rating: 4, comment: '  Quick and kind  ' });
    expect(res.status).toBe(201);
    expect(res.body.feedback).toMatchObject({ tokenId, doctorId: s.doctors[2].id, rating: 4, comment: 'Quick and kind' });

    const dup = await s.api.post('/api/feedback').send({ tokenId, rating: 3 });
    expect(dup.status).toBe(409);
  });
});

describe('feedback summary and list', () => {
  it('requires staff auth', async () => {
    expect((await s.api.get('/api/feedback/summary')).status).toBe(401);
    expect((await s.api.get('/api/feedback')).status).toBe(401);
  });

  it('returns today average, count and latest comments', async () => {
    const res = await s.staff(s.api.get('/api/feedback/summary'));
    expect(res.status).toBe(200);
    expect(res.body.summary.count).toBe(4);
    expect(res.body.summary.averageRating).toBeCloseTo(4.5, 1);
    expect(res.body.summary.latest.length).toBeLessThanOrEqual(5);
    expect(res.body.summary.latest[0]).toMatchObject({ rating: 4, displayToken: expect.any(String), doctorName: s.doctors[2].name });
  });

  it('lists feedback with a limit and exposes the rating on analytics', async () => {
    const res = await s.staff(s.api.get('/api/feedback?limit=2'));
    expect(res.status).toBe(200);
    expect(res.body.feedback).toHaveLength(2);
    const analytics = await s.api.get('/api/analytics');
    expect(analytics.body.feedback).toEqual({ averageRating: 4.5, count: 4 });
    expect(analytics.body.pilotImpact.patientSatisfactionRating).toBe(4.5);
  });
});
