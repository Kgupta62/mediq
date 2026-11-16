import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../services/api';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api request wrapper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GETs the doctors endpoint and returns parsed JSON', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ doctors: [{ id: 'doc-1' }] }));

    const data = await api.getDoctors();

    expect(data.doctors).toEqual([{ id: 'doc-1' }]);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/doctors$/);
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('sends the stored auth token as a Bearer header', async () => {
    localStorage.setItem('mediq_auth_token', 'abc123');
    fetch.mockResolvedValueOnce(jsonResponse({ clinic: {} }));

    await api.getClinic();

    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123');
  });

  it('POSTs a JSON body when booking an appointment', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ appointment: { id: 'apt-1' } }, 201));
    const payload = { patientName: 'A', patientPhone: '1', doctorId: 'doc-1' };

    const data = await api.bookAppointment(payload);

    expect(data.appointment.id).toBe('apt-1');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/appointments$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it('serialises query params for list endpoints', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ tokens: [] }));

    await api.getQueue({ doctorId: 'doc-1', status: 'waiting' });

    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/queue\?doctorId=doc-1&status=waiting$/);
  });

  it('throws the server error message on a non-ok response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetch.mockResolvedValueOnce(jsonResponse({ error: 'Doctor not found' }, 404));

    await expect(api.getDoctorById('nope')).rejects.toThrow('Doctor not found');
  });
});
