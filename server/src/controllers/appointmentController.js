import { db } from '../config/db.js';
import { notificationService } from '../services/notificationService.js';
import { handler, emit, queueUpdated, badRequest, notFound, conflict } from '../utils/errors.js';
import { requireText, requirePhone, requireId, optionalText, optionalAge, optionalGender, requireDate, requireSlot, appointmentStatus } from '../utils/validate.js';
import { isPastDate } from '../utils/time.js';
import { issueToken } from '../utils/queue.js';

const loadAppointment = (id) => {
  const apt = db.getAppointmentById(requireId(id, 'Appointment ID'));
  if (!apt) throw notFound('Appointment not found');
  return apt;
};

const requireSchedule = (appointmentDate, slotTime) => {
  const date = requireDate(appointmentDate, 'Appointment date');
  if (isPastDate(date)) throw badRequest('Appointment date cannot be in the past');
  return { appointmentDate: date, slotTime: requireSlot(slotTime) };
};

const assertSlotFree = (doctorId, appointmentDate, slotTime, excludeId) => {
  const taken = db.getAppointments({ doctorId, date: appointmentDate })
    .find(a => a.slotTime === slotTime && a.id !== excludeId && a.status !== 'cancelled');
  if (taken) throw conflict(`Slot ${slotTime} on ${appointmentDate} is already booked for this doctor`);
};

export const getAppointments = handler((req, res) => {
  const { doctorId, date } = req.query;
  const status = appointmentStatus(req.query.status);
  res.json({ appointments: db.getAppointments({ doctorId, date, status }) });
});

export const createAppointment = handler((req, res) => {
  const { patientName, patientPhone, patientAge, patientGender, doctorId, appointmentDate, slotTime, reason } = req.body;
  if (!patientName || !patientPhone || !doctorId || !appointmentDate || !slotTime) {
    throw badRequest('Missing required appointment fields');
  }

  const doctor = db.getDoctorById(requireId(doctorId, 'Doctor ID'));
  if (!doctor) throw notFound('Doctor not found');

  const schedule = requireSchedule(appointmentDate, slotTime);
  assertSlotFree(doctor.id, schedule.appointmentDate, schedule.slotTime);

  const newApt = db.createAppointment({
    patientName: requireText(patientName, 'Patient name', 80),
    patientPhone: requirePhone(patientPhone),
    patientAge: optionalAge(patientAge),
    patientGender: optionalGender(patientGender),
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialization: doctor.specialization,
    roomNumber: doctor.roomNumber,
    ...schedule,
    reason: optionalText(reason, 'General Consultation', 300)
  });

  notificationService.notifyBookingConfirmed(newApt, doctor);
  emit(req, 'APPOINTMENT_BOOKED', newApt);

  res.status(201).json({ message: 'Appointment booked successfully!', appointment: newApt });
});

export const checkInAppointment = handler((req, res) => {
  const apt = loadAppointment(req.params.id);
  if (apt.status === 'checked_in') throw conflict('Patient is already checked in');
  if (apt.status !== 'booked') throw conflict(`Cannot check in a ${apt.status} appointment`);

  const doctor = db.getDoctorById(apt.doctorId);
  if (!doctor) throw notFound('Doctor for this appointment no longer exists');

  const token = issueToken({
    tokenType: 'appointment',
    patientName: apt.patientName,
    patientPhone: apt.patientPhone,
    patientAge: apt.patientAge,
    patientGender: apt.patientGender,
    reason: apt.reason,
    doctorId: apt.doctorId,
    appointmentId: apt.id
  }, doctor);

  const updatedApt = db.updateAppointment(apt.id, {
    status: 'checked_in',
    tokenNumber: token.tokenNumber,
    displayToken: token.displayToken
  });

  emit(req, 'PATIENT_CHECKED_IN', { appointment: updatedApt, token });
  queueUpdated(req, 'patient_checked_in', apt.doctorId, token.id);

  res.json({ message: 'Patient checked in successfully. Token generated!', appointment: updatedApt, token });
});

export const cancelAppointment = handler((req, res) => {
  const apt = loadAppointment(req.params.id);
  if (apt.status !== 'booked') throw conflict(`Cannot cancel a ${apt.status} appointment`);

  const updated = db.updateAppointment(apt.id, { status: 'cancelled' });
  emit(req, 'APPOINTMENT_CANCELLED', updated);

  res.json({ message: 'Appointment cancelled', appointment: updated });
});

export const rescheduleAppointment = handler((req, res) => {
  const { appointmentDate, slotTime } = req.body;
  if (!appointmentDate || !slotTime) throw badRequest('New appointment date and slot time are required');

  const apt = loadAppointment(req.params.id);
  if (apt.status !== 'booked' && apt.status !== 'cancelled') {
    throw conflict(`Cannot reschedule appointment in '${apt.status}' state`);
  }

  const schedule = requireSchedule(appointmentDate, slotTime);
  assertSlotFree(apt.doctorId, schedule.appointmentDate, schedule.slotTime, apt.id);

  const updated = db.updateAppointment(apt.id, { ...schedule, status: 'booked' });

  const doctor = db.getDoctorById(updated.doctorId);
  if (doctor) notificationService.notifyBookingConfirmed(updated, doctor);
  emit(req, 'APPOINTMENT_RESCHEDULED', updated);

  res.json({ message: 'Appointment rescheduled successfully!', appointment: updated });
});
