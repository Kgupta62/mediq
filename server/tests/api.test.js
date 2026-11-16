import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { startTestServer } from './helpers/testServer.js';

const PORT = 5201;
let server;
let api;
let doctor;
let staffAuth;

const asStaff = (req) => req.set('Authorization', staffAuth);

const bookingPayload = () => ({
  patientName: 'Test Patient',
  patientPhone: '+91 90000 00001',
  patientAge: 30,
  patientGender: 'Female',
  doctorId: doctor.id,
  appointmentDate: new Date().toISOString().slice(0, 10),
  slotTime: '03:00 PM',
  reason: 'Automated test booking'
});

const walkInPayload = (overrides = {}) => ({
  patientName: 'Walk In Tester',
  patientPhone: '+91 90000 00002',
  patientAge: 45,
  patientGender: 'Male',
  doctorId: doctor.id,
  reason: 'Automated walk-in',
  ...overrides
});

beforeAll(async () => {
  server = await startTestServer(PORT);
  api = request(server.baseUrl);
  const res = await api.get('/api/doctors');
  doctor = res.body.doctors[0];
  const login = await api.post('/api/auth/login').send({ email: 'receptionist@clinic.com', password: 'password123' });
  staffAuth = `Bearer ${login.body.token}`;
});

afterAll(async () => {
  if (server) await server.stop();
});

describe('health and clinic', () => {
  it('GET /health reports healthy', async () => {
    const res = await api.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /api/clinic returns clinic info', async () => {
    const res = await api.get('/api/clinic');
    expect(res.status).toBe(200);
    expect(res.body.clinic).toBeTruthy();
    expect(typeof res.body.clinic.name).toBe('string');
    expect(res.body.clinic.name.length).toBeGreaterThan(0);
  });

  it('GET /api/doctors returns a non-empty doctor list', async () => {
    const res = await api.get('/api/doctors');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.doctors)).toBe(true);
    expect(res.body.doctors.length).toBeGreaterThan(0);
    expect(res.body.doctors[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      specialization: expect.any(String)
    });
  });

  it('GET /api/doctors/:id returns 404 for an unknown doctor', async () => {
    const res = await api.get('/api/doctors/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('appointments', () => {
  it('rejects a booking with missing fields', async () => {
    const res = await api.post('/api/appointments').send({ patientName: 'Only Name' });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('rejects a booking for an unknown doctor', async () => {
    const res = await api.post('/api/appointments').send({ ...bookingPayload(), doctorId: 'nope' });
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
  });

  it('books an appointment successfully', async () => {
    const res = await api.post('/api/appointments').send(bookingPayload());
    expect(res.status).toBe(201);
    expect(res.body.appointment).toMatchObject({
      id: expect.any(String),
      patientName: 'Test Patient',
      doctorId: doctor.id,
      status: 'booked'
    });

    const list = await api.get('/api/appointments');
    expect(list.status).toBe(200);
    expect(list.body.appointments.some((a) => a.id === res.body.appointment.id)).toBe(true);
  });
});

describe('queue engine', () => {
  it('rejects queue writes without a staff token', async () => {
    const res = await api.post('/api/queue/walk-in').send(walkInPayload());
    expect(res.status).toBe(401);
  });

  it('rejects a walk-in with missing fields', async () => {
    const res = await asStaff(api.post('/api/queue/walk-in')).send({ patientName: 'No Phone' });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('creates a walk-in token', async () => {
    const res = await asStaff(api.post('/api/queue/walk-in')).send(walkInPayload());
    expect(res.status).toBe(201);
    expect(res.body.token).toMatchObject({
      id: expect.any(String),
      displayToken: expect.any(String),
      doctorId: doctor.id,
      status: 'waiting'
    });
  });

  it('requires a doctorId for call-next', async () => {
    const res = await asStaff(api.post('/api/queue/call-next')).send({});
    expect(res.status).toBe(400);
  });

  it('calls a specific token, completes it and records a consultation', async () => {
    const created = await asStaff(api.post('/api/queue/walk-in')).send(walkInPayload({ patientPhone: '+91 90000 00003' }));
    const tokenId = created.body.token.id;

    const called = await asStaff(api.post('/api/queue/call-next')).send({ doctorId: doctor.id, specificTokenId: tokenId });
    expect(called.status).toBe(200);
    expect(called.body.token.id).toBe(tokenId);
    expect(called.body.token.status).toBe('serving');

    const status = await api.get(`/api/queue/token/${tokenId}`);
    expect(status.status).toBe(200);
    expect(status.body.tokensAhead).toBe(0);

    const completed = await asStaff(api.post('/api/queue/complete')).send({
      tokenId,
      diagnosis: 'Test diagnosis',
      prescription: 'Rest',
      vitals: { bp: '120/80' }
    });
    expect(completed.status).toBe(200);
    expect(completed.body.token.status).toBe('completed');
    expect(completed.body.consultation).toMatchObject({ tokenId, diagnosis: 'Test diagnosis' });
  });

  it('calls the next waiting token when no specific token is given', async () => {
    await asStaff(api.post('/api/queue/walk-in')).send(walkInPayload({ patientPhone: '+91 90000 00004' }));
    const res = await asStaff(api.post('/api/queue/call-next')).send({ doctorId: doctor.id });
    expect(res.status).toBe(200);
    expect(res.body.token.status).toBe('serving');
    expect(res.body.token.doctorId).toBe(doctor.id);
  });

  it('marks a token as no-show', async () => {
    const created = await asStaff(api.post('/api/queue/walk-in')).send(walkInPayload({ patientPhone: '+91 90000 00005' }));
    const res = await asStaff(api.post('/api/queue/no-show')).send({ tokenId: created.body.token.id });
    expect(res.status).toBe(200);
    expect(res.body.token.status).toBe('no_show');
  });

  it('returns 404 for unknown token on complete and no-show', async () => {
    expect((await asStaff(api.post('/api/queue/complete')).send({ tokenId: 'missing' })).status).toBe(404);
    expect((await asStaff(api.post('/api/queue/no-show')).send({ tokenId: 'missing' })).status).toBe(404);
  });

  it('looks up token status by display token and by phone', async () => {
    const phone = '+91 90000 00006';
    const created = await asStaff(api.post('/api/queue/walk-in')).send(walkInPayload({ patientPhone: phone }));
    const { displayToken, id } = created.body.token;

    const byDisplay = await api.get(`/api/queue/token/${encodeURIComponent(displayToken)}`);
    expect(byDisplay.status).toBe(200);
    expect(byDisplay.body.token.id).toBe(id);
    expect(typeof byDisplay.body.statusText).toBe('string');
    expect(byDisplay.body.tokensAhead).toBeGreaterThanOrEqual(1);
    expect(byDisplay.body.doctor).toMatchObject({ name: doctor.name });

    const byPhone = await api.get(`/api/queue/token/${encodeURIComponent(phone)}`);
    expect(byPhone.status).toBe(200);
    expect(byPhone.body.token.patientPhone).toBe(phone);
  });

  it('returns 404 for an unknown token lookup', async () => {
    const res = await api.get('/api/queue/token/ZZZ-999999');
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
  });

  it('GET /api/queue/summary returns per-doctor summary', async () => {
    const res = await api.get('/api/queue/summary');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.summary)).toBe(true);
    expect(res.body.summary.find((s) => s.doctorId === doctor.id)).toMatchObject({
      doctorName: doctor.name,
      waitingCount: expect.any(Number)
    });
  });
});

describe('auth', () => {
  it('logs in the seeded receptionist', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'receptionist@clinic.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ email: 'receptionist@clinic.com', role: 'receptionist' });
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects a wrong password', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'receptionist@clinic.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(typeof res.body.error).toBe('string');
  });

  it('rejects a login with missing fields', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'receptionist@clinic.com' });
    expect(res.status).toBe(400);
  });
});

describe('routing', () => {
  it('returns 404 for an unknown route', async () => {
    const res = await api.get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
  });
});
