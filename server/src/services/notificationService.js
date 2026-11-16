import { db } from '../config/db.js';

const TRACK_BASE_URL = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

class NotificationService {
  constructor() {
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  dispatch(channel, { phone, message, type }, label) {
    let record;
    try {
      record = db.logNotification({
        recipientPhone: phone,
        channel,
        messageType: type,
        content: message,
        status: 'delivered'
      });
    } catch (err) {
      console.error(`\x1b[31m[${label} FAILED]\x1b[0m`, err.message);
      return null;
    }

    console.log(`\x1b[36m[${label}]\x1b[0m To: ${phone} | ${message}`);
    this.io?.emit('NOTIFICATION_DISPATCHED', record);
    return record;
  }

  sendSMS({ phone, message, type = 'SMS_ALERT' }) {
    return this.dispatch('SMS', { phone, message, type }, 'SMS DISPATCH');
  }

  sendWhatsApp({ phone, message, type = 'WHATSAPP_UPDATE' }) {
    return this.dispatch('WHATSAPP', { phone, message, type }, 'WHATSAPP CLOUD');
  }

  notifyBookingConfirmed(appointment, doctor) {
    const msg = `🏥 *MediQ Clinic*: Hello ${appointment.patientName}, your appointment with ${doctor.name} (${doctor.specialization}) is confirmed for ${appointment.appointmentDate} at ${appointment.slotTime}. Booking ID: ${appointment.appointmentNumber}. Please arrive 10 mins early.`;
    this.sendWhatsApp({ phone: appointment.patientPhone, message: msg, type: 'BOOKING_CONFIRMED' });
    this.sendSMS({ phone: appointment.patientPhone, message: `MediQ: Appointment confirmed with ${doctor.name} on ${appointment.appointmentDate} at ${appointment.slotTime}. Ref: ${appointment.appointmentNumber}`, type: 'BOOKING_CONFIRMED' });
  }

  notifyTokenGenerated(token, doctor) {
    const msg = `🎫 *MediQ Clinic*: Token Generated! Your Token is *${token.displayToken}* for ${doctor.name}, ${token.roomNumber}. Track your real-time queue position on your phone here: ${TRACK_BASE_URL}/track/${token.tokenNumber}`;
    this.sendWhatsApp({ phone: token.patientPhone, message: msg, type: 'TOKEN_GENERATED' });
  }

  notifyUpcomingTurn(token, doctor, tokensAhead) {
    const msg = `🔔 *MediQ Queue Alert*: Dear ${token.patientName}, you are now *${tokensAhead}* token(s) away from your consultation with ${doctor.name}. Please stay near ${token.roomNumber}.`;
    this.sendWhatsApp({ phone: token.patientPhone, message: msg, type: 'QUEUE_ALERT' });
    this.sendSMS({ phone: token.patientPhone, message: `MediQ: You are ${tokensAhead} token(s) away from ${doctor.name}. Proceed to ${token.roomNumber}.`, type: 'QUEUE_ALERT' });
  }

  notifyTokenCalled(token, doctor) {
    const msg = `📢 *IT'S YOUR TURN!* Token *${token.displayToken}* (${token.patientName}), please proceed immediately into ${token.roomNumber} for consultation with ${doctor.name}.`;
    this.sendWhatsApp({ phone: token.patientPhone, message: msg, type: 'TOKEN_CALLED' });
    this.sendSMS({ phone: token.patientPhone, message: `MediQ: Token ${token.displayToken} called! Please enter ${token.roomNumber} now.`, type: 'TOKEN_CALLED' });
  }
}

export const notificationService = new NotificationService();
