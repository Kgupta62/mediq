import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Users,
  Radio,
  CheckCircle2,
  UserX,
  Clock,
  Timer,
  Star,
  Download,
  RefreshCw,
  AlertCircle,
  Plus,
  Pencil,
  X,
  Loader2,
  Stethoscope,
  Building2,
  Check
} from 'lucide-react';

const StatCard = ({ label, value, unit, hint, icon: Icon, tone }) => (
  <div className="stat-card">
    <div className="flex items-center gap-2.5">
      <span className={`icon-tile ${tone}`} aria-hidden="true">
        <Icon size={17} />
      </span>
      <span className="text-subheadline font-medium text-secondary">{label}</span>
    </div>
    <div className="stat-value text-label">
      {value}{unit && <span className="text-subheadline font-normal text-secondary ml-1">{unit}</span>}
    </div>
    <div className="text-footnote text-secondary mt-1">{hint}</div>
  </div>
);

const Field = ({ label, id, children }) => (
  <div>
    <label htmlFor={id} className="input-label">{label}</label>
    {children}
  </div>
);

const CLINIC_FIELDS = [
  ['name', 'Clinic name'], ['tagline', 'Tagline'], ['address', 'Address'], ['phone', 'Phone'],
  ['email', 'Email'], ['openTime', 'Opens at'], ['closeTime', 'Closes at']
];

const DOCTOR_FIELDS = [
  ['name', 'Name', 'text'], ['title', 'Title', 'text'], ['specialization', 'Specialization', 'text'],
  ['experience', 'Experience', 'text'], ['roomNumber', 'Room number', 'text'], ['fee', 'Consultation fee', 'number'],
  ['avatarUrl', 'Avatar URL', 'url']
];

const emptyDoctor = { name: '', title: '', specialization: '', experience: '', roomNumber: '', fee: 500, bio: '', avatarUrl: '' };

const statusBadge = {
  waiting: 'badge-cyan', called: 'badge-amber', serving: 'badge-emerald', completed: 'badge-slate', no_show: 'badge-rose'
};
const statusLabel = { waiting: 'Waiting', called: 'Called', serving: 'Serving', completed: 'Completed', no_show: 'No show' };
const typeLabel = { walk_in: 'Walk-in', appointment: 'Appointment', emergency: 'Emergency' };
const priorityLabel = { 3: 'Emergency', 2: 'Senior', 1: 'Normal' };

const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
const minutes = (from, to) => (from && to ? Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000)) : '');
const isToday = (iso) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return new Date(iso) >= start;
};

const DoctorSheet = ({ doctor, onClose, onSaved }) => {
  const [form, setForm] = useState({ ...emptyDoctor, ...(doctor || {}), avatarUrl: doctor?.avatarUrl || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(doctor);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { ...form, fee: Number(form.fee), avatarUrl: form.avatarUrl.trim() };
      const res = isEdit ? await api.updateDoctor(doctor.id, payload) : await api.createDoctor(payload);
      onSaved(res.doctor);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the doctor. Check the fields and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/35 animate-fade-in"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="glass relative w-full sm:max-w-lg rounded-t-sheet sm:rounded-sheet overflow-hidden max-h-[92vh] flex flex-col animate-slide-up sm:animate-scale-in"
      >
        <div className="px-5 pt-3 pb-3 flex items-center justify-between gap-3">
          <div className="w-9 h-1 rounded-full bg-tertiary absolute inset-x-0 mx-auto top-2 sm:hidden" aria-hidden="true" />
          <h3 id="doctor-sheet-title" className="text-headline text-label pt-2 sm:pt-0">{isEdit ? 'Edit doctor' : 'Add doctor'}</h3>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="btn-ghost btn-icon rounded-full">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOCTOR_FIELDS.map(([key, label, type]) => (
              <Field key={key} id={`doctor-${key}`} label={label}>
                <input
                  id={`doctor-${key}`}
                  type={type}
                  value={form[key] ?? ''}
                  onChange={set(key)}
                  required={['name', 'specialization', 'roomNumber'].includes(key)}
                  min={type === 'number' ? 0 : undefined}
                  className="input-base"
                />
              </Field>
            ))}
          </div>
          <Field id="doctor-bio" label="Bio">
            <textarea id="doctor-bio" value={form.bio} onChange={set('bio')} rows={3} maxLength={600} className="input-base py-2.5 min-h-[80px] resize-none" />
          </Field>
          {error && (
            <p role="alert" className="input-error-text flex items-center gap-1.5">
              <AlertCircle size={14} aria-hidden="true" /> {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
              {busy ? 'Saving' : isEdit ? 'Save changes' : 'Add doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AdminDashboardPage = ({ clinic: initialClinic, onClinicUpdated }) => {
  const [analytics, setAnalytics] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [clinicForm, setClinicForm] = useState(null);
  const [clinicStatus, setClinicStatus] = useState({ type: '', text: '' });
  const [savingClinic, setSavingClinic] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [toggling, setToggling] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { queueTick } = useSocket();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [an, docs, queue, fb, cl] = await Promise.all([
        api.getAnalytics(), api.getDoctors(), api.getQueue(), api.getFeedbackSummary(), api.getClinic()
      ]);
      setAnalytics(an);
      setDoctors(docs.doctors || []);
      setTokens((queue.tokens || []).filter((t) => isToday(t.checkInTime)));
      setFeedback(fb.summary);
      setClinicForm((prev) => prev || Object.fromEntries([...CLINIC_FIELDS, ['activeNotice']].map(([k]) => [k, cl.clinic?.[k] || ''])));
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load the admin dashboard right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [queueTick, loadData]);

  const saveClinic = async (e) => {
    e.preventDefault();
    setSavingClinic(true);
    setClinicStatus({ type: '', text: '' });
    try {
      const res = await api.updateClinic(clinicForm);
      onClinicUpdated?.(res.clinic);
      setClinicStatus({ type: 'ok', text: 'Clinic settings saved.' });
    } catch (err) {
      setClinicStatus({ type: 'error', text: err.message || 'Could not save clinic settings.' });
    } finally {
      setSavingClinic(false);
    }
  };

  const toggleDoctor = async (id) => {
    setToggling(id);
    try {
      const res = await api.toggleDoctorAvailability(id);
      setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, isAvailable: res.doctor.isAvailable } : d)));
    } catch (err) {
      setError(err.message || 'Could not update availability.');
    } finally {
      setToggling('');
    }
  };

  const exportCSV = () => {
    const header = ['Token', 'Patient', 'Doctor', 'Type', 'Priority', 'Check-in', 'Called', 'Completed', 'Wait min', 'Service min', 'Status'];
    const rows = tokens.map((t) => [
      t.displayToken, t.patientName, doctorName(t.doctorId), typeLabel[t.tokenType] || t.tokenType, priorityLabel[t.priorityLevel] || t.priorityLevel,
      fmtTime(t.checkInTime), fmtTime(t.calledTime), fmtTime(t.completedTime), waitMin(t), serviceMin(t), statusLabel[t.status] || t.status
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `MediQ_Daily_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const doctorName = (id) => doctors.find((d) => d.id === id)?.name || id;
  const waitMin = (t) => (t.waitTimeMinutes || minutes(t.checkInTime, t.calledTime));
  const serviceMin = (t) => (t.serviceTimeMinutes || minutes(t.calledTime, t.completedTime));

  if (!analytics && loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full space-y-5" aria-busy="true" aria-label="Loading admin dashboard">
        <div className="skeleton h-10 w-72" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-32" />)}
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (!analytics && error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="page-title mb-6">Admin</h1>
        <div role="alert" className="card max-w-md mx-auto p-6 text-center">
          <AlertCircle size={24} className="text-red mx-auto mb-2" aria-hidden="true" />
          <p className="text-headline text-label">The dashboard could not be loaded</p>
          <p className="text-subheadline text-secondary mt-1">{error}</p>
          <button type="button" onClick={loadData} className="btn-secondary mt-4">
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  }

  const clinicName = initialClinic?.name || clinicForm?.name;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full min-w-0 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle max-w-2xl">Live overview, clinic settings, doctors and today's report for {clinicName || 'the clinic'}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={loadData} disabled={loading} className="btn-secondary btn-icon" aria-label="Refresh dashboard" title="Refresh dashboard">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
          <button type="button" onClick={exportCSV} disabled={!tokens.length} className="btn-primary">
            <Download size={15} aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-2.5 px-3.5 py-2.5 rounded-control bg-red-tint text-subheadline text-red">
          <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0 py-1">{error}</span>
          <button type="button" onClick={loadData} className="btn-danger-soft btn-sm">Try again</button>
        </div>
      )}

      <section aria-labelledby="overview-title" className="space-y-4">
        <h2 id="overview-title" className="section-title px-4">Live overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Waiting" value={analytics.currentlyWaiting} hint="In queue now" icon={Users} tone="icon-tile-orange" />
          <StatCard label="Serving" value={analytics.currentlyServing} hint="With a doctor" icon={Radio} tone="icon-tile-green" />
          <StatCard label="Completed" value={analytics.completedToday} hint="Today" icon={CheckCircle2} tone="" />
          <StatCard label="No-shows" value={analytics.noShows} hint="Today" icon={UserX} tone="icon-tile-red" />
          <StatCard label="Avg wait" value={analytics.avgWaitTimeMinutes} unit="min" hint="Check-in to call" icon={Clock} tone="icon-tile-teal" />
          <StatCard label="Avg consult" value={analytics.avgConsultTimeMinutes} unit="min" hint="Per consultation" icon={Timer} tone="icon-tile-indigo" />
        </div>
        <div className="list-inset">
          {doctors.map((doc) => (
            <div key={doc.id} className="list-row justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {doc.avatarUrl ? (
                  <img src={doc.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-fill shrink-0" />
                ) : (
                  <span className="icon-tile icon-tile-indigo"><Stethoscope size={16} aria-hidden="true" /></span>
                )}
                <div className="min-w-0">
                  <p className="text-headline truncate">{doc.name}</p>
                  <p className="text-footnote text-secondary truncate">{doc.roomNumber} · {doc.waitingCount} waiting</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`${doc.currentServingToken !== 'None' ? 'badge-emerald' : doc.isAvailable ? 'badge-cyan' : 'badge-slate'} tabular`}>
                  {doc.currentServingToken !== 'None' ? `Serving ${doc.currentServingToken}` : doc.isAvailable ? 'Available' : 'Away'}
                </span>
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <span className="sr-only">{doc.name} available</span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={`${doc.name} available`}
                    checked={Boolean(doc.isAvailable)}
                    disabled={toggling === doc.id}
                    onChange={() => toggleDoctor(doc.id)}
                    className="w-5 h-5 accent-green"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <form onSubmit={saveClinic} className="card lg:col-span-3" aria-labelledby="clinic-title">
          <div className="card-header">
            <h2 id="clinic-title" className="text-headline text-label flex items-center gap-2"><Building2 size={16} aria-hidden="true" /> Clinic settings</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CLINIC_FIELDS.map(([key, label]) => (
                <Field key={key} id={`clinic-${key}`} label={label}>
                  <input
                    id={`clinic-${key}`}
                    type={key === 'email' ? 'email' : 'text'}
                    value={clinicForm?.[key] || ''}
                    onChange={(e) => setClinicForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="input-base"
                  />
                </Field>
              ))}
            </div>
            <Field id="clinic-activeNotice" label="Active notice">
              <textarea
                id="clinic-activeNotice"
                rows={2}
                value={clinicForm?.activeNotice || ''}
                onChange={(e) => setClinicForm((prev) => ({ ...prev, activeNotice: e.target.value }))}
                className="input-base py-2.5 min-h-[72px] resize-none"
              />
              <p className="input-hint">Shown under the navbar and on the waiting room TV.</p>
            </Field>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {clinicStatus.text ? (
                <p role={clinicStatus.type === 'error' ? 'alert' : 'status'} className={`text-subheadline flex items-center gap-1.5 ${clinicStatus.type === 'error' ? 'text-red' : 'text-green'}`}>
                  {clinicStatus.type === 'error' ? <AlertCircle size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                  {clinicStatus.text}
                </p>
              ) : <span />}
              <button type="submit" disabled={savingClinic || !clinicForm} className="btn-primary">
                {savingClinic ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                {savingClinic ? 'Saving' : 'Save'}
              </button>
            </div>
          </div>
        </form>

        <section aria-labelledby="feedback-title" className="card lg:col-span-2">
          <div className="card-header">
            <h2 id="feedback-title" className="text-headline text-label flex items-center gap-2"><Star size={16} aria-hidden="true" /> Patient feedback</h2>
            <span className="text-footnote text-secondary tabular">Today</span>
          </div>
          <div className="card-body space-y-4">
            <div className="flex items-end gap-3">
              <span className="text-large-title text-label tabular">{feedback?.count ? feedback.averageRating : 'No ratings yet'}</span>
              {feedback?.count ? (
                <span className="text-subheadline text-secondary pb-1.5">/ 5 from {feedback.count} {feedback.count === 1 ? 'review' : 'reviews'}</span>
              ) : null}
            </div>
            {feedback?.count ? (
              <div className="flex items-center gap-0.5 text-orange" aria-label={`${feedback.averageRating} out of 5`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={18} fill={i <= Math.round(feedback.averageRating) ? 'currentColor' : 'none'} aria-hidden="true" />
                ))}
              </div>
            ) : (
              <p className="text-subheadline text-secondary">Patients can rate their visit from the tracker after completion.</p>
            )}
            {feedback?.latest?.length ? (
              <ul className="space-y-3">
                {feedback.latest.map((f) => (
                  <li key={f.id} className="text-subheadline">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label font-medium truncate">{f.patientName || f.displayToken}</span>
                      <span className="text-orange tabular shrink-0 flex items-center gap-1"><Star size={12} fill="currentColor" aria-hidden="true" /> {f.rating}</span>
                    </div>
                    {f.comment && <p className="text-secondary mt-0.5">{f.comment}</p>}
                    <p className="text-caption text-tertiary mt-0.5 tabular">{f.doctorName} · {fmtTime(f.created_at)}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>

      <section aria-labelledby="doctors-title">
        <div className="flex items-center justify-between gap-2 px-4 mb-2">
          <h2 id="doctors-title" className="section-title">Doctors</h2>
          <button type="button" onClick={() => setSheet({ mode: 'add' })} className="btn-ghost btn-sm -mr-3">
            <Plus size={15} aria-hidden="true" /> Add doctor
          </button>
        </div>
        <div className="list-inset">
          {doctors.map((doc) => (
            <div key={doc.id} className="list-row justify-between gap-3">
              <div className="min-w-0">
                <p className="text-headline truncate">{doc.name}</p>
                <p className="text-footnote text-secondary truncate">{doc.title || doc.specialization} · {doc.experience || 'Experience not set'} · Fee {doc.fee}</p>
              </div>
              <button type="button" onClick={() => setSheet({ mode: 'edit', doctor: doc })} className="btn-secondary btn-sm shrink-0" aria-label={`Edit ${doc.name}`}>
                <Pencil size={14} aria-hidden="true" /> Edit
              </button>
            </div>
          ))}
          {!doctors.length && <p className="empty-state">No doctors yet. Add the first one.</p>}
        </div>
      </section>

      <section aria-labelledby="report-title">
        <div className="flex items-center justify-between gap-2 px-4 mb-2">
          <h2 id="report-title" className="section-title">Today's report</h2>
          <span className="text-footnote text-secondary tabular">{tokens.length} tokens</span>
        </div>
        <div className="card overflow-hidden">
          {tokens.length === 0 ? (
            <p className="empty-state">No tokens issued today yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Token</th><th>Patient</th><th>Doctor</th><th>Type</th><th>Priority</th>
                    <th>Check-in</th><th>Called</th><th>Completed</th>
                    <th className="text-right">Wait min</th><th className="text-right">Service min</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr key={t.id}>
                      <td className="font-semibold tabular">{t.displayToken}</td>
                      <td className="text-label">{t.patientName}</td>
                      <td className="text-secondary">{doctorName(t.doctorId)}</td>
                      <td className="text-secondary">{typeLabel[t.tokenType] || t.tokenType}</td>
                      <td className={t.priorityLevel === 3 ? 'text-red font-medium' : t.priorityLevel === 2 ? 'text-orange font-medium' : 'text-secondary'}>{priorityLabel[t.priorityLevel] || t.priorityLevel}</td>
                      <td className="text-secondary tabular">{fmtTime(t.checkInTime)}</td>
                      <td className="text-secondary tabular">{fmtTime(t.calledTime) || '--'}</td>
                      <td className="text-secondary tabular">{fmtTime(t.completedTime) || '--'}</td>
                      <td className="text-right tabular">{waitMin(t) === '' ? '--' : waitMin(t)}</td>
                      <td className="text-right tabular">{serviceMin(t) === '' ? '--' : serviceMin(t)}</td>
                      <td><span className={statusBadge[t.status] || 'badge-slate'}>{statusLabel[t.status] || t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {sheet && (
        <DoctorSheet
          doctor={sheet.mode === 'edit' ? sheet.doctor : null}
          onClose={() => setSheet(null)}
          onSaved={(doc) => setDoctors((prev) => (prev.some((d) => d.id === doc.id) ? prev.map((d) => (d.id === doc.id ? { ...d, ...doc } : d)) : [...prev, { ...doc, waitingCount: 0, currentServingToken: 'None' }]))}
        />
      )}
    </div>
  );
};
