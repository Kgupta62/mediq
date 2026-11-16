import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const apiMock = vi.hoisted(() => ({ getClinic: vi.fn(), getTokenStatus: vi.fn(), getPrescriptionByToken: vi.fn() }));

vi.mock('../services/api', () => ({ api: apiMock }));
vi.mock('../context/SocketContext', () => ({ useSocket: () => ({ queueTick: 0 }) }));
vi.mock('../components/MedicalPrescriptionModal', () => ({ MedicalPrescriptionModal: () => null }));

import { PatientQueueTracker } from '../pages/PatientQueueTracker';

const statusPayload = (overrides = {}) => ({
  token: { id: 'tok-1', displayToken: 'A-104', patientName: 'Neha Gupta', status: 'waiting', roomNumber: 'Room 2', checkInTime: new Date().toISOString() },
  doctor: { name: 'Dr. Rajesh Sharma', specialization: 'Cardiology', roomNumber: 'Room 2' },
  currentServing: { displayToken: 'A-101' },
  tokensAhead: 3,
  estimatedWaitMins: 24,
  statusText: '3 patient(s) ahead of you',
  ...overrides
});

describe('PatientQueueTracker', () => {
  beforeEach(() => {
    apiMock.getClinic.mockResolvedValue({ clinic: { name: 'Test Clinic' } });
    apiMock.getTokenStatus.mockReset();
  });

  it('shows the loading skeleton, then the token card', async () => {
    let resolve;
    apiMock.getTokenStatus.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<PatientQueueTracker initialTokenNumber="104" />);

    expect(screen.getByLabelText('Loading token status')).toHaveAttribute('aria-busy', 'true');
    expect(apiMock.getTokenStatus).toHaveBeenCalledWith('104');

    resolve(statusPayload());
    await waitFor(() => expect(screen.getByLabelText('Token A-104')).toBeInTheDocument());

    expect(screen.queryByLabelText('Loading token status')).toBeNull();
    expect(screen.getByText('Neha Gupta')).toBeInTheDocument();
    expect(screen.getByText('2 people ahead of you')).toBeInTheDocument();
    expect(screen.getByText('A-101')).toBeInTheDocument();
    expect(screen.getByText('Dr. Rajesh Sharma')).toBeInTheDocument();
    expect(screen.getByText('In queue')).toBeInTheDocument();
  });

  it('highlights next-in-line and serving states', async () => {
    apiMock.getTokenStatus.mockResolvedValueOnce(statusPayload({ tokensAhead: 1 }));
    render(<PatientQueueTracker initialTokenNumber="104" />);
    await waitFor(() => expect(screen.getByText('You are next in line')).toBeInTheDocument());

    apiMock.getTokenStatus.mockResolvedValueOnce(statusPayload({ token: { ...statusPayload().token, status: 'serving' }, tokensAhead: 0 }));
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(screen.getByText('Please enter Room 2 now')).toBeInTheDocument());
    expect(screen.getByText('Your turn now')).toBeInTheDocument();
  });

  it('renders the error card when lookup fails', async () => {
    apiMock.getTokenStatus.mockRejectedValueOnce(new Error('Token not found or expired'));
    render(<PatientQueueTracker initialTokenNumber="999" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText('Token not found or expired')).toBeInTheDocument();
    expect(screen.queryByLabelText('Queue status')).toBeNull();
  });

  it('searches a new token from the form', async () => {
    apiMock.getTokenStatus.mockResolvedValue(statusPayload());
    render(<PatientQueueTracker initialTokenNumber="104" />);
    await waitFor(() => expect(screen.getByLabelText('Token A-104')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Token number or phone number'), { target: { value: ' 107 ' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(apiMock.getTokenStatus).toHaveBeenLastCalledWith('107'));
  });
});
