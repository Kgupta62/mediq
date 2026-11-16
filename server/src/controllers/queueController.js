import { db } from '../config/db.js';
import { notificationService } from '../services/notificationService.js';
import { handler, emit, queueUpdated, badRequest, notFound, conflict } from '../utils/errors.js';
import { requireText, requirePhone, normalizePhone, requireId, optionalText, optionalAge, optionalGender, optionalObject, tokenStatus } from '../utils/validate.js';
import { nowIso, minutesSince, avgConsultMinutes } from '../utils/time.js';
import { ACTIVE_STATUSES, SERVING_STATUSES, isServing, findServing, issueToken, queueStats } from '../utils/queue.js';

const loadToken = (tokenId) => {
  const token = db.getQueueTokenById(requireId(tokenId, 'Token ID'));
  if (!token) throw notFound('Token not found');
  return token;
};

const loadDoctor = (doctorId) => {
  const doctor = db.getDoctorById(requireId(doctorId, 'Doctor ID'));
  if (!doctor) throw notFound('Doctor not found');
  return doctor;
};

const releaseDoctorPointer = (token) => {
  const doctor = db.getDoctorById(token.doctorId);
  if (doctor && doctor.currentServingTokenId === token.id) {
    db.updateDoctor(token.doctorId, { currentServingTokenId: null });
  }
};

export const getQueueTokens = handler((req, res) => {
  const { doctorId } = req.query;
  const status = tokenStatus(req.query.status);
  res.json({ tokens: db.getQueueTokens({ doctorId, status }) });
});

export const createWalkInToken = handler((req, res) => {
  const { patientName, patientPhone, patientAge, patientGender, doctorId, reason, isEmergency, isSenior } = req.body;
  if (!patientName || !patientPhone || !doctorId) {
    throw badRequest('Patient name, phone, and doctor selection are required');
  }

  const doctor = loadDoctor(doctorId);
  const token = issueToken({
    tokenType: isEmergency ? 'emergency' : 'walk_in',
    patientName: requireText(patientName, 'Patient name', 80),
    patientPhone: requirePhone(patientPhone),
    patientAge: optionalAge(patientAge),
    patientGender: optionalGender(patientGender),
    reason: optionalText(reason, 'Walk-in Consultation', 300),
    doctorId: doctor.id,
    isEmergency: !!isEmergency,
    isSenior: !!isSenior
  }, doctor);

  emit(req, 'TOKEN_CREATED', token);
  queueUpdated(req, 'token_created', doctor.id, token.id);

  res.status(201).json({ message: 'Walk-in token generated successfully!', token });
});

export const callNextToken = handler((req, res) => {
  const { doctorId, specificTokenId } = req.body;
  const doctor = loadDoctor(doctorId);
  if (!doctor.isAvailable) throw conflict(`${doctor.name} is marked Away. Set the doctor as Available first`);

  let nextToken;
  if (specificTokenId) {
    nextToken = loadToken(specificTokenId);
    if (nextToken.doctorId !== doctor.id) throw badRequest('Token belongs to a different doctor');
    if (nextToken.status !== 'waiting') throw conflict(`Token ${nextToken.displayToken} is ${nextToken.status}, only waiting tokens can be called`);
  } else {
    nextToken = db.getQueueTokens({ doctorId: doctor.id, status: 'waiting' })[0];
    if (!nextToken) throw notFound('No patients currently waiting in queue for this doctor');
  }

  const now = nowIso();
  db.getQueueTokens({ doctorId: doctor.id, status: SERVING_STATUSES }).forEach(tok => {
    db.updateQueueToken(tok.id, {
      status: 'completed',
      completedTime: now,
      serviceTimeMinutes: minutesSince(tok.calledTime, 1, 0)
    });
  });

  const updatedToken = db.updateQueueToken(nextToken.id, {
    status: 'serving',
    calledTime: now,
    waitTimeMinutes: minutesSince(nextToken.checkInTime, 0, 0)
  });
  db.updateDoctor(doctor.id, { currentServingTokenId: updatedToken.id });

  notificationService.notifyTokenCalled(updatedToken, doctor);
  db.getQueueTokens({ doctorId: doctor.id, status: 'waiting' }).slice(0, 2).forEach((upToken, index) => {
    notificationService.notifyUpcomingTurn(upToken, doctor, index + 1);
  });

  emit(req, 'TOKEN_CALLED', {
    token: updatedToken,
    doctor: {
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.specialization,
      roomNumber: doctor.roomNumber
    }
  });
  queueUpdated(req, 'token_called', doctor.id, updatedToken.id);

  res.json({ message: `Now serving Token ${updatedToken.displayToken}`, token: updatedToken, doctor });
});

export const recallToken = handler((req, res) => {
  const token = loadToken(req.body.tokenId);
  if (!isServing(token)) throw conflict(`Token ${token.displayToken} is not currently being called`);

  const doctor = db.getDoctorById(token.doctorId);
  if (doctor) notificationService.notifyTokenCalled(token, doctor);

  emit(req, 'TOKEN_RECALLED', { token, doctor });
  res.json({ message: `Token ${token.displayToken} recalled with chime alert!`, token });
});

export const completeToken = handler((req, res) => {
  const { tokenId, diagnosis, prescription, vitals, notes, followUpDate } = req.body;
  const token = loadToken(tokenId);
  if (!isServing(token)) throw conflict(`Token ${token.displayToken} is ${token.status}, only a token in consultation can be completed`);

  const consultNotes = optionalText(notes);
  const updatedToken = db.updateQueueToken(token.id, {
    status: 'completed',
    completedTime: nowIso(),
    serviceTimeMinutes: minutesSince(token.calledTime, 1, 0),
    notes: consultNotes
  });

  const consultRecord = db.createConsultation({
    tokenId: token.id,
    doctorId: token.doctorId,
    patientName: token.patientName,
    patientPhone: token.patientPhone,
    patientAge: token.patientAge,
    patientGender: token.patientGender,
    diagnosis: optionalText(diagnosis, 'Routine Checkup Completed'),
    prescription: optionalText(prescription),
    vitals: optionalObject(vitals, 'Vitals'),
    notes: consultNotes,
    followUpDate: optionalText(followUpDate, null, 10)
  });

  releaseDoctorPointer(token);

  emit(req, 'TOKEN_COMPLETED', { token: updatedToken, consultation: consultRecord });
  queueUpdated(req, 'token_completed', token.doctorId, token.id);

  res.json({
    message: `Consultation completed for Token ${updatedToken.displayToken}`,
    token: updatedToken,
    consultation: consultRecord
  });
});

export const markNoShow = handler((req, res) => {
  const token = loadToken(req.body.tokenId);
  if (!ACTIVE_STATUSES.includes(token.status)) throw conflict(`Token ${token.displayToken} is already ${token.status}`);

  const updated = db.updateQueueToken(token.id, { status: 'no_show', completedTime: nowIso() });
  releaseDoctorPointer(token);

  emit(req, 'TOKEN_NO_SHOW', updated);
  queueUpdated(req, 'token_no_show', token.doctorId, token.id);

  res.json({ message: `Token ${token.displayToken} marked as No-Show`, token: updated });
});

export const reorderPriority = handler((req, res) => {
  const { tokenId, isEmergency, isSenior } = req.body;
  const token = loadToken(tokenId);
  if (token.status !== 'waiting') throw conflict(`Token ${token.displayToken} is ${token.status}, only waiting tokens can be reprioritized`);

  const priorityLevel = isEmergency ? 3 : isSenior ? 2 : 1;
  const updated = db.updateQueueToken(token.id, { priorityLevel });

  queueUpdated(req, 'priority_changed', token.doctorId, token.id);
  res.json({ message: 'Token priority updated', token: updated });
});

export const getTokenStatus = handler((req, res) => {
  const identifier = req.params.identifier.trim();
  let token = db.getQueueTokenById(identifier);
  if (!token) {
    const byPhone = db.getQueueTokens({ patientPhone: normalizePhone(identifier) });
    token = byPhone.find(t => ACTIVE_STATUSES.includes(t.status))
      || byPhone.sort((a, b) => b.checkInTime.localeCompare(a.checkInTime))[0];
  }
  if (!token) throw notFound('Token not found or expired. Please check your token number or phone number.');

  const doctor = db.getDoctorById(token.doctorId);
  const docTokens = db.getQueueTokens({ doctorId: token.doctorId });
  const currentlyServing = findServing(docTokens);
  const waitingTokens = docTokens.filter(t => t.status === 'waiting');

  let tokensAhead = 0;
  let estimatedWaitMins = 0;
  let statusText;

  if (isServing(token)) {
    statusText = "It's Your Turn! Please Enter Doctor's Room";
  } else if (token.status === 'completed') {
    statusText = 'Consultation Completed';
  } else if (token.status === 'no_show') {
    statusText = 'Marked as Absent / Missed Call';
  } else {
    const index = waitingTokens.findIndex(t => t.id === token.id);
    tokensAhead = index >= 0 ? index + 1 : waitingTokens.length;
    const avg = avgConsultMinutes(docTokens);
    const currentRemaining = currentlyServing ? Math.max(0, avg - minutesSince(currentlyServing.calledTime, 0, 0)) : 0;
    estimatedWaitMins = (tokensAhead - 1) * avg + currentRemaining;
    statusText = tokensAhead === 1
      ? 'You are NEXT in line! Please stand near the door.'
      : `${tokensAhead} patient(s) ahead of you`;
  }

  res.json({
    token,
    doctor: doctor ? {
      name: doctor.name,
      specialization: doctor.specialization,
      roomNumber: doctor.roomNumber,
      avatarUrl: doctor.avatarUrl
    } : null,
    currentServing: currentlyServing ? {
      tokenNumber: currentlyServing.tokenNumber,
      displayToken: currentlyServing.displayToken,
      calledTime: currentlyServing.calledTime
    } : null,
    tokensAhead,
    estimatedWaitMins,
    statusText
  });
});

export const getQueueSummary = handler((req, res) => {
  const allTokens = db.getQueueTokens({ today: true });

  const summary = db.getDoctors().map(doc => {
    const { waiting, serving, completed, estimatedWait } = queueStats(allTokens.filter(t => t.doctorId === doc.id));
    return {
      doctorId: doc.id,
      doctorName: doc.name,
      specialization: doc.specialization,
      roomNumber: doc.roomNumber,
      isAvailable: doc.isAvailable,
      waitingCount: waiting.length,
      servingToken: serving ? serving.displayToken : 'None',
      servingPatient: serving ? serving.patientName : null,
      completedCount: completed.length,
      estimatedWaitMinutes: estimatedWait
    };
  });

  res.json({
    summary,
    totalWaiting: allTokens.filter(t => t.status === 'waiting').length,
    totalServing: allTokens.filter(isServing).length,
    totalCompleted: allTokens.filter(t => t.status === 'completed').length
  });
});
