import { badRequest } from './errors.js';

const GENDERS = ['Male', 'Female', 'Other'];
const TOKEN_STATUSES = ['waiting', 'called', 'serving', 'completed', 'no_show'];
const APPOINTMENT_STATUSES = ['booked', 'checked_in', 'completed', 'cancelled'];

const clean = (value) => value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

export const requireText = (value, label, max = 120) => {
  if (typeof value !== 'string' || !clean(value)) throw badRequest(`${label} is required`);
  const text = clean(value);
  if (text.length > max) throw badRequest(`${label} must be at most ${max} characters`);
  return text;
};

export const optionalText = (value, fallback = '', max = 2000) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') throw badRequest('Expected a text value');
  const text = clean(value);
  if (text.length > max) throw badRequest(`Text must be at most ${max} characters`);
  return text || fallback;
};

export const requireId = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw badRequest(`${label} is required`);
  return value.trim();
};

export const normalizePhone = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  const local = digits.length === 10 ? digits : digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : null;
  return local ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : String(phone).trim();
};

export const requirePhone = (value) => {
  const phone = requireText(value, 'Patient phone', 20);
  const digits = phone.replace(/\D/g, '');
  if (!/^\+?[\d\s()-]+$/.test(phone) || digits.length < 10 || digits.length > 15) {
    throw badRequest('Patient phone must contain 10 to 15 digits');
  }
  return normalizePhone(phone);
};

export const optionalAge = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const age = Number(value);
  if (!Number.isInteger(age) || age < 0 || age > 130) throw badRequest('Patient age must be a whole number between 0 and 130');
  return age;
};

export const optionalGender = (value) => {
  if (value === undefined || value === null || value === '') return 'Other';
  if (!GENDERS.includes(value)) throw badRequest(`Patient gender must be one of: ${GENDERS.join(', ')}`);
  return value;
};

export const requireDate = (value, label) => {
  const text = requireText(value, label, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw badRequest(`${label} must be in YYYY-MM-DD format`);
  const parsed = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  if (parsed.toISOString().slice(0, 10) !== text) throw badRequest(`${label} is not a valid calendar date`);
  return text;
};

export const requireSlot = (value) => {
  const slot = requireText(value, 'Slot time', 10);
  if (!/^(0?[1-9]|1[0-2]):[0-5]\d (AM|PM)$/i.test(slot)) throw badRequest('Slot time must look like 09:30 AM');
  return slot;
};

export const optionalEnum = (value, allowed, label) => {
  if (value === undefined || value === '') return undefined;
  if (!allowed.includes(value)) throw badRequest(`${label} must be one of: ${allowed.join(', ')}`);
  return value;
};

export const tokenStatus = (value) => optionalEnum(value, TOKEN_STATUSES, 'Status');
export const appointmentStatus = (value) => optionalEnum(value, APPOINTMENT_STATUSES, 'Status');

export const optionalObject = (value, label) => {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw badRequest(`${label} must be an object`);
  return value;
};
