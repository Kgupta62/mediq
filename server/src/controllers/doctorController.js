import { db } from '../config/db.js';
import { handler, queueUpdated, notFound } from '../utils/errors.js';
import { requireId } from '../utils/validate.js';
import { queueStats } from '../utils/queue.js';

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
