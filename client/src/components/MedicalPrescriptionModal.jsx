import React, { useEffect, useRef } from 'react';
import { X, Printer, HeartPulse, Calendar, FileText } from 'lucide-react';

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

const PRINT_CSS = `
@media print {
  #printable-prescription, #printable-prescription * { visibility: visible; }
  #printable-prescription { position: absolute; left: 0; top: 0; width: 100%; padding: 16mm; background: #fff; }
}`;

const MetaCell = ({ label, children, mono }) => (
  <div>
    <span className="text-gray-500 block text-caption uppercase font-semibold tracking-wide">{label}</span>
    <span className={`text-black font-medium text-subheadline ${mono ? 'tabular' : ''}`}>{children}</span>
  </div>
);

const Vital = ({ label, value, unit }) => (
  <div className="tabular">
    <span className="text-gray-500">{label} </span>
    <strong className="text-black">{value} {unit}</strong>
  </div>
);

const MedicationTable = ({ lines }) => (
  <div className="border border-gray-200 rounded-control overflow-hidden">
    <table className="w-full text-left text-subheadline">
      <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 font-semibold text-caption uppercase tracking-wide">
        <tr>
          <th scope="col" className="py-2 px-3 w-10 text-center">#</th>
          <th scope="col" className="py-2 px-3">Medicine, strength and schedule</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {lines.map((line, idx) => (
          <tr key={idx}>
            <td className="py-2.5 px-3 text-center text-gray-500 tabular">{idx + 1}</td>
            <td className="py-2.5 px-3 font-medium text-black">{line}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const MedicalPrescriptionModal = ({ isOpen, onClose, consultation, doctor, clinic, token }) => {
  const panelRef = useRef(null);
  const open = Boolean(isOpen && consultation);
  useModalBehavior(open, onClose, panelRef);

  if (!open) return null;

  const vitals = consultation.vitals || {};
  const medLines = (consultation.prescription || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  const issuedOn = new Date(consultation.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/35 animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{PRINT_CSS}</style>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescription-title"
        className="glass w-full sm:max-w-3xl rounded-t-sheet sm:rounded-sheet overflow-hidden flex flex-col max-h-[92vh] animate-slide-up"
      >
        <div className="sm:hidden pt-2 flex justify-center" aria-hidden="true">
          <span className="w-9 h-1.5 rounded-full bg-fill" />
        </div>
        <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-separator">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="icon-tile icon-tile-green" aria-hidden="true">
              <FileText size={16} />
            </span>
            <div className="min-w-0">
              <h3 id="prescription-title" className="text-headline text-label">Prescription</h3>
              <p className="text-footnote text-secondary tabular truncate">Ref {consultation.id}</p>
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

        <div className="overflow-y-auto flex-1 bg-surface-secondary p-3 sm:p-5">
          <div id="printable-prescription" className="p-5 sm:p-8 bg-white text-black rounded-control shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-subheadline">
            <div className="border-b-2 border-black pb-5 mb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#007aff] text-white flex items-center justify-center font-bold text-title3" aria-hidden="true">+</div>
                  <div>
                    <h1 className="text-title3 text-black">
                      {clinic?.name || 'MediQ Health Clinic'}
                    </h1>
                    <p className="text-footnote text-gray-600">{clinic?.address || '42, Health City Avenue, Medical District'}</p>
                  </div>
                </div>
                <p className="text-caption text-gray-500 mt-2 tabular">
                  {clinic?.phone || '+91 98765 43210'} · {clinic?.email || 'helpdesk@mediq.health'}
                </p>
              </div>
              <div className="sm:text-right">
                <h2 className="text-headline text-black">{doctor?.name || 'Consulting Physician'}</h2>
                <p className="text-subheadline font-medium text-[#007aff]">{doctor?.title || doctor?.specialization || 'Consultant'}</p>
                <p className="text-caption text-gray-500 mt-0.5 tabular">Reg MED-IQ-2026-OPD · {doctor?.roomNumber || 'OPD Room 101'}</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-control p-3.5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetaCell label="Patient"><strong className="text-black text-callout font-semibold">{consultation.patientName}</strong></MetaCell>
              <MetaCell label="Age / gender">
                {consultation.patientAge ? `${consultation.patientAge} yrs` : 'Adult'} / {consultation.patientGender || 'Not recorded'}
              </MetaCell>
              <MetaCell label="Phone / token" mono>
                {consultation.patientPhone || token?.patientPhone || 'Not recorded'}{token?.displayToken ? ` (${token.displayToken})` : ''}
              </MetaCell>
              <MetaCell label="Date">{issuedOn}</MetaCell>
            </div>

            <div className="border border-gray-200 rounded-control p-3 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-subheadline">
              <span className="text-caption font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <HeartPulse size={14} className="text-[#ff3b30]" aria-hidden="true" /> Vitals
              </span>
              <Vital label="BP" value={vitals.bp || '120/80'} unit="mmHg" />
              <Vital label="Pulse" value={vitals.pulse || '72'} unit="bpm" />
              <Vital label="Temp" value={vitals.temp || '98.6'} unit="F" />
            </div>

            <section className="mb-6">
              <h4 className="text-caption uppercase tracking-wide font-semibold text-gray-500 mb-1">Diagnosis</h4>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-control text-black font-medium text-callout">
                {consultation.diagnosis || 'Routine Health Examination'}
              </div>
            </section>

            <section className="mb-6">
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-200">
                <span className="text-title3 font-serif text-[#007aff]" aria-hidden="true">Rx</span>
                <h4 className="text-caption font-semibold uppercase tracking-wide text-gray-600">Prescribed medications</h4>
              </div>
              {medLines.length > 0 ? (
                <MedicationTable lines={medLines} />
              ) : (
                <p className="text-subheadline text-gray-700 bg-gray-50 p-3 rounded-control border border-gray-200">
                  No medications prescribed. Follow lifestyle and dietary guidance.
                </p>
              )}
            </section>

            {consultation.notes && (
              <section className="mb-6">
                <h4 className="text-caption uppercase tracking-wide font-semibold text-gray-500 mb-1">Advice and instructions</h4>
                <p className="text-subheadline text-gray-800 bg-gray-50 p-3 rounded-control border border-gray-200 leading-relaxed">{consultation.notes}</p>
              </section>
            )}

            <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between sm:items-end gap-6 mt-8">
              <div>
                {consultation.followUpDate ? (
                  <div className="inline-flex items-center gap-1.5 text-subheadline text-black font-medium bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-control">
                    <Calendar size={15} className="text-[#ff9500]" aria-hidden="true" />
                    Follow-up: <strong>{consultation.followUpDate}</strong>
                  </div>
                ) : (
                  <p className="text-subheadline text-gray-700">Follow up if symptoms persist.</p>
                )}
                <p className="text-caption text-gray-500 mt-2">Valid for pharmacy dispensing and clinical reference</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="font-serif italic text-callout text-black mb-1 border-b border-dashed border-gray-400 pb-1 sm:px-4">
                  {doctor?.name || 'Dr. Consultant'}
                </div>
                <span className="text-caption font-semibold uppercase tracking-wide text-gray-500 block">Digitally signed by physician</span>
                <span className="text-caption text-gray-500 block">MediQ OPD clinical system</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 flex justify-end gap-2 border-t border-separator pb-[max(12px,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
          <button
            type="button"
            data-autofocus
            onClick={() => window.print()}
            className="btn-primary"
          >
            <Printer size={16} aria-hidden="true" /> <span className="hidden sm:inline">Print or save PDF</span><span className="sm:hidden">Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
