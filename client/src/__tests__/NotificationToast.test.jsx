import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const socketState = vi.hoisted(() => ({ value: {} }));

vi.mock('../context/SocketContext', () => ({
  useSocket: () => socketState.value
}));

import { NotificationToast } from '../components/NotificationToast';

describe('NotificationToast', () => {
  beforeEach(() => {
    socketState.value = { recentNotifications: [], dismissNotification: vi.fn() };
  });

  it('renders nothing visible when there are no notifications', () => {
    render(<NotificationToast />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText(/delivered/i)).toBeNull();
  });

  it('renders notification content and dismisses on click', () => {
    const dismissNotification = vi.fn();
    socketState.value = {
      dismissNotification,
      recentNotifications: [
        { id: 'n1', channel: 'WHATSAPP', recipientPhone: '+91 90000 00001', content: 'Your token is A-101' },
        { id: 'n2', channel: 'SMS', recipientPhone: '+91 90000 00002', content: 'It is your turn now' }
      ]
    };

    render(<NotificationToast />);

    expect(screen.getByText('Your token is A-101')).toBeInTheDocument();
    expect(screen.getByText('It is your turn now')).toBeInTheDocument();
    expect(screen.getByText('+91 90000 00001')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /dismiss/i })[0]);
    expect(dismissNotification).toHaveBeenCalledWith('n1');
  });
});
