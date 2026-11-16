import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, User, Stethoscope, Clock } from 'lucide-react';
import { api } from '../services/api';

export const RescheduleModal = ({ isOpen, onClose, appointment, onRescheduled }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [newDate, setNewDate] = useState(appointment?.appointmentDate || todayStr);
  const [newSlot, setNewSlot] = useState(appointment?.slotTime || '10:00 AM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !appointment) return;
    setNewDate(appointment.appointmentDate || todayStr);
    setNewSlot(appointment.slotTime || '10:00 AM');
    setError('');
  }, [isOpen, appointment]);

  const slots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
    '06:00 PM', '06:30 PM', '07:00 PM'
  ];

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !appointment) return null;

  const unchanged = newDate === appointment.appointmentDate && newSlot === appointment.slotTime;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const res = await api.rescheduleAppointment(appointment.id, {
        appointmentDate: newDate,
        slotTime: newSlot
      });
      if (onRescheduled) onRescheduled(res.appointment);
      onClose();
    } catch (err) {
      setError(err.message || 'We could not move this appointment. Check the date and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/35 animate-fade-in"
      onClick={() => !loading && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
        onClick={(e) => e.stopPropagation()}
        className="glass relative w-full sm:max-w-lg rounded-t-sheet sm:rounded-sheet overflow-hidden max-h-[92vh] flex flex-col animate-slide-up sm:animate-scale-in"
      >
        <div className="px-5 pt-3 pb-3 flex items-center justify-between gap-3">
          <div className="w-9 h-1 rounded-full bg-tertiary absolute inset-x-0 mx-auto top-2 sm:hidden" aria-hidden="true" />
          <h3 id="reschedule-title" className="text-headline text-label pt-2 sm:pt-0">Reschedule appointment</h3>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Close" className="btn-ghost btn-icon rounded-full">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-5 overflow-y-auto">
          <dl className="list-inset text-subheadline">
            <div className="list-row">
              <span className="icon-tile icon-tile-gray"><User size={16} aria-hidden="true" /></span>
              <dt className="sr-only">Patient</dt>
              <dd className="flex-1 min-w-0 truncate text-label">{appointment.patientName}</dd>
              <dd className="text-secondary tabular shrink-0">{appointment.patientPhone}</dd>
            </div>
            <div className="list-row">
              <span className="icon-tile icon-tile-indigo"><Stethoscope size={16} aria-hidden="true" /></span>
              <dt className="sr-only">Doctor</dt>
              <dd className="flex-1 min-w-0 truncate text-label">{appointment.doctorName}</dd>
              <dd className="text-secondary tabular shrink-0">{appointment.appointmentNumber}</dd>
            </div>
            <div className="list-row">
              <span className="icon-tile icon-tile-orange"><Clock size={16} aria-hidden="true" /></span>
              <dt className="text-secondary shrink-0">Current</dt>
              <dd className="flex-1 text-right text-label tabular">{appointment.appointmentDate} at {appointment.slotTime}</dd>
            </div>
          </dl>

          {error && (
            <div role="alert" className="p-3 rounded-control bg-red-tint text-footnote text-red flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" aria-hidden="true" /> {error}
            </div>
          )}

          <div>
            <label htmlFor="reschedule-date" className="input-label">New date</label>
            <input
              id="reschedule-date"
              type="date"
              min={todayStr}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="input-base"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span id="reschedule-slot-label" className="input-label mb-0">New time</span>
              <span className="text-subheadline text-accent tabular">{newSlot}</span>
            </div>
            <div role="radiogroup" aria-labelledby="reschedule-slot-label" className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-0.5">
              {slots.map((s) => {
                const active = newSlot === s;
                return (
                  <button
                    type="button"
                    key={s}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setNewSlot(s)}
                    className={`min-h-[44px] px-4 rounded-full text-subheadline font-semibold tabular transition-colors duration-150 active:scale-[0.97] ${
                      active ? 'bg-accent text-white' : 'bg-fill text-label hover:bg-separator'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-1 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button type="button" onClick={onClose} disabled={loading} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || unchanged} className="btn-primary">
              {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {loading ? 'Rescheduling' : 'Confirm new time'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
