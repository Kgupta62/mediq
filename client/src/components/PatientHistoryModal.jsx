import React, { useState, useEffect, useRef } from 'react';
import { X, User, Calendar, FileText, Stethoscope, Search, AlertTriangle, Inbox, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { api } from '../services/api';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

const useModalBehavior = (isOpen, onClose, panelRef) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const node = panelRef.current;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    (node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE))?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [isOpen, panelRef]);
};

const STATUS = {
  completed: { cls: 'badge-emerald', icon: CheckCircle2 },
  checked_in: { cls: 'badge-cyan', icon: CheckCircle2 },
  cancelled: { cls: 'badge-rose', icon: XCircle }
};

const formatDate = (value, withTime) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  });

const EmptyState = ({ title, hint }) => (
  <div className="py-12 text-center">
    <Inbox size={28} className="mx-auto text-tertiary mb-2" aria-hidden="true" />
    <p className="text-headline text-label">{title}</p>
    <p className="text-footnote text-secondary mt-1">{hint}</p>
  </div>
);

const DetailRow = ({ label, children, className = '' }) => (
  <div className={`list-row flex-col items-start gap-0.5 ${className}`}>
    <dt className="text-caption uppercase tracking-wide text-secondary">{label}</dt>
    <dd className="text-subheadline text-label w-full">{children}</dd>
  </div>
);

const ConsultationCard = ({ c, onViewPrescription }) => (
  <article className="list-inset">
    <div className="list-row justify-between flex-wrap bg-surface-secondary">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <Stethoscope size={15} className="text-accent shrink-0" aria-hidden="true" />
        <span className="text-subheadline font-semibold text-label">{c.doctorName || 'Doctor'}</span>
        <span className="badge-cyan font-medium">{c.specialization || 'OPD'}</span>
      </div>
      <time className="text-footnote text-secondary tabular">{formatDate(c.created_at, true)}</time>
    </div>
    <dl>
      <DetailRow label="Diagnosis">{c.diagnosis}</DetailRow>
      <DetailRow label="Vitals">
        <span className="tabular">BP {c.vitals?.bp || 'n/a'} · Pulse {c.vitals?.pulse || 'n/a'} · Temp {c.vitals?.temp || 'n/a'}</span>
      </DetailRow>
      {c.prescription && (
        <DetailRow label="Medications">
          <span className="block whitespace-pre-wrap line-clamp-2 font-mono text-footnote">{c.prescription}</span>
        </DetailRow>
      )}
    </dl>
    {onViewPrescription && (
      <div className="list-row justify-end">
        <button
          type="button"
          onClick={() => onViewPrescription(c)}
          aria-label={`View prescription from ${formatDate(c.created_at)}`}
          className="btn-secondary btn-sm"
        >
          <FileText size={14} aria-hidden="true" /> View prescription
        </button>
      </div>
    )}
  </article>
);

const AppointmentRow = ({ a }) => {
  const status = STATUS[a.status] || { cls: 'badge-amber', icon: Clock };
  const StatusIcon = status.icon;
  const statusLabel = String(a.status || '').replace('_', ' ');
  return (
    <div className="list-row justify-between flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={15} className="text-accent shrink-0" aria-hidden="true" />
          <strong className="text-subheadline font-semibold text-label tabular">{a.appointmentDate} at {a.slotTime}</strong>
          <span className={status.cls}>
            <StatusIcon size={12} aria-hidden="true" />
            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </span>
        </div>
        <p className="text-footnote text-secondary mt-0.5">
          <span className="text-label">{a.doctorName}</span>{a.specialization ? ` (${a.specialization})` : ''}{a.roomNumber ? ` · ${a.roomNumber}` : ''}
        </p>
        {a.reason && <p className="text-footnote text-secondary mt-0.5 truncate">Reason: {a.reason}</p>}
      </div>
      <div className="text-right shrink-0">
        <span className="block text-caption uppercase tracking-wide text-secondary">Ref</span>
        <strong className="token-badge text-subheadline text-accent">{a.appointmentNumber}</strong>
      </div>
    </div>
  );
};

export const PatientHistoryModal = ({ isOpen, onClose, phone, patientName, onViewPrescription }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPhone, setSearchPhone] = useState(phone || '');
  const [activeTab, setActiveTab] = useState('consultations');
  const panelRef = useRef(null);

  useModalBehavior(isOpen, onClose, panelRef);

  useEffect(() => {
    if (phone) {
      setSearchPhone(phone);
      loadHistory(phone);
    }
  }, [phone, isOpen]);

  const loadHistory = async (targetPhone) => {
    if (!targetPhone) return;
    try {
      setLoading(true);
      setError('');
      const data = await api.getPatientHistory(targetPhone);
      setHistory(data);
    } catch (err) {
      setError(err.message || 'Could not load patient records. Check the connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadHistory(searchPhone.trim());
  };

  if (!isOpen) return null;

  const consultations = history?.consultations || [];
  const appointments = history?.appointments || [];
  const tabs = [
    { id: 'consultations', label: 'Prescriptions', count: consultations.length },
    { id: 'appointments', label: 'Appointments', count: appointments.length }
  ];
  const activeIndex = Math.max(0, tabs.findIndex(t => t.id === activeTab));

  const renderBody = () => {
    if (loading) {
      return (
        <div className="py-12 flex flex-col items-center gap-2 text-secondary text-subheadline" role="status">
          <Loader2 size={24} className="animate-spin text-accent" aria-hidden="true" />
          Loading patient records...
        </div>
      );
    }
    if (error) {
      return (
        <div role="alert" className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-control bg-red-tint text-subheadline text-red">
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
          <span className="flex-1 py-1">{error}</span>
          <button type="button" onClick={() => loadHistory(searchPhone)} className="btn-danger-soft btn-sm">Retry</button>
        </div>
      );
    }
    if (!history) {
      return <EmptyState title="Find a patient" hint="Enter a phone number above to see past prescriptions and bookings." />;
    }
    if (activeTab === 'consultations') {
      return consultations.length > 0
        ? <div className="space-y-4">{consultations.map(c => <ConsultationCard key={c.id} c={c} onViewPrescription={onViewPrescription} />)}</div>
        : <EmptyState title="No past prescriptions" hint="No prescriptions are on record for this phone number." />;
    }
    return appointments.length > 0
      ? <div className="list-inset">{appointments.map(a => <AppointmentRow key={a.id} a={a} />)}</div>
      : <EmptyState title="No past appointments" hint="No bookings are on record for this phone number." />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/35 animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-history-title"
        className="glass w-full sm:max-w-2xl rounded-t-sheet sm:rounded-sheet overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-slide-up"
      >
        <div className="sm:hidden pt-2 flex justify-center" aria-hidden="true">
          <span className="w-9 h-1.5 rounded-full bg-fill" />
        </div>
        <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-separator">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="icon-tile" aria-hidden="true">
              <User size={16} />
            </span>
            <div className="min-w-0">
              <h3 id="patient-history-title" className="text-headline text-label truncate">
                Patient history{patientName ? `: ${patientName}` : ''}
              </h3>
              <p className="text-footnote text-secondary tabular truncate">
                {searchPhone ? `Records for ${searchPhone}` : 'No patient selected'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn-ghost btn-icon shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-3 border-b border-separator flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto sm:flex-1" role="search">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={16} className="absolute left-3 inset-y-0 my-auto text-tertiary" aria-hidden="true" />
              <input
                type="tel"
                inputMode="tel"
                data-autofocus
                aria-label="Patient phone number"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="Search by phone number"
                className="input-base pl-10 tabular"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchPhone.trim()}
              className="btn-primary"
            >
              Search
            </button>
          </form>

          <div role="tablist" aria-label="Record type" className="segmented">
            <span
              className="segmented-thumb"
              aria-hidden="true"
              style={{ width: `calc((100% - 4px) / ${tabs.length})`, left: `calc(2px + (100% - 4px) * ${activeIndex} / ${tabs.length})` }}
            />
            {tabs.map(({ id, label, count }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(id)}
                  className={`segmented-item min-h-[36px] ${active ? 'text-label' : ''}`}
                >
                  {label}
                  <span className={`tabular text-footnote ${active ? 'text-accent' : 'text-secondary'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-grouped">{renderBody()}</div>

        <div className="px-4 sm:px-6 py-3 flex justify-end border-t border-separator pb-[max(12px,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
