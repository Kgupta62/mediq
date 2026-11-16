import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startSession } from './helpers/session.js';

let s;

beforeAll(async () => {
  s = await startSession(5201, 'admin@clinic.com');
});

afterAll(async () => {
  if (s) await s.stop();
});

const payload = { name: 'Dr. Kavya Rao', title: 'Consultant Dermatologist', specialization: 'Dermatology', experience: '7 Years', roomNumber: 'Room 104', fee: 450, bio: 'Skin and hair care.' };

describe('admin account', () => {
  it('can log in and use staff routes', async () => {
    expect(s.token).toBeTruthy();
    const res = await s.staff(s.api.patch('/api/clinic')).send({ activeNotice: 'Admin notice' });
    expect(res.status).toBe(200);
    expect(res.body.clinic.activeNotice).toBe('Admin notice');
  });
});

describe('doctor management', () => {
  it('requires staff auth', async () => {
    expect((await s.api.post('/api/doctors').send(payload)).status).toBe(401);
    expect((await s.api.patch(`/api/doctors/${s.doctor.id}`).send({ name: 'X' })).status).toBe(401);
  });

  it('validates required fields', async () => {
    const missing = await s.staff(s.api.post('/api/doctors')).send({ name: 'Only Name' });
    expect(missing.status).toBe(400);
    const badFee = await s.staff(s.api.post('/api/doctors')).send({ ...payload, fee: -5 });
    expect(badFee.status).toBe(400);
    const badUrl = await s.staff(s.api.post('/api/doctors')).send({ ...payload, avatarUrl: 'javascript:alert(1)' });
    expect(badUrl.status).toBe(400);
  });

  it('creates a doctor that appears in GET /doctors', async () => {
    const res = await s.staff(s.api.post('/api/doctors')).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.doctor).toMatchObject({ ...payload, isAvailable: true, avatarUrl: null });
    const list = await s.api.get('/api/doctors');
    const created = list.body.doctors.find(d => d.id === res.body.doctor.id);
    expect(created).toMatchObject({ name: payload.name, waitingCount: 0, currentServingToken: 'None' });
  });

  it('updates a doctor profile and returns 404 for unknown ids', async () => {
    const res = await s.staff(s.api.patch(`/api/doctors/${s.doctor.id}`)).send({ fee: 650, title: 'Head of Cardiology' });
    expect(res.status).toBe(200);
    expect(res.body.doctor).toMatchObject({ id: s.doctor.id, name: s.doctor.name, fee: 650, title: 'Head of Cardiology' });
    expect((await s.staff(s.api.patch(`/api/doctors/${s.doctor.id}`)).send({ name: '' })).status).toBe(400);
    expect((await s.staff(s.api.patch('/api/doctors/nope')).send({ fee: 1 })).status).toBe(404);
  });
});
