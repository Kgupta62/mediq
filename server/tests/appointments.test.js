import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startSession, isoDate, uniquePhone } from './helpers/session.js';

let s;

const book = (overrides = {}) => s.api.post('/api/appointments').send({
  patientName: 'Reschedule Tester',
  patientPhone: uniquePhone(),
  patientAge: 40,
  patientGender: 'Male',
  doctorId: s.doctor.id,
  appointmentDate: isoDate(1),
  slotTime: '04:00 PM',
  ...overrides
});

const reschedule = (id, body) => s.staff(s.api.patch(`/api/appointments/${id}/reschedule`)).send(body);
const cancel = (id) => s.staff(s.api.delete(`/api/appointments/${id}`));
const checkIn = (id) => s.staff(s.api.post(`/api/appointments/${id}/check-in`));

beforeAll(async () => {
  s = await startSession();
});

afterAll(async () => {
  if (s) await s.stop();
});

describe('reschedule', () => {
  it('moves a booked appointment to a new slot', async () => {
    const { body } = await book({ slotTime: '04:00 PM' });
    const res = await reschedule(body.appointment.id, { appointmentDate: isoDate(2), slotTime: '04:30 PM' });
    expect(res.status).toBe(200);
    expect(res.body.appointment).toMatchObject({ appointmentDate: isoDate(2), slotTime: '04:30 PM', status: 'booked' });
  });

  it('rejects missing fields with 400', async () => {
    const { body } = await book({ slotTime: '04:15 PM' });
    const res = await reschedule(body.appointment.id, { slotTime: '05:00 PM' });
    expect(res.status).toBe(400);
  });

  it('rejects a past date with 400', async () => {
    const { body } = await book({ slotTime: '04:45 PM' });
    const res = await reschedule(body.appointment.id, { appointmentDate: '2020-01-01', slotTime: '05:00 PM' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/past/i);
  });

  it('rejects a slot already booked for the doctor with 409', async () => {
    await book({ appointmentDate: isoDate(3), slotTime: '05:00 PM' });
    const { body } = await book({ appointmentDate: isoDate(3), slotTime: '05:15 PM' });
    const res = await reschedule(body.appointment.id, { appointmentDate: isoDate(3), slotTime: '05:00 PM' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already booked/i);
  });

  it('rejects rescheduling a checked-in appointment with 409', async () => {
    const { body } = await book({ appointmentDate: isoDate(0), slotTime: '05:30 PM' });
    expect((await checkIn(body.appointment.id)).status).toBe(200);
    const res = await reschedule(body.appointment.id, { appointmentDate: isoDate(4), slotTime: '05:45 PM' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/checked_in/);
  });

  it('returns 404 for an unknown appointment', async () => {
    const res = await reschedule('nope', { appointmentDate: isoDate(1), slotTime: '06:00 PM' });
    expect(res.status).toBe(404);
  });
});

describe('cancel', () => {
  it('cancels a booked appointment and refuses to cancel it twice', async () => {
    const { body } = await book({ appointmentDate: isoDate(5), slotTime: '06:00 PM' });
    const first = await cancel(body.appointment.id);
    expect(first.status).toBe(200);
    expect(first.body.appointment.status).toBe('cancelled');

    const second = await cancel(body.appointment.id);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/cancelled/);
  });

  it('frees the slot so another booking can take it', async () => {
    const { body } = await book({ appointmentDate: isoDate(6), slotTime: '06:30 PM' });
    await cancel(body.appointment.id);
    const again = await book({ appointmentDate: isoDate(6), slotTime: '06:30 PM' });
    expect(again.status).toBe(201);
  });
});

describe('check-in', () => {
  it('issues a token once and returns 409 on a second check-in', async () => {
    const { body } = await book({ appointmentDate: isoDate(0), slotTime: '07:00 PM' });
    const first = await checkIn(body.appointment.id);
    expect(first.status).toBe(200);
    expect(first.body.appointment.status).toBe('checked_in');
    expect(first.body.token).toMatchObject({ tokenType: 'appointment', status: 'waiting', appointmentId: body.appointment.id });

    const second = await checkIn(body.appointment.id);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already checked in/i);
  });

  it('refuses to check in a cancelled appointment', async () => {
    const { body } = await book({ appointmentDate: isoDate(7), slotTime: '07:30 PM' });
    await cancel(body.appointment.id);
    const res = await checkIn(body.appointment.id);
    expect(res.status).toBe(409);
  });
});
