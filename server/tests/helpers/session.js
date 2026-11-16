import request from 'supertest';
import { startTestServer } from './testServer.js';

export async function startSession(port = 5201, email = 'receptionist@clinic.com') {
  const server = await startTestServer(port);
  const api = request(server.baseUrl);
  const doctors = (await api.get('/api/doctors')).body.doctors;
  const login = await api.post('/api/auth/login').send({ email, password: 'password123' });
  const auth = `Bearer ${login.body.token}`;
  return {
    api,
    doctor: doctors[0],
    doctors,
    auth,
    token: login.body.token,
    staff: (req) => req.set('Authorization', auth),
    stop: () => server.stop()
  };
}

export const isoDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

let phoneSeq = 100;
export const uniquePhone = () => `+91 91000 ${String(phoneSeq++).padStart(5, '0')}`;
