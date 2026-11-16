export const BACKEND_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}/api`;
const DEFAULT_TIMEOUT = 15000;
export const AUTH_TOKEN_KEY = 'mediq_auth_token';
export const AUTH_USER_KEY = 'mediq_user';
export const UNAUTHORIZED_EVENT = 'mediq:unauthorized';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function parseBody(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: res.ok ? 'Unexpected response from server' : text.slice(0, 200) };
  }
}

function clearStaleAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

async function send(endpoint, options, timeout) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  options.signal?.addEventListener('abort', () => controller.abort());

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, signal: controller.signal });
    const data = await parseBody(res);
    if (!res.ok) {
      if (res.status === 401 && token && !endpoint.startsWith('/auth/')) clearStaleAuth();
      throw new ApiError(data.error || data.message || `Request failed (${res.status})`, res.status, data);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError(options.signal?.aborted ? 'Request cancelled' : 'Request timed out. Please try again.', 0);
    }
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  } finally {
    clearTimeout(timer);
  }
}

async function request(endpoint, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, retries, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  let attemptsLeft = retries ?? (method === 'GET' ? 1 : 0);

  for (;;) {
    try {
      return await send(endpoint, fetchOptions, timeout);
    } catch (err) {
      const retryable = err.status === 0 && !fetchOptions.signal?.aborted && attemptsLeft > 0;
      if (!retryable) {
        if (import.meta.env.DEV) console.warn(`API ${method} ${endpoint}: ${err.message}`);
        throw err;
      }
      attemptsLeft -= 1;
      await sleep(400);
    }
  }
}

export const api = {
  getClinic: () => request('/clinic'),
  getDoctors: () => request('/doctors'),
  getDoctorById: (id) => request(`/doctors/${id}`),
  toggleDoctorAvailability: (id) => request(`/doctors/${id}/toggle`, { method: 'PATCH' }),

  getAppointments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/appointments${query ? `?${query}` : ''}`);
  },
  bookAppointment: (payload) => request('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  checkInAppointment: (appointmentId) => request(`/appointments/${appointmentId}/check-in`, {
    method: 'POST'
  }),
  rescheduleAppointment: (appointmentId, payload) => request(`/appointments/${appointmentId}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }),
  cancelAppointment: (id) => request(`/appointments/${id}`, {
    method: 'DELETE'
  }),

  getQueue: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/queue${query ? `?${query}` : ''}`);
  },
  getQueueSummary: () => request('/queue/summary'),
  createWalkInToken: (payload) => request('/queue/walk-in', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  callNextToken: (doctorId, specificTokenId = null) => request('/queue/call-next', {
    method: 'POST',
    body: JSON.stringify({ doctorId, specificTokenId })
  }),
  recallToken: (tokenId) => request('/queue/recall', {
    method: 'POST',
    body: JSON.stringify({ tokenId })
  }),
  completeToken: (payload) => request('/queue/complete', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  markNoShow: (tokenId) => request('/queue/no-show', {
    method: 'POST',
    body: JSON.stringify({ tokenId })
  }),
  reorderPriority: (payload) => request('/queue/priority', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getTokenStatus: (identifier) => request(`/queue/token/${encodeURIComponent(identifier)}`),

  getPatientHistory: (phone) => request(`/patients/${encodeURIComponent(phone)}/history`),
  getPrescriptionByToken: (identifier) => request(`/prescriptions/token/${encodeURIComponent(identifier)}`),
  getPrescriptionById: (id) => request(`/prescriptions/${id}`),

  getAnalytics: () => request('/analytics'),
  getNotifications: (limit = 20) => request(`/notifications?limit=${limit}`),
  resetDemoData: () => request('/analytics/reset', { method: 'POST', timeout: 30000 }),

  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  verifyOTP: (payload) => request('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
};
