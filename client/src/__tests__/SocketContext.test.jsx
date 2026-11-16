import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const fake = vi.hoisted(() => ({ socket: null }));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    const handlers = new Map();
    const managerHandlers = new Map();
    fake.socket = {
      connected: false,
      recovered: false,
      handlers,
      managerHandlers,
      on: vi.fn((event, fn) => { handlers.set(event, fn); return fake.socket; }),
      io: {
        on: vi.fn((event, fn) => managerHandlers.set(event, fn)),
        off: vi.fn()
      },
      emit: vi.fn(),
      connect: vi.fn(),
      close: vi.fn(),
      removeAllListeners: vi.fn()
    };
    return fake.socket;
  })
}));

vi.mock('../components/AudioChime', () => ({
  soundController: { isMuted: false, unlock: vi.fn(), toggleMute: vi.fn(() => true), playChime: vi.fn(), announceToken: vi.fn() }
}));

import { io } from 'socket.io-client';
import { SocketProvider, useSocket } from '../context/SocketContext';

const Harness = () => {
  const { connectionStatus, isConnected, latestCalledToken, recentNotifications } = useSocket();
  return (
    <div>
      <p data-testid="status">{connectionStatus}</p>
      <p data-testid="connected">{String(isConnected)}</p>
      <p data-testid="called">{latestCalledToken?.token?.displayToken || 'none'}</p>
      <p data-testid="notifs">{recentNotifications.length}</p>
    </div>
  );
};

const fire = (event, payload) => act(() => { fake.socket.handlers.get(event)(payload); });

describe('SocketContext', () => {
  beforeEach(() => {
    fake.socket = null;
    io.mockClear();
  });

  it('starts connecting and reflects connect and disconnect events', () => {
    render(<SocketProvider><Harness /></SocketProvider>);
    expect(io).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('status')).toHaveTextContent('connecting');
    expect(screen.getByTestId('connected')).toHaveTextContent('false');

    fire('connect');
    expect(screen.getByTestId('status')).toHaveTextContent('connected');
    expect(screen.getByTestId('connected')).toHaveTextContent('true');

    fire('disconnect');
    expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('connected')).toHaveTextContent('false');

    act(() => { fake.socket.managerHandlers.get('reconnect_attempt')(); });
    expect(screen.getByTestId('status')).toHaveTextContent('reconnecting');
  });

  it('tracks called tokens and dispatched notifications', () => {
    render(<SocketProvider><Harness /></SocketProvider>);
    fire('TOKEN_CALLED', { token: { displayToken: 'A-101' }, doctor: { name: 'Dr X', roomNumber: 'R1' } });
    expect(screen.getByTestId('called')).toHaveTextContent('A-101');

    fire('NOTIFICATION_DISPATCHED', { id: 'n1', content: 'hi' });
    fire('NOTIFICATION_DISPATCHED', { id: 'n1', content: 'hi again' });
    fire('NOTIFICATION_DISPATCHED', { id: 'n2', content: 'yo' });
    expect(screen.getByTestId('notifs')).toHaveTextContent('2');
  });

  it('closes the socket on unmount', () => {
    const { unmount } = render(<SocketProvider><Harness /></SocketProvider>);
    unmount();
    expect(fake.socket.close).toHaveBeenCalledTimes(1);
    expect(fake.socket.removeAllListeners).toHaveBeenCalledTimes(1);
  });
});
