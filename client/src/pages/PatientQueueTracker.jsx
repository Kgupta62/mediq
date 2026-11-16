import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { MedicalPrescriptionModal } from '../components/MedicalPrescriptionModal';
import { FeedbackCard } from '../components/FeedbackCard';
import {
  Ticket,
  Clock,
  MapPin,
  CheckCircle2,
  RefreshCw,
  BellRing,
  FileText,
  AlertCircle,
  Search,
  Loader2,
  Radio,
  Users,
  Timer,
  DoorOpen,
  Stethoscope
} from 'lucide-react';

const statusMeta = {
  serving: { label: 'Serving now', badge: 'badge-emerald', hero: 'text-green' },
  completed: { label: 'Completed', badge: 'badge-slate', hero: 'text-label' },
  waiting: { label: 'In queue', badge: 'badge-cyan', hero: 'text-accent' },
  next: { label: 'You are next', badge: 'badge-amber', hero: 'text-orange' }
};

const Metric = ({ icon: Icon, tile, label, value, unit, caption }) => (
  <div className="stat-card">
    <div className="flex items-center gap-2.5">
      <span className={`icon-tile ${tile}`}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="text-subheadline text-secondary">{label}</span>
    </div>
    <div className="stat-value">
      {value}
      {unit && <span className="text-subheadline font-normal text-secondary ml-1">{unit}</span>}
    </div>
    <p className="text-footnote text-secondary mt-1">{caption}</p>
  </div>
);

export const PatientQueueTracker = ({ initialTokenNumber = '104' }) => {
  const [tokenInput, setTokenInput] = useState(String(initialTokenNumber || '104'));
  const [tokenData, setTokenData] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorIsNetwork, setErrorIsNetwork] = useState(false);
  const [rxError, setRxError] = useState('');
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [rxLoading, setRxLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { queueTick } = useSocket();

  useEffect(() => {
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
    if (tokenInput) {
      fetchTokenStatus(tokenInput);
    }
  }, [queueTick]);

  const fetchTokenStatus = async (identifier) => {
    if (!identifier) return;
    setLoading(true);
    setError('');

    try {
      const data = await api.getTokenStatus(identifier.trim());
      setTokenData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Check the number on your OPD slip and try again.');
      setErrorIsNetwork(err.status === 0);
      setTokenData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchPrescription = async () => {
    if (!tokenData?.token) return;
    setRxError('');
    try {
      setRxLoading(true);
      const res = await api.getPrescriptionByToken(tokenData.token.id);
      setPrescriptionData(res.consultation);
      setPrescriptionModalOpen(true);
    } catch (err) {
      setRxError(err.message || 'The doctor is still writing your prescription. Check back in a few minutes.');
    } finally {
      setRxLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTokenStatus(tokenInput);
  };

  const status = tokenData?.token.status;
  const metaKey = status === 'waiting' && tokenData?.tokensAhead === 1 ? 'next' : status in statusMeta ? status : 'waiting';
  const meta = statusMeta[metaKey];
  const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const positionLine = () => {
    if (status === 'serving') return 'Your turn now';
    if (status === 'completed') return 'Consultation complete';
    const ahead = Math.max(0, (tokenData.tokensAhead || 0) - 1);
    if (ahead === 0) return 'You are up next';
    if (ahead === 1) return '1 person ahead of you';
    return `${ahead} people ahead of you`;
  };

  return (
    <div className="max-w-3xl w-full min-w-0 mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <header className="mb-6 animate-fade-in">
        <h1 className="page-title">Track your queue</h1>
        <p className="page-subtitle">Live token status. Watch your spot from your phone instead of the waiting room.</p>

        <form onSubmit={handleSearch} className="flex gap-2 mt-5" role="search">
          <label htmlFor="token-search" className="sr-only">Token number or phone number</label>
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-[13.5px] text-tertiary pointer-events-none" aria-hidden="true" />
            <input
              id="token-search"
              type="text"
              inputMode="tel"
              placeholder="Token or phone number"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="input-base pl-10 tabular"
            />
          </div>
          <button type="submit" disabled={loading || !tokenInput.trim()} className="btn-primary px-5">
            {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
            <span>Track</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 mt-3 text-footnote text-secondary">
          <span>Demo tokens</span>
          {['103', '104', '105', '107'].map((tok) => (
            <button
              key={tok}
              type="button"
              onClick={() => {
                setTokenInput(tok);
                fetchTokenStatus(tok);
              }}
              className="min-h-[44px] px-3.5 rounded-full bg-fill text-accent text-subheadline font-semibold tabular transition-colors hover:bg-separator"
            >
              #{tok}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div role="alert" className="card p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="icon-tile icon-tile-red">
              <AlertCircle size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-headline">{errorIsNetwork ? 'We could not reach the clinic server' : 'We could not find that token'}</p>
              <p className="text-subheadline text-secondary mt-0.5">{error}</p>
            </div>
          </div>
          {errorIsNetwork && (
            <button type="button" onClick={() => fetchTokenStatus(tokenInput)} disabled={loading} className="btn-secondary shrink-0">
              <RefreshCw size={14} aria-hidden="true" /> Try again
            </button>
          )}
        </div>
      )}

      {loading && !tokenData && !error && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading token status">
          <div className="h-56 skeleton rounded-card" />
          <div className="grid grid-cols-2 gap-4">
            {[0, 1].map((i) => <div key={i} className="h-28 skeleton rounded-card" />)}
          </div>
        </div>
      )}

      {!loading && !tokenData && !error && (
        <div className="empty-state">
          <Ticket size={28} className="mx-auto mb-3" aria-hidden="true" />
          <p className="text-body font-medium text-label">Enter your token to see live status</p>
          <p className="mt-1">Your token number is printed on your OPD slip.</p>
        </div>
      )}

      {tokenData && (
        <section aria-live="polite" aria-label="Queue status" className="space-y-6">
          <div className={`card p-6 sm:p-8 text-center ${status === 'serving' ? 'animate-pulse-glow' : ''}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="section-title">Your token</span>
              <span className={meta.badge}>
                <span className={`w-1.5 h-1.5 rounded-full bg-current ${status === 'serving' ? 'animate-ping' : ''}`} aria-hidden="true" />
                {meta.label}
              </span>
            </div>

            <div className={`token-badge text-[72px] sm:text-[96px] leading-none mt-5 ${meta.hero}`} aria-label={`Token ${tokenData.token.displayToken}`}>
              {tokenData.token.displayToken}
            </div>
            <p className="text-title3 mt-3 text-label">{positionLine()}</p>
            <p className="text-subheadline text-secondary mt-1">{tokenData.token.patientName}</p>

            {tokenData.tokensAhead <= 2 && status === 'waiting' && (
              <div role="status" className="mt-6 p-4 rounded-control bg-orange-tint flex items-center gap-3 text-left">
                <span className="icon-tile icon-tile-orange w-10 h-10 rounded-xl">
                  <BellRing size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-headline text-label">
                    {tokenData.tokensAhead === 1 ? 'You are next in line' : 'Your turn is approaching'}
                  </h2>
                  <p className="text-footnote text-secondary mt-0.5">
                    Please make your way to <strong className="text-label font-semibold">{tokenData.token.roomNumber}</strong>.
                  </p>
                </div>
              </div>
            )}

            {status === 'serving' && (
              <div role="status" className="mt-6 p-4 rounded-control bg-green-tint flex items-center gap-3 text-left">
                <span className="icon-tile icon-tile-green w-10 h-10 rounded-xl">
                  <DoorOpen size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-headline text-label">Please enter {tokenData.token.roomNumber} now</h2>
                  <p className="text-footnote text-secondary mt-0.5">{tokenData.doctor?.name} is ready to see you.</p>
                </div>
              </div>
            )}

            {status === 'completed' && (
              <div className="mt-6 p-4 rounded-control bg-green-tint text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="icon-tile icon-tile-green w-10 h-10 rounded-xl">
                      <CheckCircle2 size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-headline text-label">Your consultation is complete</h2>
                      <p className="text-footnote text-secondary mt-0.5">Your digital prescription is ready to view and print.</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleFetchPrescription} disabled={rxLoading} className="btn-success shrink-0">
                    {rxLoading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                    <span>{rxLoading ? 'Loading' : 'View prescription'}</span>
                  </button>
                </div>
                {rxError && (
                  <p role="alert" className="input-error-text flex items-center gap-1.5 mt-3">
                    <AlertCircle size={14} aria-hidden="true" /> {rxError}
                  </p>
                )}
              </div>
            )}
          </div>

          {status === 'completed' && (
            <FeedbackCard tokenId={tokenData.token.id} displayToken={tokenData.token.displayToken} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Metric
              icon={Radio}
              tile="icon-tile-green"
              label="Now serving"
              value={tokenData.currentServing ? tokenData.currentServing.displayToken : '--'}
              caption="In the doctor's room"
            />
            <Metric
              icon={Timer}
              tile="icon-tile-orange"
              label="Wait time"
              value={`~${tokenData.estimatedWaitMins}`}
              unit="min"
              caption={
                <span className="inline-flex items-center gap-1">
                  <Users size={13} aria-hidden="true" />
                  <strong className="text-label font-semibold">{Math.max(0, (tokenData.tokensAhead || 0) - 1)}</strong> ahead of you
                </span>
              }
            />
          </div>

          <div className="space-y-2">
            <h2 className="section-title px-4">Appointment</h2>
            <dl className="list-inset">
              <div className="list-row">
                {tokenData.doctor?.avatarUrl ? (
                  <img src={tokenData.doctor.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-fill shrink-0" />
                ) : (
                  <span className="icon-tile icon-tile-indigo"><Stethoscope size={16} aria-hidden="true" /></span>
                )}
                <div className="flex-1 min-w-0">
                  <dt className="sr-only">Doctor</dt>
                  <dd className="text-headline truncate">{tokenData.doctor?.name}</dd>
                  <dd className="text-subheadline text-secondary truncate">{tokenData.doctor?.specialization}</dd>
                </div>
              </div>
              <div className="list-row justify-between">
                <dt className="flex items-center gap-3 text-label">
                  <span className="icon-tile icon-tile-teal"><MapPin size={16} aria-hidden="true" /></span> Room
                </dt>
                <dd className="text-secondary tabular">{tokenData.token.roomNumber}</dd>
              </div>
              <div className="list-row justify-between">
                <dt className="flex items-center gap-3 text-label">
                  <span className="icon-tile icon-tile-gray"><Clock size={16} aria-hidden="true" /></span> Checked in
                </dt>
                <dd className="text-secondary tabular">{fmtTime(tokenData.token.checkInTime)}</dd>
              </div>
              {lastUpdated && (
                <div className="list-row justify-between">
                  <dt className="flex items-center gap-3 text-label">
                    <span className="icon-tile"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" /></span> Last updated
                  </dt>
                  <dd className="text-secondary tabular">{fmtTime(lastUpdated)}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}

      <MedicalPrescriptionModal
        isOpen={prescriptionModalOpen}
        onClose={() => setPrescriptionModalOpen(false)}
        consultation={prescriptionData}
        doctor={tokenData?.doctor}
        clinic={clinic}
        token={tokenData?.token}
      />
    </div>
  );
};
