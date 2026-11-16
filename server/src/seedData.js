import { db } from './config/db.js';
import { todayLocal } from './utils/time.js';

const APPOINTMENTS = [
  { patientName: 'Aarav Mehta', patientPhone: '+91 98231 11223', patientAge: 42, patientGender: 'Male', doctorId: 'doc-1', slotTime: '09:00 AM', reason: 'Chest pain follow-up & ECG review', status: 'completed' },
  { patientName: 'Meera Iyer', patientPhone: '+91 90044 18273', patientAge: 35, patientGender: 'Female', doctorId: 'doc-1', slotTime: '09:30 AM', reason: 'Hypertension routine checkup', status: 'completed' },
  { patientName: 'Rohan Deshmukh', patientPhone: '+91 77388 92610', patientAge: 29, patientGender: 'Male', doctorId: 'doc-1', slotTime: '10:00 AM', reason: 'Palpitations during exercise', status: 'checked_in' },
  { patientName: 'Ananya Sen', patientPhone: '+91 83690 25147', patientAge: 51, patientGender: 'Female', doctorId: 'doc-1', slotTime: '10:30 AM', reason: 'Post-stent annual consultation', status: 'booked' },
  { patientName: 'Kabir Verma', patientPhone: '+91 96190 73482', patientAge: 4, patientGender: 'Male', doctorId: 'doc-3', slotTime: '10:00 AM', reason: 'Persistent fever and cough', status: 'checked_in' },
  { patientName: 'Pooja Reddy', patientPhone: '+91 70137 56924', patientAge: 28, patientGender: 'Female', doctorId: 'doc-2', slotTime: '10:15 AM', reason: 'Type 2 Diabetes HbA1c review', status: 'checked_in' }
];

const TOKENS = [
  { appointment: 0, checkIn: 79, status: 'completed', called: 65, completed: 50, waitTimeMinutes: 14, serviceTimeMinutes: 15 },
  { appointment: 1, checkIn: 64, status: 'completed', called: 48, completed: 35, waitTimeMinutes: 16, serviceTimeMinutes: 13 },
  { appointment: 2, checkIn: 20, status: 'serving', called: 8 },
  { patientName: 'Suresh Trivedi', patientPhone: '+91 94220 38175', patientAge: 68, patientGender: 'Male', doctorId: 'doc-1', reason: 'Dizziness on standing, on BP medication', checkIn: 18, isSenior: true },
  { patientName: 'Neha Gupta', patientPhone: '+91 99874 60312', patientAge: 32, patientGender: 'Female', doctorId: 'doc-1', reason: 'Shortness of breath & fatigue', checkIn: 14 },
  { patientName: 'Vikram Choudhary', patientPhone: '+91 86558 41907', patientAge: 45, patientGender: 'Male', doctorId: 'doc-1', reason: 'BP spikes & headache', checkIn: 9 },
  { appointment: 5, checkIn: 16, status: 'serving', called: 5 },
  { patientName: 'Amit Saxena', patientPhone: '+91 91675 20483', patientAge: 52, patientGender: 'Male', doctorId: 'doc-2', reason: 'High fasting glucose & blurred vision', checkIn: 7 },
  { appointment: 4, patientName: 'Kabir Verma (Parent: Nitin)', checkIn: 22, status: 'serving', called: 10 },
  { patientName: 'Lakshmi Nair', patientPhone: '+91 98450 27316', patientAge: 58, patientGender: 'Female', doctorId: 'doc-2', reason: 'Thyroid medication review', checkIn: 95, status: 'completed', called: 80, completed: 68, waitTimeMinutes: 15, serviceTimeMinutes: 12 }
];

const FEEDBACK = [
  { rating: 5, comment: 'Very smooth. I waited at the cafe and got a WhatsApp alert when it was my turn.' },
  { rating: 4, comment: 'Doctor was thorough. The token display made the wait predictable.' },
  { rating: 5, comment: 'No crowding at the desk, the live tracker is a great idea.' }
];

const seed = db.transaction(() => {
  db.resetToDefault();

  const now = Date.now();
  const midnight = new Date(now).setHours(0, 0, 0, 0);
  const maxMinutes = Math.max(1, Math.floor((now - midnight) / 60000) - 1);
  const minutesAgo = (mins) => new Date(now - Math.min(mins, maxMinutes) * 60000).toISOString();
  const todayStr = todayLocal();
  const doctors = Object.fromEntries(db.getDoctors().map(d => [d.id, d]));

  const createdApts = APPOINTMENTS.map(a => {
    const doc = doctors[a.doctorId];
    return db.createAppointment({ ...a, doctorName: doc.name, specialization: doc.specialization, roomNumber: doc.roomNumber, appointmentDate: todayStr });
  });

  for (const t of TOKENS) {
    const apt = t.appointment === undefined ? null : createdApts[t.appointment];
    const base = apt
      ? { tokenType: 'appointment', patientName: apt.patientName, patientPhone: apt.patientPhone, patientAge: apt.patientAge, patientGender: apt.patientGender, reason: apt.reason, doctorId: apt.doctorId, appointmentId: apt.id }
      : { tokenType: 'walk_in' };
    const { appointment, checkIn, status, called, completed, isSenior, ...overrides } = t;

    const token = db.createQueueToken({
      ...base,
      ...overrides,
      roomNumber: doctors[base.doctorId || overrides.doctorId].roomNumber,
      isSenior: Boolean(isSenior),
      checkInTime: minutesAgo(checkIn)
    });

    if (apt) db.updateAppointment(apt.id, { tokenNumber: token.tokenNumber, displayToken: token.displayToken });

    if (status) {
      db.updateQueueToken(token.id, {
        status,
        calledTime: called === undefined ? null : minutesAgo(called),
        completedTime: completed === undefined ? null : minutesAgo(completed),
        waitTimeMinutes: overrides.waitTimeMinutes || 0,
        serviceTimeMinutes: overrides.serviceTimeMinutes || 0
      });
      if (status === 'serving') db.updateDoctor(token.doctorId, { currentServingTokenId: token.id });
    }
  }

  const completed = db.getQueueTokens({ status: 'completed', today: true });
  FEEDBACK.forEach((f, i) => {
    const token = completed[i];
    if (token) db.createFeedback({ tokenId: token.id, doctorId: token.doctorId, patientPhone: token.patientPhone, ...f });
  });
});

export function seedInitialData({ force = false } = {}) {
  if (!force && db.getQueueTokens().length > 0) {
    console.log('Database already populated with queue data.');
    return;
  }

  console.log('Seeding initial realistic clinic pilot data...');
  seed();
  console.log('Pilot clinic seed data successfully created!');
}

if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
  seedInitialData({ force: process.argv.includes('--force') });
}
