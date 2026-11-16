import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../context/SocketContext', () => ({
  useSocket: () => ({
    isConnected: true,
    connectionStatus: 'connected',
    isAudioMuted: false,
    toggleSound: vi.fn(),
    testChime: vi.fn()
  })
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loginAsReceptionist: vi.fn(),
    loginAsDoctor: vi.fn(),
    loginWithCredentials: vi.fn(),
    logout: vi.fn()
  })
}));

vi.mock('../services/api', () => ({
  api: { resetDemoData: vi.fn() }
}));

import { Navbar } from '../components/Navbar';

const clinic = { name: 'Test Clinic', tagline: 'Queue made simple', activeNotice: 'Emergency cases first' };

const tabButtons = (label) =>
  screen.getAllByText(label).map((el) => el.closest('button')).filter(Boolean);

describe('Navbar', () => {
  it('renders the brand and the main navigation tabs', () => {
    render(<Navbar activeTab="book" setActiveTab={() => {}} clinic={clinic} />);

    expect(screen.getAllByText(/MediQ/).length).toBeGreaterThan(0);
    expect(screen.getByText('Emergency cases first')).toBeInTheDocument();
    for (const label of [/^book/i, /^track/i, /^reception/i, /^doctor/i, /^analytics/i]) {
      expect(tabButtons(label).length).toBeGreaterThan(0);
    }
  });

  it('switches tabs when a nav button is clicked', () => {
    const setActiveTab = vi.fn();
    render(<Navbar activeTab="book" setActiveTab={setActiveTab} clinic={clinic} />);

    fireEvent.click(tabButtons(/^analytics/i)[0]);
    expect(setActiveTab).toHaveBeenCalledWith('analytics');
  });
});
