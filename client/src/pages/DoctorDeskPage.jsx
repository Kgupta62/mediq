import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { MedicalPrescriptionModal } from '../components/MedicalPrescriptionModal';
import { PatientHistoryModal } from '../components/PatientHistoryModal';
import {
  Stethoscope,
  Volume2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  AlertTriangle,
  RefreshCw,
  Flame,
  History,
  PhoneCall,
  Loader2,
  X
} from 'lucide-react';

const EMPTY_NOTES = {
  diagnosis: '',
  prescription: '',
  bp: '120/80',
  pulse: '74',
  temp: '98.6',
  notes: '',
  followUpDate: ''
};

const BTN = {
  primary: 'btn-primary',
  success: 'btn-success',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  dangerSoft: 'btn-danger-soft',
  ghost: 'btn-ghost btn-sm',
  chip: 'btn-secondary btn-sm'
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
      <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="btn-ghost btn-icon text-red -my-2 -mr-2">
        <X size={16} />
      </button>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="input-label">{label}</span>
    {children}
  </label>
);

const DoctorSwitcher = ({ doctors, selectedId, onSelect }) => {
  const activeIndex = Math.max(0, doctors.findIndex(d => d.id === selectedId));
  if (doctors.length === 0) return null;
  return (
    <div className="overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
      <div role="tablist" aria-label="Active doctor" className="segmented min-w-max">
        <span
          className="segmented-thumb"
          aria-hidden="true"
          style={{ width: `calc((100% - 4px) / ${doctors.length})`, left: `calc(2px + (100% - 4px) * ${activeIndex} / ${doctors.length})` }}
        />
        {doctors.map(d => {
          const active = selectedId === d.id;
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(d.id)}
              className={`segmented-item min-h-[44px] ${active ? 'text-label' : ''}`}
            >
              <span>{d.name.split(' ')[1] || d.name}</span>
              <span className={`text-footnote tabular ${active ? 'text-accent' : 'text-secondary'}`}>{d.roomNumber.replace(/\s*\(.*\)/, '')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DetailRow = ({ label, children, tone = 'text-label' }) => (
  <div className="list-row justify-between">
    <span className="text-subheadline text-secondary">{label}</span>
    <span className={`text-subheadline font-medium text-right tabular ${tone}`}>{children}</span>
  </div>
);

const ServingCard = ({ token, room, waitingCount, actionLoading, onCallNext, onRecall, onNoShow, onHistory }) => {
  const [confirmNoShow, setConfirmNoShow] = useState(false);

  useEffect(() => {
    setConfirmNoShow(false);
  }, [token?.id]);

  return (
    <section aria-label="Current consultation" className={`card overflow-hidden ${token ? 'ring-2 ring-accent' : ''}`}>
      <div className="card-header">
        <h2 className="text-headline text-label flex items-center gap-2.5">
          <span className={`icon-tile ${token ? 'icon-tile-green' : 'icon-tile-gray'}`} aria-hidden="true">
            <Stethoscope size={16} />
          </span>
          In consultation
        </h2>
        <span className="text-subheadline text-secondary tabular">{room}</span>
      </div>

      {token ? (
        <div className="card-body">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <span className="section-title">Now serving</span>
              <div className="token-badge text-[44px] leading-none text-accent mt-1">{token.displayToken}</div>
              <h3 className="text-title3 text-label mt-3 truncate">{token.patientName}</h3>
              <button type="button" onClick={onHistory} className={`${BTN.chip} mt-3`}>
                <History size={14} aria-hidden="true" /> Patient history
              </button>
            </div>

            <div className="list-inset md:w-72 shrink-0 bg-surface-secondary">
              <DetailRow label="Phone">{token.patientPhone}</DetailRow>
              <DetailRow label="Age">{token.patientAge ? `${token.patientAge} yrs` : 'Not recorded'}</DetailRow>
              <DetailRow label="Gender">{token.patientGender}</DetailRow>
              <DetailRow label="Waited" tone="text-orange">{token.waitTimeMinutes || 12} min</DetailRow>
              <DetailRow label="Reason">{token.reason || 'General checkup'}</DetailRow>
            </div>
          </div>

          {confirmNoShow ? (
            <div role="group" aria-label="Confirm no-show" className="mt-5 p-4 rounded-control bg-red-tint flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-subheadline text-label">
                Mark <strong className="token-badge">{token.displayToken}</strong> ({token.patientName}) as a no-show? The token leaves the queue and can't be called again.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setConfirmNoShow(false)} className={BTN.secondary}>Keep in queue</button>
                <button type="button" onClick={() => { setConfirmNoShow(false); onNoShow(); }} className={BTN.danger}>
                  <XCircle size={15} aria-hidden="true" /> Mark as no-show
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5 mt-5">
              <button type="button" onClick={onRecall} title="Ring the chime and announce the token again" className={BTN.secondary}>
                <Volume2 size={16} aria-hidden="true" /> Re-ring chime
              </button>
              <button type="button" onClick={() => setConfirmNoShow(true)} className={BTN.dangerSoft}>
                <XCircle size={16} aria-hidden="true" /> No-show
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card-body py-10 text-center">
          <div className="w-14 h-14 rounded-card bg-fill text-secondary flex items-center justify-center mx-auto mb-3">
            <User size={26} aria-hidden="true" />
          </div>
          <h3 className="text-title3 text-label">Room is free</h3>
          <p className="text-subheadline text-secondary mt-1 max-w-sm mx-auto">
            Call the next patient. The waiting room TV will chime and announce their token.
          </p>
          <button
            type="button"
            onClick={() => onCallNext()}
            disabled={waitingCount === 0 || actionLoading}
            className="btn-primary btn-lg mt-6"
          >
            {actionLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <PhoneCall size={18} aria-hidden="true" />}
            {waitingCount === 0 ? 'No patients waiting' : `Call next patient (${waitingCount} waiting)`}
          </button>
        </div>
      )}
    </section>
  );
};

const ConsultationForm = ({ notes, setNotes, onComplete, actionLoading }) => {
  const set = (key) => (e) => setNotes(prev => ({ ...prev, [key]: e.target.value }));
  return (
    <section aria-label="Clinical notes" className="card overflow-hidden">
      <div className="card-header">
        <h3 className="text-headline text-label flex items-center gap-2.5">
          <span className="icon-tile icon-tile-indigo" aria-hidden="true"><FileText size={16} /></span>
          Notes and prescription
        </h3>
      </div>

      <div className="card-body space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Blood pressure">
            <input type="text" value={notes.bp} onChange={set('bp')} placeholder="120/80" className="input-base tabular" />
          </Field>
          <Field label="Pulse (bpm)">
            <input type="text" inputMode="numeric" value={notes.pulse} onChange={set('pulse')} placeholder="74" className="input-base tabular" />
          </Field>
          <Field label="Temp (F)">
            <input type="text" inputMode="decimal" value={notes.temp} onChange={set('temp')} placeholder="98.6" className="input-base tabular" />
          </Field>
        </div>

        <Field label="Clinical diagnosis">
          <input
            type="text"
            value={notes.diagnosis}
            onChange={set('diagnosis')}
            placeholder="e.g. Viral upper respiratory tract infection"
            className="input-base"
          />
        </Field>

        <Field label="Medicines and dosage (one per line)">
          <textarea
            rows={4}
            value={notes.prescription}
            onChange={set('prescription')}
            placeholder={'1. Tab Paracetamol 650mg - 1 stat, then SOS\n2. Tab Amoxicillin 500mg - 1-0-1 x 5 days'}
            className="input-base font-mono text-subheadline py-3 resize-y"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Advice / lab tests">
            <input type="text" value={notes.notes} onChange={set('notes')} placeholder="e.g. Fasting lipid profile, CBC" className="input-base" />
          </Field>
          <Field label="Follow-up date">
            <input type="date" value={notes.followUpDate} onChange={set('followUpDate')} className="input-base" />
          </Field>
        </div>

        <button type="button" onClick={onComplete} disabled={actionLoading} className="btn-success btn-lg w-full">
          {actionLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          {actionLoading ? 'Saving...' : 'Complete consultation'}
        </button>
      </div>
    </section>
  );
};

const moveListFocus = (e) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const item = e.target.closest('li');
  if (!item) return;
  const next = e.key === 'ArrowDown' ? item.nextElementSibling : item.previousElementSibling;
  const btn = next?.querySelector('button');
  if (btn) {
    e.preventDefault();
    btn.focus();
  }
};

const WaitingList = ({ tokens, loading, onRefresh, onCall, actionLoading }) => (
  <section aria-label="Waiting patients">
    <div className="flex items-center justify-between mb-2 px-1">
      <h3 className="section-title flex items-center gap-2">
        <Clock size={13} aria-hidden="true" /> Waiting
        <span className="badge-slate tabular">{tokens.length}</span>
      </h3>
      <button type="button" onClick={onRefresh} disabled={loading} className={BTN.ghost}>
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
      </button>
    </div>

    {loading && tokens.length === 0 ? (
      <div className="list-inset" aria-hidden="true">
        {[0, 1, 2].map(i => <div key={i} className="list-row"><div className="h-9 w-full skeleton" /></div>)}
      </div>
    ) : tokens.length === 0 ? (
      <div className="card card-body text-center">
        <CheckCircle2 size={28} className="mx-auto text-green mb-2" aria-hidden="true" />
        <p className="text-headline text-label">All caught up</p>
        <p className="text-footnote text-secondary mt-1">No patients are waiting for this OPD. New tokens appear here as the front desk issues them.</p>
      </div>
    ) : (
      <ol className="list-inset" onKeyDown={moveListFocus} aria-label="Waiting queue, use the up and down arrow keys to move between patients">
        {tokens.map((tok, idx) => {
          const isEmergency = tok.priorityLevel === 3;
          const isSenior = tok.priorityLevel === 2;
          return (
            <li key={tok.id} className="list-row justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-footnote text-tertiary w-4 text-right shrink-0 tabular">{idx + 1}</span>
                <span className={`token-badge text-callout shrink-0 w-14 ${isEmergency ? 'text-red' : 'text-accent'}`}>
                  {tok.displayToken}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-subheadline font-semibold text-label truncate">{tok.patientName}</h4>
                    {isEmergency && (
                      <span className="badge-rose">
                        <Flame size={12} aria-hidden="true" /> Urgent
                      </span>
                    )}
                    {isSenior && <span className="badge-amber">Senior</span>}
                  </div>
                  <p className="text-footnote text-secondary truncate">{tok.reason || 'General consultation'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCall(tok.id)}
                disabled={actionLoading}
                aria-label={`Call ${tok.displayToken}, ${tok.patientName}`}
                className="btn-primary btn-sm shrink-0"
              >
                <PhoneCall size={15} aria-hidden="true" /> Call
              </button>
            </li>
          );
        })}
      </ol>
    )}
  </section>
);

const CompletedList = ({ tokens, onViewPrescription }) => (
  <section aria-label="Completed consultations">
    <div className="flex items-center justify-between mb-2 px-1">
      <h4 className="section-title flex items-center gap-2">
        <CheckCircle2 size={13} aria-hidden="true" /> Completed today
      </h4>
      <span className="text-footnote text-secondary tabular">{tokens.length}</span>
    </div>
    <div className="list-inset max-h-72 overflow-y-auto">
      {tokens.length === 0 ? (
        <p className="list-row justify-center text-subheadline text-secondary py-4">No consultations finished yet today.</p>
      ) : (
        tokens.map(tok => (
          <div key={tok.id} className="list-row justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2 size={16} className="text-green shrink-0" aria-hidden="true" />
              <span className="token-badge text-subheadline text-secondary shrink-0">{tok.displayToken}</span>
              <span className="text-subheadline text-label truncate">{tok.patientName}</span>
            </div>
            <button type="button" onClick={() => onViewPrescription(tok)} aria-label={`View prescription for ${tok.patientName}`} className="btn-ghost btn-sm shrink-0">
              <FileText size={14} aria-hidden="true" /> Prescription
            </button>
          </div>
        ))
      )}
    </div>
  </section>
);

export const DoctorDeskPage = () => {
  const { user } = useAuth();
  const { queueTick } = useSocket();

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('doc-1');
  const [queueTokens, setQueueTokens] = useState([]);
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [selectedPrescriptionToken, setSelectedPrescriptionToken] = useState(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyPhone, setHistoryPhone] = useState('');
  const [historyPatientName, setHistoryPatientName] = useState('');

  const [clinicalNotes, setClinicalNotes] = useState(EMPTY_NOTES);

  useEffect(() => {
    loadDoctors();
    loadClinic();
  }, []);

  const loadClinic = async () => {
    try {
      const data = await api.getClinic();
      setClinic(data.clinic);
    } catch {
      setClinic(null);
    }
  };

  useEffect(() => {
    if (selectedDoctorId) {
      loadQueue(selectedDoctorId);
    }
  }, [selectedDoctorId, queueTick]);

  useEffect(() => {
    if (user?.role === 'doctor' && user?.doctorId) {
      setSelectedDoctorId(user.doctorId);
    }
  }, [user]);

  const loadDoctors = async () => {
    try {
      const data = await api.getDoctors();
      setDoctors(data.doctors || []);
      if (data.doctors?.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(data.doctors[0].id);
      }
    } catch (err) {
      setError(err.message || 'Could not load the doctor list. Refresh the page to try again.');
    }
  };

  const loadQueue = async (docId) => {
    try {
      setLoading(true);
      const data = await api.getQueue({ doctorId: docId });
      setQueueTokens(data.tokens || []);
    } catch (err) {
      setError(err.message || 'Could not load the queue. Check the server connection and refresh.');
    } finally {
      setLoading(false);
    }
  };

  const currentDoctor = doctors.find(d => d.id === selectedDoctorId) || doctors[0];
  const servingToken = queueTokens.find(t => t.status === 'serving' || t.status === 'called');
  const waitingTokens = queueTokens.filter(t => t.status === 'waiting');
  const completedTokens = queueTokens.filter(t => t.status === 'completed');

  const handleCallNext = async (specificTokenId = null) => {
    try {
      setActionLoading(true);
      setError('');
      await api.callNextToken(selectedDoctorId, specificTokenId);
      setClinicalNotes(EMPTY_NOTES);
    } catch (err) {
      setError(err.message || 'Could not call the next patient. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecall = async () => {
    if (!servingToken) return;
    try {
      await api.recallToken(servingToken.id);
    } catch (err) {
      setError(err.message || 'Could not re-ring the chime. Try again.');
    }
  };

  const handleCompleteConsultation = async () => {
    if (!servingToken) return;
    try {
      setActionLoading(true);
      setError('');
      const res = await api.completeToken({
        tokenId: servingToken.id,
        diagnosis: clinicalNotes.diagnosis || 'Routine Checkup Completed',
        prescription: clinicalNotes.prescription,
        vitals: {
          bp: clinicalNotes.bp,
          pulse: clinicalNotes.pulse,
          temp: clinicalNotes.temp
        },
        notes: clinicalNotes.notes,
        followUpDate: clinicalNotes.followUpDate
      });
      setClinicalNotes(EMPTY_NOTES);
      if (res.consultation) {
        setSelectedPrescription(res.consultation);
        setSelectedPrescriptionToken(res.token);
        setPrescriptionModalOpen(true);
      }
    } catch (err) {
      setError(err.message || 'Could not save the consultation. Your notes are still here; try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewPrescriptionForToken = async (tok) => {
    try {
      const res = await api.getPrescriptionByToken(tok.id);
      setSelectedPrescription(res.consultation);
      setSelectedPrescriptionToken(res.token);
      setPrescriptionModalOpen(true);
    } catch (err) {
      setError(err.message || `No prescription found for token ${tok.displayToken}.`);
    }
  };

  const handleOpenPatientHistory = (phone, name) => {
    setHistoryPhone(phone || '');
    setHistoryPatientName(name || '');
    setHistoryModalOpen(true);
  };

  const handleMarkNoShow = async () => {
    if (!servingToken) return;
    try {
      await api.markNoShow(servingToken.id);
    } catch (err) {
      setError(err.message || 'Could not mark the no-show. Try again.');
    }
  };

  return (
    <div className="max-w-6xl w-full min-w-0 mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="page-title">Consultation desk</h1>
            <span className="badge-cyan px-2.5 py-1">Doctor</span>
          </div>
          <p className="page-subtitle">
            Call patients in, announce on the waiting room TV and record prescriptions.
          </p>
        </div>
        <DoctorSwitcher doctors={doctors} selectedId={selectedDoctorId} onSelect={setSelectedDoctorId} />
      </header>

      {error && (
        <div className="mb-5">
          <ErrorBanner
            message={error}
            onDismiss={() => setError('')}
            onRetry={doctors.length === 0 ? () => { loadDoctors(); loadQueue(selectedDoctorId); } : undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <ServingCard
            token={servingToken}
            room={currentDoctor?.roomNumber}
            waitingCount={waitingTokens.length}
            actionLoading={actionLoading}
            onCallNext={handleCallNext}
            onRecall={handleRecall}
            onNoShow={handleMarkNoShow}
            onHistory={() => handleOpenPatientHistory(servingToken.patientPhone, servingToken.patientName)}
          />
          {servingToken && (
            <ConsultationForm
              notes={clinicalNotes}
              setNotes={setClinicalNotes}
              onComplete={handleCompleteConsultation}
              actionLoading={actionLoading}
            />
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <WaitingList
            tokens={waitingTokens}
            loading={loading}
            onRefresh={() => loadQueue(selectedDoctorId)}
            onCall={handleCallNext}
            actionLoading={actionLoading}
          />
          <CompletedList tokens={completedTokens} onViewPrescription={handleViewPrescriptionForToken} />
        </div>
      </div>

      <MedicalPrescriptionModal
        isOpen={prescriptionModalOpen}
        onClose={() => setPrescriptionModalOpen(false)}
        consultation={selectedPrescription}
        doctor={currentDoctor}
        clinic={clinic}
        token={selectedPrescriptionToken}
      />

      <PatientHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        phone={historyPhone}
        patientName={historyPatientName}
        onViewPrescription={(c) => {
          setSelectedPrescription(c);
          setSelectedPrescriptionToken({ patientPhone: c.patientPhone, displayToken: c.tokenId });
          setPrescriptionModalOpen(true);
        }}
      />
    </div>
  );
};
