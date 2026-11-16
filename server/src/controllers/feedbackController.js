import { db } from '../config/db.js';
import { handler, emit, badRequest, notFound, conflict } from '../utils/errors.js';
import { optionalText } from '../utils/validate.js';

export const createFeedback = handler((req, res) => {
  const { tokenId, displayToken, rating, comment } = req.body || {};
  const identifier = typeof tokenId === 'string' && tokenId.trim() ? tokenId.trim() : typeof displayToken === 'string' ? displayToken.trim() : '';
  if (!identifier) throw badRequest('tokenId or displayToken is required');

  const score = Number(rating);
  if (!Number.isInteger(score) || score < 1 || score > 5) throw badRequest('Rating must be a whole number from 1 to 5');

  const token = db.getQueueTokenById(identifier);
  if (!token) throw notFound('Token not found');
  if (token.status !== 'completed') throw badRequest('Feedback can only be left after the consultation is completed');
  if (db.getFeedbackByToken(token.id)) throw conflict('Feedback has already been submitted for this token');

  const feedback = db.createFeedback({
    tokenId: token.id,
    doctorId: token.doctorId,
    patientPhone: token.patientPhone,
    rating: score,
    comment: optionalText(comment, '', 500)
  });

  emit(req, 'FEEDBACK_RECEIVED', { feedback, displayToken: token.displayToken });
  res.status(201).json({ message: 'Thank you for your feedback', feedback });
});

export const getFeedbackSummary = handler((req, res) => {
  res.json({ summary: db.getFeedbackSummary(req.query.all !== '1') });
});

export const listFeedback = handler((req, res) => {
  res.json({ feedback: db.listFeedback(req.query.limit) });
});
