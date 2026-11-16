import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, AUTH_TOKEN_KEY, AUTH_USER_KEY, UNAUTHORIZED_EVENT } from '../services/api';

const AuthContext = createContext(null);

function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function clearStorage() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function loadSession() {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null');
    const expiresAt = token ? tokenExpiry(token) : null;
    if (token && user && (!expiresAt || expiresAt > Date.now())) return { token, user };
  } catch {
    /* corrupt storage, fall through */
  }
  clearStorage();
  return { token: null, user: null };
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(loadSession);
  const { user, token } = session;

  const logout = useCallback(() => {
    clearStorage();
    setSession({ token: null, user: null });
  }, []);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  useEffect(() => {
    if (!token) return undefined;
    const expiresAt = tokenExpiry(token);
    if (!expiresAt) return undefined;
    const timer = setTimeout(logout, Math.min(expiresAt - Date.now(), 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [token, logout]);

  const loginWithCredentials = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    setSession({ token: data.token, user: data.user });
    return data.user;
  }, []);

  const loginAsReceptionist = useCallback(
    () => loginWithCredentials('receptionist@clinic.com', 'password123'),
    [loginWithCredentials]
  );

  const loginAsDoctor = useCallback((doctorId = 'doc-1') => {
    const email = doctorId === 'doc-2' ? 'doctor.patel@clinic.com' :
                  doctorId === 'doc-3' ? 'doctor.ananya@clinic.com' : 'doctor.sharma@clinic.com';
    return loginWithCredentials(email, 'password123');
  }, [loginWithCredentials]);

  const loginAsAdmin = useCallback(
    () => loginWithCredentials('admin@clinic.com', 'password123'),
    [loginWithCredentials]
  );

  const value = useMemo(() => ({
    user,
    token,
    loginWithCredentials,
    loginAsReceptionist,
    loginAsDoctor,
    loginAsAdmin,
    logout,
    isAuthenticated: !!user,
    isReceptionist: user?.role === 'receptionist',
    isDoctor: user?.role === 'doctor',
    isAdmin: user?.role === 'admin'
  }), [user, token, loginWithCredentials, loginAsReceptionist, loginAsDoctor, loginAsAdmin, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
