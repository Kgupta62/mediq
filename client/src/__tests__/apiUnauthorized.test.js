import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, AUTH_TOKEN_KEY, AUTH_USER_KEY, UNAUTHORIZED_EVENT } from '../services/api';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api 401 handling', () => {
  let onUnauthorized;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    localStorage.setItem(AUTH_TOKEN_KEY, 'stale');
    localStorage.setItem(AUTH_USER_KEY, '{"id":"usr-1"}');
  });

  afterEach(() => {
    window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('clears storage and dispatches the unauthorized event on a 401 with a token', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ error: 'Invalid or expired token' }, 401));

    await expect(api.getQueueSummary()).rejects.toMatchObject({ status: 401, message: 'Invalid or expired token' });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not clear storage for a 401 on auth routes', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ error: 'Invalid email or password' }, 401));

    await expect(api.login({ email: 'a', password: 'b' })).rejects.toMatchObject({ status: 401 });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('stale');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not dispatch when no token was stored', async () => {
    localStorage.clear();
    fetch.mockResolvedValueOnce(jsonResponse({ error: 'Access token required' }, 401));

    await expect(api.getQueueSummary()).rejects.toMatchObject({ status: 401 });

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('leaves storage alone on other error statuses', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ error: 'Insufficient permissions' }, 403));

    await expect(api.getQueueSummary()).rejects.toMatchObject({ status: 403 });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('stale');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
