export const DEFAULT_CONSULT_MINUTES = 12;

export const nowIso = () => new Date().toISOString();

export const minutesSince = (isoTime, min, fallback) => {
  if (!isoTime) return fallback;
  const start = new Date(isoTime).getTime();
  if (Number.isNaN(start)) return fallback;
  return Math.max(min, Math.round((Date.now() - start) / 60000));
};

export const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const todayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const isPastDate = (date) => date < todayLocal() && date < new Date().toISOString().slice(0, 10);

export const avgConsultMinutes = (tokens) => {
  const done = tokens.filter(t => t.status === 'completed' && t.serviceTimeMinutes > 0 && t.serviceTimeMinutes <= 120);
  if (!done.length) return DEFAULT_CONSULT_MINUTES;
  return Math.round(done.reduce((sum, t) => sum + t.serviceTimeMinutes, 0) / done.length);
};
