import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const apiMock = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('../services/api', () => ({
  api: apiMock,
  AUTH_TOKEN_KEY: 'mediq_auth_token',
  AUTH_USER_KEY: 'mediq_user',
  UNAUTHORIZED_EVENT: 'mediq:unauthorized'
}));

import { AuthProvider, useAuth } from '../context/AuthContext';

const b64url = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const makeJwt = (exp) => `${b64url({ alg: 'HS256' })}.${b64url({ sub: 'usr-1', exp })}.sig`;
const user = { id: 'usr-1', name: 'Sunita', role: 'receptionist' };

const Harness = () => {
  const auth = useAuth();
  return (
    <div>
      <p data-testid="user">{auth.user ? auth.user.name : 'anonymous'}</p>
      <p data-testid="flags">{`${auth.isAuthenticated}:${auth.isReceptionist}:${auth.isDoctor}`}</p>
      <button onClick={() => auth.loginAsReceptionist()}>login</button>
      <button onClick={() => auth.loginAsDoctor('doc-2')}>login doctor</button>
      <button onClick={auth.logout}>logout</button>
    </div>
  );
};

const renderAuth = () => render(<AuthProvider><Harness /></AuthProvider>);

describe('AuthContext', () => {
  beforeEach(() => {
    apiMock.login.mockReset();
  });

  it('starts anonymous and stores the session on login', async () => {
    const token = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    apiMock.login.mockResolvedValue({ token, user });
    renderAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');

    await act(async () => { fireEvent.click(screen.getByText('login')); });

    expect(apiMock.login).toHaveBeenCalledWith({ email: 'receptionist@clinic.com', password: 'password123' });
    expect(screen.getByTestId('user')).toHaveTextContent('Sunita');
    expect(screen.getByTestId('flags')).toHaveTextContent('true:true:false');
    expect(localStorage.getItem('mediq_auth_token')).toBe(token);
    expect(JSON.parse(localStorage.getItem('mediq_user'))).toEqual(user);
  });

  it('maps doctor ids to the right login email', async () => {
    apiMock.login.mockResolvedValue({ token: 'x.y.z', user: { ...user, role: 'doctor' } });
    renderAuth();
    await act(async () => { fireEvent.click(screen.getByText('login doctor')); });
    expect(apiMock.login).toHaveBeenCalledWith({ email: 'doctor.patel@clinic.com', password: 'password123' });
    expect(screen.getByTestId('flags')).toHaveTextContent('true:false:true');
  });

  it('logout clears storage and state', async () => {
    apiMock.login.mockResolvedValue({ token: 'x.y.z', user });
    renderAuth();
    await act(async () => { fireEvent.click(screen.getByText('login')); });
    fireEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    expect(localStorage.getItem('mediq_auth_token')).toBeNull();
    expect(localStorage.getItem('mediq_user')).toBeNull();
  });

  it('restores a valid stored session on load', () => {
    localStorage.setItem('mediq_auth_token', makeJwt(Math.floor(Date.now() / 1000) + 3600));
    localStorage.setItem('mediq_user', JSON.stringify(user));
    renderAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('Sunita');
  });

  it('discards an expired JWT on load', () => {
    localStorage.setItem('mediq_auth_token', makeJwt(Math.floor(Date.now() / 1000) - 60));
    localStorage.setItem('mediq_user', JSON.stringify(user));
    renderAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    expect(localStorage.getItem('mediq_auth_token')).toBeNull();
    expect(localStorage.getItem('mediq_user')).toBeNull();
  });

  it('discards corrupt stored user JSON', () => {
    localStorage.setItem('mediq_auth_token', 'x.y.z');
    localStorage.setItem('mediq_user', '{not json');
    renderAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    expect(localStorage.getItem('mediq_auth_token')).toBeNull();
  });

  it('logs out when the unauthorized event fires', () => {
    localStorage.setItem('mediq_auth_token', 'x.y.z');
    localStorage.setItem('mediq_user', JSON.stringify(user));
    renderAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('Sunita');
    act(() => { window.dispatchEvent(new Event('mediq:unauthorized')); });
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
  });
});
