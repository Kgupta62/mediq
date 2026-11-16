import express from 'express';
import { db } from '../config/db.js';
import * as authCtrl from '../controllers/authController.js';
import * as docCtrl from '../controllers/doctorController.js';
import * as aptCtrl from '../controllers/appointmentController.js';
import * as queueCtrl from '../controllers/queueController.js';
import * as analyticsCtrl from '../controllers/analyticsController.js';
import * as patientCtrl from '../controllers/patientController.js';
import { requireStaff } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

const loginLimiter = rateLimit({ max: 20, message: 'Too many login attempts, please try again later' });
const otpLimiter = rateLimit({ max: 10, message: 'Too many OTP attempts, please try again later' });

// Auth
router.post('/auth/login', loginLimiter, authCtrl.login);
router.post('/auth/verify-otp', otpLimiter, authCtrl.verifyPatientOTP);

// Clinic Info
router.get('/clinic', (req, res) => {
  res.json({ clinic: db.getClinic() });
});
router.patch('/clinic', requireStaff, (req, res) => {
  const updated = db.updateClinic(req.body);
  req.app.get('io')?.emit('CLINIC_UPDATED', updated);
  res.json({ clinic: updated });
});

// Doctors
router.get('/doctors', docCtrl.getDoctors);
router.get('/doctors/:id', docCtrl.getDoctorById);
router.patch('/doctors/:id/toggle', requireStaff, docCtrl.toggleDoctorAvailability);

// Appointments
router.get('/appointments', aptCtrl.getAppointments);
router.post('/appointments', aptCtrl.createAppointment);
router.post('/appointments/:id/check-in', requireStaff, aptCtrl.checkInAppointment);
router.patch('/appointments/:id/reschedule', requireStaff, aptCtrl.rescheduleAppointment);
router.delete('/appointments/:id', requireStaff, aptCtrl.cancelAppointment);

// Queue Engine
router.get('/queue', queueCtrl.getQueueTokens);
router.get('/queue/summary', queueCtrl.getQueueSummary);
router.post('/queue/walk-in', requireStaff, queueCtrl.createWalkInToken);
router.post('/queue/call-next', requireStaff, queueCtrl.callNextToken);
router.post('/queue/recall', requireStaff, queueCtrl.recallToken);
router.post('/queue/complete', requireStaff, queueCtrl.completeToken);
router.post('/queue/no-show', requireStaff, queueCtrl.markNoShow);
router.post('/queue/priority', requireStaff, queueCtrl.reorderPriority);
router.get('/queue/token/:identifier', queueCtrl.getTokenStatus);

// Patient EHR & Medical Records
router.get('/patients/:phone/history', requireStaff, patientCtrl.getPatientHistory);
router.get('/prescriptions/:id', patientCtrl.getPrescriptionById);
router.get('/prescriptions/token/:identifier', patientCtrl.getPrescriptionByToken);

// Analytics & Reports
router.get('/analytics', analyticsCtrl.getAnalytics);
router.get('/notifications', analyticsCtrl.getNotificationsLog);
router.post('/analytics/reset', requireStaff, analyticsCtrl.resetData);
router.get('/schema/postgresql', analyticsCtrl.getPostgresSchema);

export default router;
