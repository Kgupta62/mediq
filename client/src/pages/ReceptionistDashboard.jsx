import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { PrintTokenModal } from '../components/PrintTokenModal';
import { RescheduleModal } from '../components/RescheduleModal';
import { PatientHistoryModal } from '../components/PatientHistoryModal';
import {
  UserPlus,
  CalendarCheck,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  RefreshCw,
  Calendar,
  XCircle,
  History,
  Inbox,
  X,
  Loader2,
  Circle,
  Ban,
  Stethoscope
} from 'lucide-react';

const EMPTY_WALK_IN = {
  patientName: '',
  patientPhone: '',
  patientAge: '',
  patientGender: 'Male',
  doctorId: '',
  reason: '',
  isEmergency: false,
  isSenior: false
};

const BTN = {
  primary: 'btn-primary btn-sm',
  secondary: 'btn-secondary btn-sm',
  danger: 'btn-danger btn-sm',
  dangerSoft: 'btn-danger-soft btn-sm',
  ghost: 'btn-ghost btn-sm',
  icon: 'btn-ghost btn-icon'
};
const shortRoom = (room) => (room || '').replace(/\s*\(.*\)\s*$/, '');
const todayStr = () => new Date().toISOString().split('T')[0];
const ROW_FOCUS = 'focus:outline-none focus-visible:bg-surface-secondary focus-visible:shadow-[inset_3px_0_0_0_var(--accent)]';

const STATUS = {
  waiting: { label: 'Waiting', icon: Clock, cls: 'badge-cyan' },
  called: { label: 'Called', icon: Circle, cls: 'badge-indigo' },
  serving: { label: 'In consultation', icon: Stethoscope, cls: 'badge-emerald', live: true },
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'badge-slate' },
  no_show: { label: 'No show', icon: Ban, cls: 'badge-rose' },
  cancelled: { label: 'Cancelled', icon: XCircle, cls: 'badge-rose' },
  checked_in: { label: 'Checked in', icon: CheckCircle2, cls: 'badge-emerald' },
  booked: { label: 'Booked', icon: Calendar, cls: 'badge-cyan' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, cls: 'badge-cyan' }
};

const StatusBadge = ({ status }) => {
  const s = STATUS[status] || { label: String(status || '').replace('_', ' '), icon: Circle, cls: 'badge-slate' };
  const Icon = s.icon;
  return (
    <span className={`${s.cls} px-2.5 py-1`}>
      {s.live
        ? <span className="w-2 h-2 rounded-full bg-green animate-pulse" aria-hidden="true" />
        : <Icon size={12} aria-hidden="true" />}
      {s.label}
    </span>
  );
};

const PriorityBadge = ({ token }) => {
  if (token.priorityLevel === 3) {
    return (
      <span className="badge-rose px-2.5 py-1">
        <Flame size={12} aria-hidden="true" /> Emergency
      </span>
    );
  }
  if (token.priorityLevel === 2) {
    return <span className="badge-amber px-2.5 py-1">Senior</span>;
  }
  return (
    <span className="badge-slate px-2.5 py-1 font-medium">
      {token.tokenType === 'appointment' ? 'Appointment' : 'Walk-in'}
    </span>
  );
};

const ErrorBanner = ({ message, onDismiss, onRetry }) => {
  if (!message) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2.5 px-3.5 py-2.5 rounded-control bg-red-tint text-subheadline text-red">
      <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0 py-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-danger-soft btn-sm">
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="btn-ghost btn-icon text-red -my-2 -mr-2">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

const EmptyRow = ({ colSpan, icon: Icon, title, hint }) => (
  <tr>
    <td colSpan={colSpan} className="py-12 text-center whitespace-normal">
      <Icon size={28} className="mx-auto text-tertiary mb-2" aria-hidden="true" />
      <p className="text-headline text-label">{title}</p>
      {hint && <p className="text-footnote text-secondary mt-1">{hint}</p>}
    </td>
  </tr>
);

const SkeletonRows = ({ colSpan, rows = 4 }) =>
  Array.from({ length: rows }).map((_, i) => (
    <tr key={i} aria-hidden="true">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="h-10 skeleton" />
      </td>
    </tr>
  ));

const CardHeader = ({ icon: Icon, tone = '', title, children }) => (
  <div className="card-header">
    <h3 className="text-headline text-label flex items-center gap-2.5">
      <span className={`icon-tile ${tone}`} aria-hidden="true"><Icon size={16} /></span>
      {title}
    </h3>
    {children}
  </div>
);

const moveRowFocus = (e) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const row = e.target.closest('tr[tabindex]');
  if (!row) return;
  const next = e.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling;
  if (next?.hasAttribute('tabindex')) {
    e.preventDefault();
    next.focus();
  }
};

const DoctorRoster = ({ doctors, queueTokens }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {doctors.map((doc) => {
      const waiting = queueTokens.filter(t => t.doctorId === doc.id && t.status === 'waiting').length;
      const serving = queueTokens.find(t => t.doctorId === doc.id && (t.status === 'serving' || t.status === 'called'));
      return (
        <div key={doc.id} className="stat-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`icon-tile ${serving ? 'icon-tile-green' : 'icon-tile-gray'}`} aria-hidden="true">
              <Stethoscope size={16} />
            </span>
            <div className="min-w-0">
              <h4 className="text-subheadline font-semibold text-label truncate">{doc.name}</h4>
              <p className="text-footnote text-secondary truncate">{doc.specialization} · {shortRoom(doc.roomNumber)}</p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 mt-3">
            <div>
              <span className="section-title block">Serving</span>
              <span className={`token-badge text-title2 ${serving ? 'text-green' : 'text-tertiary'}`}>
                {serving ? serving.displayToken : 'None'}
              </span>
            </div>
            <span className="text-subheadline text-secondary tabular">{waiting} waiting</span>
          </div>
        </div>
      );
    })}
  </div>
);

const QueueTable = ({ tokens, doctors, loading, onRefresh, onPriorityToggle, onPrint, busyId }) => (
  <div className="card overflow-hidden">
    <CardHeader icon={Clock} title="Live clinic queue">
      <button type="button" onClick={onRefresh} disabled={loading} className={BTN.ghost}>
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
      </button>
    </CardHeader>
    <div className="overflow-x-auto">
      <table className="table-base min-w-[760px]" onKeyDown={moveRowFocus}>
        <caption className="sr-only">Live clinic queue. Use the up and down arrow keys to move between rows.</caption>
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Patient</th>
            <th scope="col">Doctor</th>
            <th scope="col">Priority</th>
            <th scope="col">Status</th>
            <th scope="col" className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && tokens.length === 0 ? (
            <SkeletonRows colSpan={6} />
          ) : tokens.length === 0 ? (
            <EmptyRow colSpan={6} icon={Inbox} title="No tokens issued today" hint="Walk-in tokens and checked-in bookings will appear here as they are issued." />
          ) : (
            tokens.map((tok) => {
              const doc = doctors.find(d => d.id === tok.doctorId);
              const isEmergency = tok.priorityLevel === 3;
              const rowTint = tok.status === 'serving' ? 'bg-green-tint' : isEmergency ? 'bg-red-tint' : '';
              return (
                <tr key={tok.id} tabIndex={0} className={`${ROW_FOCUS} ${rowTint}`}>
                  <td>
                    <span className="token-badge text-callout text-accent">{tok.displayToken}</span>
                  </td>
                  <td>
                    <div className="font-semibold text-label">{tok.patientName}</div>
                    <div className="text-footnote text-secondary tabular">
                      {tok.patientPhone}{tok.patientAge ? ` · ${tok.patientAge} yrs` : ''}
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-label">{doc?.name || 'Doctor'}</div>
                    <div className="text-footnote text-secondary">{tok.roomNumber}</div>
                  </td>
                  <td><PriorityBadge token={tok} /></td>
                  <td><StatusBadge status={tok.status} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      {tok.status === 'waiting' && (
                        <button
                          type="button"
                          onClick={() => onPriorityToggle(tok.id, !isEmergency, false)}
                          disabled={busyId === tok.id}
                          aria-pressed={isEmergency}
                          aria-label={isEmergency ? `Clear emergency priority for ${tok.patientName}` : `Mark ${tok.patientName} as emergency`}
                          className={isEmergency ? BTN.dangerSoft : BTN.secondary}
                        >
                          {busyId === tok.id
                            ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                            : <Flame size={14} className="text-red" aria-hidden="true" />}
                          {isEmergency ? 'Clear emergency' : 'Emergency'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onPrint(tok)}
                        aria-label={`Print token slip ${tok.displayToken}`}
                        className={BTN.ghost}
                      >
                        <Printer size={14} aria-hidden="true" /> Print
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className="block">
      <span className="input-label">
        {label} {required && <span className="text-red" aria-hidden="true">*</span>}
      </span>
      {children}
    </label>
  </div>
);

const WalkInForm = ({ doctors, data, setData, onSubmit, submitting, error, onDismissError }) => (
  <div className="max-w-2xl mx-auto card overflow-hidden">
    <div className="card-header">
      <div className="flex items-center gap-3 min-w-0">
        <span className="icon-tile w-10 h-10 rounded-control" aria-hidden="true">
          <UserPlus size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-headline text-label">Walk-in token</h2>
          <p className="text-footnote text-secondary">Issue a token slip for a patient arriving without a booking.</p>
        </div>
      </div>
    </div>

    <form onSubmit={onSubmit} className="card-body space-y-5" noValidate>
      <ErrorBanner message={error} onDismiss={onDismissError} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Patient full name" required>
          <input
            type="text"
            required
            autoComplete="off"
            placeholder="e.g. Ramesh Chandra"
            value={data.patientName}
            onChange={(e) => setData(prev => ({ ...prev, patientName: e.target.value }))}
            className="input-base"
          />
        </Field>
        <Field label="Mobile number" required>
          <input
            type="tel"
            required
            inputMode="tel"
            placeholder="+91 98765 00000"
            value={data.patientPhone}
            onChange={(e) => setData(prev => ({ ...prev, patientPhone: e.target.value }))}
            className="input-base tabular"
          />
        </Field>
        <div>
          <span className="input-label">Age and gender</span>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              max="120"
              aria-label="Age"
              placeholder="Age"
              value={data.patientAge}
              onChange={(e) => setData(prev => ({ ...prev, patientAge: e.target.value }))}
              className="input-base w-24 tabular"
            />
            <select
              aria-label="Gender"
              value={data.patientGender}
              onChange={(e) => setData(prev => ({ ...prev, patientGender: e.target.value }))}
              className="input-base flex-1"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <Field label="Doctor OPD" required>
          <select
            required
            value={data.doctorId}
            onChange={(e) => setData(prev => ({ ...prev, doctorId: e.target.value }))}
            className="input-base"
          >
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.specialization}, {shortRoom(d.roomNumber)})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Chief complaint">
        <input
          type="text"
          placeholder="e.g. Fever, chest discomfort, dressing change, follow-up"
          value={data.reason}
          onChange={(e) => setData(prev => ({ ...prev, reason: e.target.value }))}
          className="input-base"
        />
      </Field>

      <fieldset>
        <legend className="section-title mb-2">Priority</legend>
        <div className="list-inset">
          <label className="list-row cursor-pointer justify-between">
            <span className={`flex items-center gap-2 text-subheadline font-semibold ${data.isEmergency ? 'text-red' : 'text-label'}`}>
              <Flame size={15} className="text-red" aria-hidden="true" /> Emergency (front of queue)
            </span>
            <input
              type="checkbox"
              checked={data.isEmergency}
              onChange={(e) => setData(prev => ({ ...prev, isEmergency: e.target.checked }))}
              className="w-5 h-5 shrink-0 accent-red"
            />
          </label>
          <label className="list-row cursor-pointer justify-between">
            <span className={`text-subheadline font-semibold ${data.isSenior ? 'text-orange' : 'text-label'}`}>
              Senior citizen priority
            </span>
            <input
              type="checkbox"
              checked={data.isSenior}
              onChange={(e) => setData(prev => ({ ...prev, isSenior: e.target.checked }))}
              className="w-5 h-5 shrink-0 accent-orange"
            />
          </label>
        </div>
      </fieldset>

      <div className="pt-1">
        <button type="submit" disabled={submitting} className="btn-primary btn-lg w-full">
          {submitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Printer size={18} aria-hidden="true" />}
          {submitting ? 'Issuing token...' : 'Issue and print token'}
        </button>
      </div>
    </form>
  </div>
);

const AppointmentActions = ({ apt, busy, confirming, onCheckIn, onReschedule, onAskCancel, onConfirmCancel, onKeep, onHistory }) => {
  const tokenLabel = apt.displayToken || apt.tokenNumber;
  if (apt.status === 'checked_in' && tokenLabel) {
    return (
      <span className="text-subheadline text-green font-semibold tabular inline-flex items-center gap-1.5">
        <CheckCircle2 size={14} aria-hidden="true" /> Token {tokenLabel}
      </span>
    );
  }
  if (apt.status === 'checked_in' || apt.status === 'completed' || apt.status === 'cancelled') {
    return <span className="text-subheadline text-tertiary">No actions</span>;
  }
  if (confirming) {
    return (
      <div role="group" aria-label="Confirm cancellation" className="inline-flex items-center gap-2 flex-wrap justify-end">
        <span className="text-subheadline text-red font-medium">Cancel {apt.patientName}'s booking? This can't be undone.</span>
        <button type="button" onClick={onKeep} disabled={busy} className={BTN.secondary}>Keep booking</button>
        <button type="button" onClick={onConfirmCancel} disabled={busy} className={BTN.danger}>
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />} Cancel booking
        </button>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1">
      <button type="button" onClick={onCheckIn} disabled={busy} className={`${BTN.primary} mr-1`}>
        {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />} Check in
      </button>
      <button type="button" onClick={onHistory} aria-label={`Patient history for ${apt.patientName}`} title="Patient history" className={BTN.icon}>
        <History size={18} />
      </button>
      <button type="button" onClick={onReschedule} aria-label={`Reschedule ${apt.patientName}'s booking`} title="Reschedule" className={`${BTN.icon} text-orange`}>
        <Calendar size={18} />
      </button>
      <button type="button" onClick={onAskCancel} aria-label={`Cancel ${apt.patientName}'s booking`} title="Cancel booking" className={`${BTN.icon} text-red`}>
        <XCircle size={18} />
      </button>
    </div>
  );
};

const AppointmentsTable = ({ appointments, doctors, loading, busyId, confirmCancelId, setConfirmCancelId, onCheckIn, onReschedule, onCancel, onHistory }) => (
  <div className="card overflow-hidden">
    <CardHeader icon={CalendarCheck} tone="icon-tile-indigo" title="Bookings">
      <span className="text-subheadline text-secondary tabular">{appointments.length} total</span>
    </CardHeader>
    <div className="overflow-x-auto">
      <table className="table-base min-w-[820px]" onKeyDown={moveRowFocus}>
        <caption className="sr-only">Bookings. Use the up and down arrow keys to move between rows.</caption>
        <thead>
          <tr>
            <th scope="col">Ref</th>
            <th scope="col">Patient</th>
            <th scope="col">Doctor</th>
            <th scope="col">Slot</th>
            <th scope="col">Status</th>
            <th scope="col" className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && appointments.length === 0 ? (
            <SkeletonRows colSpan={6} />
          ) : appointments.length === 0 ? (
            <EmptyRow colSpan={6} icon={CalendarCheck} title="No bookings for today" hint="Online bookings for today will show up here, ready for check-in." />
          ) : (
            appointments.map((apt) => {
              const doc = doctors.find(d => d.id === apt.doctorId);
              return (
              <tr key={apt.id} tabIndex={0} className={`${ROW_FOCUS} ${confirmCancelId === apt.id ? 'bg-red-tint' : ''}`}>
                <td className="token-badge text-accent">{apt.appointmentNumber}</td>
                <td>
                  <div className="font-semibold text-label">{apt.patientName}</div>
                  <div className="text-footnote text-secondary tabular">{apt.patientPhone}</div>
                </td>
                <td>
                  <div className="font-medium text-label">{apt.doctorName || doc?.name || 'Doctor'}</div>
                  <div className="text-footnote text-secondary">{apt.roomNumber || doc?.roomNumber || ''}</div>
                </td>
                <td className="font-semibold text-label tabular">
                  {apt.slotTime}
                  {apt.appointmentDate && apt.appointmentDate !== todayStr() && (
                    <div className="text-footnote font-normal text-secondary">{apt.appointmentDate}</div>
                  )}
                </td>
                <td><StatusBadge status={apt.status} /></td>
                <td className="text-right">
                  <AppointmentActions
                    apt={apt}
                    busy={busyId === apt.id}
                    confirming={confirmCancelId === apt.id}
                    onCheckIn={() => onCheckIn(apt.id)}
                    onReschedule={() => onReschedule(apt)}
                    onAskCancel={() => setConfirmCancelId(apt.id)}
                    onKeep={() => setConfirmCancelId(null)}
                    onConfirmCancel={() => onCancel(apt.id)}
                    onHistory={() => onHistory(apt.patientPhone, apt.patientName)}
                  />
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export const ReceptionistDashboard = ({ clinic, onNavigateToTracker }) => {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [queueTokens, setQueueTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');

  const [walkInData, setWalkInData] = useState(EMPTY_WALK_IN);
  const [walkInError, setWalkInError] = useState('');
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);

  const [printedToken, setPrintedToken] = useState(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAptToReschedule, setSelectedAptToReschedule] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyPhone, setHistoryPhone] = useState('');
  const [historyPatientName, setHistoryPatientName] = useState('');

  const { queueTick } = useSocket();

  useEffect(() => {
    loadData();
  }, [queueTick]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docRes, aptRes, queueRes] = await Promise.all([
        api.getDoctors(),
        api.getAppointments(),
        api.getQueue()
      ]);
      setDoctors(docRes.doctors || []);
      setAppointments(aptRes.appointments || []);
      setQueueTokens(queueRes.tokens || []);
      setError('');

      if (docRes.doctors && docRes.doctors.length > 0 && !walkInData.doctorId) {
        setWalkInData(prev => ({ ...prev, doctorId: docRes.doctors[0].id }));
      }
    } catch (err) {
      setError(err.message || 'Could not load the front desk data. Check the server connection and refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (!walkInData.patientName || !walkInData.patientPhone || !walkInData.doctorId) {
      setWalkInError('Enter the patient name, mobile number and doctor to issue a token.');
      return;
    }
    try {
      setWalkInSubmitting(true);
      setWalkInError('');
      const res = await api.createWalkInToken(walkInData);
      setPrintedToken(res.token);
      setWalkInData({ ...EMPTY_WALK_IN, doctorId: doctors[0]?.id || '' });
      setActiveTab('queue');
    } catch (err) {
      setWalkInError(err.message || 'Could not issue the token. Check the details and try again.');
    } finally {
      setWalkInSubmitting(false);
    }
  };

  const runAction = async (id, fn, fallback) => {
    try {
      setBusyId(id);
      setError('');
      await fn();
    } catch (err) {
      setError(err.message || fallback);
    } finally {
      setBusyId(null);
    }
  };

  const handleCheckInAppointment = (aptId) =>
    runAction(aptId, async () => {
      const res = await api.checkInAppointment(aptId);
      setPrintedToken(res.token);
    }, 'Could not check in this booking. Try again.');

  const handlePriorityToggle = (tokenId, isEmergency, isSenior) =>
    runAction(tokenId, () => api.reorderPriority({ tokenId, isEmergency, isSenior }), 'Could not update the priority. Try again.');

  const handleCancelAppointment = (aptId) =>
    runAction(aptId, async () => {
      await api.cancelAppointment(aptId);
      setConfirmCancelId(null);
      loadData();
    }, 'Could not cancel this booking. Try again.');

  const handleOpenReschedule = (apt) => {
    setSelectedAptToReschedule(apt);
    setRescheduleModalOpen(true);
  };

  const handleOpenPatientHistory = (phone, name) => {
    setHistoryPhone(phone || '');
    setHistoryPatientName(name || '');
    setHistoryModalOpen(true);
  };

  const liveCount = queueTokens.filter(t => t.status === 'waiting' || t.status === 'serving').length;
  const tabs = [
    { id: 'queue', label: 'Live queue', icon: Clock, count: liveCount },
    { id: 'walkin', label: 'Walk-in', icon: UserPlus },
    { id: 'appointments', label: 'Bookings', icon: CalendarCheck, count: appointments.length }
  ];
  const activeIndex = Math.max(0, tabs.findIndex(t => t.id === activeTab));

  return (
    <div className="max-w-6xl w-full min-w-0 mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="page-title">Front desk</h1>
            <span className="badge-cyan px-2.5 py-1">Reception</span>
          </div>
          <p className="page-subtitle">
            Issue walk-in tokens, check in bookings and manage queue priority.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
          <div role="tablist" aria-label="Front desk views" className="segmented w-full sm:w-auto">
            <span
              className="segmented-thumb"
              aria-hidden="true"
              style={{ width: `calc((100% - 4px) / ${tabs.length})`, left: `calc(2px + (100% - 4px) * ${activeIndex} / ${tabs.length})` }}
            />
            {tabs.map(({ id, label, icon: Icon, count }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(id)}
                  className={`segmented-item min-h-[44px] min-w-0 px-2 sm:px-3.5 ${active ? 'text-label' : ''}`}
                >
                  <Icon size={15} className="hidden sm:block" aria-hidden="true" />
                  <span>{label}</span>
                  {count !== undefined && (
                    <span className={`tabular text-footnote ${active ? 'text-accent' : 'text-secondary'}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => handleOpenPatientHistory('', '')} className="btn-secondary">
            <History size={16} aria-hidden="true" /> Patient history
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError('')} onRetry={doctors.length === 0 ? loadData : undefined} />
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="space-y-6">
          <section aria-label="Doctor roster">
            <h2 className="section-title mb-2 px-1">Doctors on duty</h2>
            <DoctorRoster doctors={doctors} queueTokens={queueTokens} />
          </section>
          <QueueTable
            tokens={queueTokens}
            doctors={doctors}
            loading={loading}
            busyId={busyId}
            onRefresh={loadData}
            onPriorityToggle={handlePriorityToggle}
            onPrint={setPrintedToken}
          />
        </div>
      )}

      {activeTab === 'walkin' && (
        <WalkInForm
          doctors={doctors}
          data={walkInData}
          setData={setWalkInData}
          onSubmit={handleWalkInSubmit}
          submitting={walkInSubmitting}
          error={walkInError}
          onDismissError={() => setWalkInError('')}
        />
      )}

      {activeTab === 'appointments' && (
        <AppointmentsTable
          appointments={appointments}
          doctors={doctors}
          loading={loading}
          busyId={busyId}
          confirmCancelId={confirmCancelId}
          setConfirmCancelId={setConfirmCancelId}
          onCheckIn={handleCheckInAppointment}
          onReschedule={handleOpenReschedule}
          onCancel={handleCancelAppointment}
          onHistory={handleOpenPatientHistory}
        />
      )}

      {printedToken && (
        <PrintTokenModal
          token={printedToken}
          clinic={clinic}
          onClose={() => setPrintedToken(null)}
          onTrack={(tokNum) => onNavigateToTracker && onNavigateToTracker(tokNum)}
        />
      )}

      <RescheduleModal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        appointment={selectedAptToReschedule}
        onRescheduled={() => loadData()}
      />

      <PatientHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        phone={historyPhone}
        patientName={historyPatientName}
      />
    </div>
  );
};
