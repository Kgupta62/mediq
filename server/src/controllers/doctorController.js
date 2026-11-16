import { db } from '../config/db.js';
import { handler, emit, queueUpdated, notFound, badRequest } from '../utils/errors.js';
import { requireId, requireText, optionalText } from '../utils/validate.js';
import { queueStats } from '../utils/queue.js';

const optionalFee = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const fee = Number(value);
  if (!Number.isInteger(fee) || fee < 0 || fee > 100000) throw badRequest('Fee must be a whole number between 0 and 100000');
  return fee;
};

const optionalUrl = (value) => {
  const url = optionalText(value, '', 500);
  if (url && !/^https?:\/\//i.test(url)) throw badRequest('Avatar URL must start with http:// or https://');
  return url || null;
};

const profileFields = (body, current = {}) => ({
  name: body.name === undefined && current.name ? current.name : requireText(body.name, 'Doctor name', 80),
  title: optionalText(body.title, current.title || '', 120),
  specialization: body.specialization === undefined && current.specialization ? current.specialization : requireText(body.specialization, 'Specialization', 80),
  experience: optionalText(body.experience, current.experience || '', 40),
  roomNumber: body.roomNumber === undefined && current.roomNumber ? current.roomNumber : requireText(body.roomNumber, 'Room number', 40),
  fee: optionalFee(body.fee, current.fee ?? 500),
  bio: optionalText(body.bio, current.bio || '', 600),
  avatarUrl: body.avatarUrl === undefined ? current.avatarUrl || null : optionalUrl(body.avatarUrl)
});

const loadDoctor = (id) => {
  const doc = db.getDoctorById(requireId(id, 'Doctor ID'));
  if (!doc) throw notFound('Doctor not found');
  return doc;
};

export const getDoctors = handler((req, res) => {
  const tokens = db.getQueueTokens();
  const doctors = db.getDoctors().map(doc => {
    const { waiting, serving, estimatedWait } = queueStats(tokens.filter(t => t.doctorId === doc.id));
    return {
      ...doc,
      waitingCount: waiting.length,
      currentServingToken: serving ? serving.displayToken : 'None',
      estimatedWaitTime: estimatedWait
    };
  });
  res.json({ doctors });
});

export const getDoctorById = handler((req, res) => {
  res.json({ doctor: loadDoctor(req.params.id) });
});

export const toggleDoctorAvailability = handler((req, res) => {
  const doc = loadDoctor(req.params.id);
  const updated = db.updateDoctor(doc.id, { isAvailable: !doc.isAvailable });
  queueUpdated(req, 'doctor_toggled', doc.id);
  res.json({ doctor: updated, message: `Doctor is now ${updated.isAvailable ? 'Available' : 'Away'}` });
});

export const createDoctor = handler((req, res) => {
  const doctor = db.createDoctor(profileFields(req.body || {}));
  emit(req, 'CLINIC_UPDATED', db.getClinic());
  queueUpdated(req, 'doctor_created', doctor.id);
  res.status(201).json({ doctor, message: 'Doctor added' });
});

export const updateDoctor = handler((req, res) => {
  const doc = loadDoctor(req.params.id);
  const updated = db.updateDoctorProfile(doc.id, profileFields(req.body || {}, doc));
  emit(req, 'CLINIC_UPDATED', db.getClinic());
  queueUpdated(req, 'doctor_updated', doc.id);
  res.json({ doctor: updated, message: 'Doctor updated' });
});
