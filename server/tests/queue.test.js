import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startSession, uniquePhone } from './helpers/session.js';

let s;

const walkIn = (overrides = {}) => s.staff(s.api.post('/api/queue/walk-in')).send({
  patientName: 'Queue Tester',
  patientPhone: uniquePhone(),
  doctorId: s.doctor.id,
  ...overrides
});
const callNext = (body) => s.staff(s.api.post('/api/queue/call-next')).send(body);
const post = (path, body) => s.staff(s.api.post(path)).send(body);
const toggle = () => s.staff(s.api.patch(`/api/doctors/${s.doctor.id}/toggle`));

const servingToken = async () => {
  const { body } = await walkIn();
  const called = await callNext({ doctorId: s.doctor.id, specificTokenId: body.token.id });
  expect(called.status).toBe(200);
  return called.body.token;
};

beforeAll(async () => {
  s = await startSession();
});

afterAll(async () => {
  if (s) await s.stop();
});

describe('walk-in', () => {
  it('rejects a second active token for the same phone and doctor with 409', async () => {
    const phone = uniquePhone();
    expect((await walkIn({ patientPhone: phone })).status).toBe(201);
    const dup = await walkIn({ patientPhone: phone });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/already has active token/i);
  });

  it('allows the same phone with a different doctor', async () => {
    const phone = uniquePhone();
    expect((await walkIn({ patientPhone: phone })).status).toBe(201);
    expect((await walkIn({ patientPhone: phone, doctorId: s.doctors[1].id })).status).toBe(201);
  });
});

describe('priority', () => {
  it('reprioritizes a waiting token', async () => {
    const { body } = await walkIn();
    const res = await post('/api/queue/priority', { tokenId: body.token.id, isEmergency: true });
    expect(res.status).toBe(200);
    expect(res.body.token.priorityLevel).toBe(3);
  });

  it('returns 409 for a serving token', async () => {
    const token = await servingToken();
    const res = await post('/api/queue/priority', { tokenId: token.id, isSenior: true });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/only waiting tokens/i);
  });
});

describe('recall', () => {
  it('returns 409 for a waiting token', async () => {
    const { body } = await walkIn();
    const res = await post('/api/queue/recall', { tokenId: body.token.id });
    expect(res.status).toBe(409);
  });

  it('recalls a serving token', async () => {
    const token = await servingToken();
    const res = await post('/api/queue/recall', { tokenId: token.id });
    expect(res.status).toBe(200);
    expect(res.body.token.id).toBe(token.id);
  });
});

describe('complete', () => {
  it('returns 409 when the token is still waiting', async () => {
    const { body } = await walkIn();
    const res = await post('/api/queue/complete', { tokenId: body.token.id });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/only a token in consultation/i);
  });

  it('returns 409 when completing an already completed token', async () => {
    const token = await servingToken();
    expect((await post('/api/queue/complete', { tokenId: token.id })).status).toBe(200);
    expect((await post('/api/queue/complete', { tokenId: token.id })).status).toBe(409);
  });
});

describe('call-next availability', () => {
  it('returns 409 while the doctor is away and works again after toggling back', async () => {
    const { body } = await walkIn();
    const off = await toggle();
    expect(off.status).toBe(200);
    expect(off.body.doctor.isAvailable).toBeFalsy();

    const blocked = await callNext({ doctorId: s.doctor.id, specificTokenId: body.token.id });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toMatch(/away/i);

    const on = await toggle();
    expect(on.body.doctor.isAvailable).toBeTruthy();

    const called = await callNext({ doctorId: s.doctor.id, specificTokenId: body.token.id });
    expect(called.status).toBe(200);
    expect(called.body.token.status).toBe('serving');
  });

  it('rejects calling a token that belongs to another doctor', async () => {
    const { body } = await walkIn({ doctorId: s.doctors[1].id });
    const res = await callNext({ doctorId: s.doctor.id, specificTokenId: body.token.id });
    expect(res.status).toBe(400);
  });
});
