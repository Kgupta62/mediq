import { db } from '../config/db.js';
import { notificationService } from '../services/notificationService.js';
import { conflict } from './errors.js';
import { avgConsultMinutes } from './time.js';

export const ACTIVE_STATUSES = ['waiting', 'called', 'serving'];
export const SERVING_STATUSES = ['serving', 'called'];

export const isServing = (token) => SERVING_STATUSES.includes(token.status);

export const findServing = (tokens) => tokens.find(isServing) || null;

export const issueToken = (payload, doctor) => {
  const active = db.getQueueTokens({ doctorId: doctor.id, status: ACTIVE_STATUSES })
    .find(t => t.patientPhone === payload.patientPhone);
  if (active) {
    throw conflict(`Patient already has active token ${active.displayToken} for ${doctor.name}`);
  }
  const token = db.createQueueToken({ ...payload, roomNumber: doctor.roomNumber });
  notificationService.notifyTokenGenerated(token, doctor);
  return token;
};

export const queueStats = (docTokens) => {
  const waiting = docTokens.filter(t => t.status === 'waiting');
  return {
    waiting,
    serving: findServing(docTokens),
    completed: docTokens.filter(t => t.status === 'completed'),
    estimatedWait: waiting.length * avgConsultMinutes(docTokens)
  };
};
