import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const apiMock = vi.hoisted(() => ({
  getAnalytics: vi.fn(), getDoctors: vi.fn(), getQueue: vi.fn(), getFeedbackSummary: vi.fn(), getClinic: vi.fn(),
  updateClinic: vi.fn(), toggleDoctorAvailability: vi.fn(), createDoctor: vi.fn(), updateDoctor: vi.fn()
}));

vi.mock('../services/api', () => ({ api: apiMock }));
vi.mock('../context/SocketContext', () => ({ useSocket: () => ({ queueTick: 0 }) }));

import { AdminDashboardPage } from '../pages/AdminDashboardPage';

const now = new Date().toISOString();
const doctors = [
  { id: 'doc-1', name: 'Dr. Rajesh Sharma', title: 'Cardiologist', specialization: 'Cardiology', experience: '16 Years', roomNumber: 'Room 101', fee: 600, isAvailable: true, waitingCount: 3, currentServingToken: 'A-103' },
  { id: 'doc-2', name: 'Dr. Priya Patel', title: 'Physician', specialization: 'General Medicine', experience: '11 Years', roomNumber: 'Room 102', fee: 400, isAvailable: false, waitingCount: 0, currentServingToken: 'None' }
];

beforeEach(() => {
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  apiMock.getAnalytics.mockResolvedValue({ currentlyWaiting: 4, currentlyServing: 2, completedToday: 7, noShows: 1, avgWaitTimeMinutes: 13, avgConsultTimeMinutes: 9 });
  apiMock.getDoctors.mockResolvedValue({ doctors });
  apiMock.getQueue.mockResolvedValue({ tokens: [
    { id: 'tok-1', displayToken: 'A-101', patientName: 'Aarav Mehta', doctorId: 'doc-1', tokenType: 'appointment', priorityLevel: 1, status: 'completed', checkInTime: now, calledTime: now, completedTime: now, waitTimeMinutes: 14, serviceTimeMinutes: 15 },
    { id: 'tok-old', displayToken: 'T-050', patientName: 'Old Token', doctorId: 'doc-1', tokenType: 'walk_in', priorityLevel: 1, status: 'completed', checkInTime: '2020-01-01T10:00:00.000Z' }
  ] });
  apiMock.getFeedbackSummary.mockResolvedValue({ summary: { count: 3, averageRating: 4.7, latest: [{ id: 'fb-1', rating: 5, comment: 'Very smooth', patientName: 'Aarav Mehta', doctorName: 'Dr. Rajesh Sharma', created_at: now }] } });
  apiMock.getClinic.mockResolvedValue({ clinic: { name: 'MediQ Clinic', tagline: 'Smart OPD', address: '42 Health Ave', phone: '+91 98765', email: 'help@mediq.test', openTime: '08:00 AM', closeTime: '08:00 PM', activeNotice: 'Emergency first' } });
});

describe('AdminDashboardPage', () => {
  it('renders live stats, doctors, feedback and the daily report', async () => {
    render(<AdminDashboardPage clinic={{ name: 'MediQ Clinic' }} />);
    expect(screen.getByLabelText('Loading admin dashboard')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument());

    const stats = { Waiting: '4', Serving: '2', Completed: '7', 'No-shows': '1', 'Avg wait': '13', 'Avg consult': '9' };
    for (const [label, value] of Object.entries(stats)) {
      const card = screen.getAllByText(label).map((el) => el.closest('.stat-card')).find(Boolean);
      expect(within(card).getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText('Serving A-103')).toBeInTheDocument();
    expect(screen.getByText('Away')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Dr. Rajesh Sharma available' })).toBeChecked();
    expect(screen.getByText('4.7')).toBeInTheDocument();
    expect(screen.getByText('Very smooth')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MediQ Clinic')).toBeInTheDocument();
    expect(screen.getByText('A-101')).toBeInTheDocument();
    expect(screen.queryByText('T-050')).toBeNull();
    expect(screen.getByText('1 tokens')).toBeInTheDocument();
  });

  it('toggles doctor availability and saves clinic settings', async () => {
    apiMock.toggleDoctorAvailability.mockResolvedValue({ doctor: { ...doctors[1], isAvailable: true } });
    apiMock.updateClinic.mockResolvedValue({ clinic: { name: 'Renamed Clinic' } });
    const onClinicUpdated = vi.fn();
    render(<AdminDashboardPage onClinicUpdated={onClinicUpdated} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('switch', { name: 'Dr. Priya Patel available' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Dr. Priya Patel available' })).toBeChecked());
    expect(apiMock.toggleDoctorAvailability).toHaveBeenCalledWith('doc-2');

    fireEvent.change(screen.getByLabelText('Clinic name'), { target: { value: 'Renamed Clinic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Clinic settings saved.')).toBeInTheDocument());
    expect(apiMock.updateClinic).toHaveBeenCalledWith(expect.objectContaining({ name: 'Renamed Clinic', activeNotice: 'Emergency first' }));
    expect(onClinicUpdated).toHaveBeenCalledWith({ name: 'Renamed Clinic' });
  });

  it('adds a doctor through the sheet', async () => {
    apiMock.createDoctor.mockResolvedValue({ doctor: { id: 'doc-9', name: 'Dr. Kavya Rao', specialization: 'Dermatology', roomNumber: 'Room 104', fee: 450, isAvailable: true } });
    render(<AdminDashboardPage />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Add doctor' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Dr. Kavya Rao' } });
    fireEvent.change(within(dialog).getByLabelText('Specialization'), { target: { value: 'Dermatology' } });
    fireEvent.change(within(dialog).getByLabelText('Room number'), { target: { value: 'Room 104' } });
    fireEvent.change(within(dialog).getByLabelText('Consultation fee'), { target: { value: '450' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add doctor' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(apiMock.createDoctor).toHaveBeenCalledWith(expect.objectContaining({ name: 'Dr. Kavya Rao', specialization: 'Dermatology', roomNumber: 'Room 104', fee: 450 }));
    expect(screen.getAllByText('Dr. Kavya Rao')).toHaveLength(2);
  });
});
