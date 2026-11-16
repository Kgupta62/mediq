import React, { useEffect } from 'react';
import { X, Printer, Smartphone, Clock, QrCode } from 'lucide-react';

export const PrintTokenModal = ({ token, clinic, onClose, onTrack }) => {
  useEffect(() => {
    if (!token) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [token, onClose]);

  if (!token) return null;

  const handlePrint = () => {
    window.print();
  };

  const tokenKind =
    token.priorityLevel === 3 ? 'Emergency priority token' : token.tokenType === 'appointment' ? 'Appointment token' : 'Walk-in OPD token';

  const rows = [
    ['Patient', token.patientName, 'font-semibold text-black'],
    ['Age / Gender', `${token.patientAge || 'N/A'} yrs / ${token.patientGender || 'Other'}`, 'text-black'],
    ['Doctor room', token.roomNumber, 'font-semibold text-black'],
    ['Reason', token.reason || 'Consultation', 'text-black/70 truncate max-w-[160px]']
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/35 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-token-title"
        onClick={(e) => e.stopPropagation()}
        className="glass relative w-full sm:max-w-sm rounded-t-sheet sm:rounded-sheet overflow-hidden max-h-[92vh] flex flex-col animate-slide-up sm:animate-scale-in"
      >
        <div className="px-5 pt-3 pb-3 flex items-center justify-between gap-3">
          <div className="w-9 h-1 rounded-full bg-tertiary absolute inset-x-0 mx-auto top-2 sm:hidden" aria-hidden="true" />
          <h3 id="print-token-title" className="text-headline text-label pt-2 sm:pt-0 flex items-center gap-2">
            <Printer size={16} className="text-secondary" aria-hidden="true" /> OPD token slip
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-ghost btn-icon rounded-full">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-5">
          <div id="printable-token" className="p-6 bg-white text-black font-sans text-center rounded-control shadow-sm">
            <div className="border-b-2 border-dashed border-black/20 pb-3 mb-4">
              <p className="text-callout font-bold uppercase tracking-tight text-black">
                {clinic?.name || 'MediQ Health Clinic'}
              </p>
              <p className="text-caption text-black/60 mt-0.5">
                {clinic?.address || '42 Health City Avenue, Medical District'}
              </p>
              <p className="text-caption text-black/60 tabular">
                Tel: {clinic?.phone || '+91 98765 43210'}
              </p>
            </div>

            <div className="py-2">
              <p className={`text-caption font-bold uppercase tracking-widest ${token.priorityLevel === 3 ? 'text-red' : 'text-black/60'}`}>
                {tokenKind}
              </p>
              <div className="my-2 py-2 px-5 inline-block border-2 border-black rounded-control">
                <span className="token-badge text-5xl text-black">
                  {token.displayToken}
                </span>
              </div>
              <p className="text-caption text-black/60 flex items-center justify-center gap-1">
                <Clock size={12} aria-hidden="true" /> Issued at {new Date(token.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <dl className="text-left text-footnote border-t border-b border-dashed border-black/20 py-3 my-3 space-y-1.5">
              {rows.map(([label, value, cls]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-black/60 shrink-0">{label}</dt>
                  <dd className={cls}>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col items-center justify-center pt-1 pb-2">
              <div className="p-2 border border-black/20 rounded-lg bg-white text-black">
                <QrCode size={64} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <p className="text-caption text-black/60 mt-1">Scan to track queue live</p>
            </div>

            <p className="text-caption text-black/60 mt-2">
              Please watch the waiting room screens for your token.
            </p>
          </div>
        </div>

        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row gap-2.5">
          <button type="button" onClick={handlePrint} className="btn-secondary flex-1">
            <Printer size={16} aria-hidden="true" /> Print slip
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onTrack) onTrack(token.tokenNumber);
            }}
            className="btn-primary flex-1"
          >
            <Smartphone size={16} aria-hidden="true" /> Track on phone
          </button>
        </div>
      </div>
    </div>
  );
};
