import { db } from '../config/db.js';
import { handler, badRequest, notFound } from '../utils/errors.js';
import { requireId } from '../utils/validate.js';

export const getPatientHistory = handler((req, res) => {
  const phone = (req.params.phone || '').trim();
  if (phone.replace(/\D/g, '').length < 4) throw badRequest('Enter at least 4 digits of the phone number');
  res.json({ phone, ...db.getPatientHistory(phone) });
});

export const getPrescriptionByToken = handler((req, res) => {
  const token = db.getQueueTokenById(requireId(req.params.identifier, 'Token'));
  if (!token) throw notFound('Queue token not found');

  const consultation = db.getConsultationByToken(token.id);
  const doctor = db.getDoctorById(token.doctorId);
  if (!consultation) {
    return res.status(404).json({ error: 'No medical prescription recorded yet for this consultation', token, doctor });
  }

  res.json({ token, consultation, doctor, clinic: db.getClinic() });
});

export const getPrescriptionById = handler((req, res) => {
  const consultation = db.getConsultationById(requireId(req.params.id, 'Prescription ID'));
  if (!consultation) throw notFound('Prescription not found');

  res.json({ consultation, doctor: db.getDoctorById(consultation.doctorId), clinic: db.getClinic() });
});
