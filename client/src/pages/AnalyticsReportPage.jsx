import React, { useState, useEffect } from 'react';
import { api, BACKEND_URL } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  BarChart3,
  Clock,
  Users,
  Award,
  Download,
  Database,
  Copy,
  Check,
  MessageSquare,
  PhoneCall,
  ArrowDownRight,
  X,
  RefreshCw,
  AlertCircle
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

const BarChart = ({ rows, maxValue }) => (
  <div className="space-y-3">
    {rows.map((row) => (
      <div key={row.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-subheadline">
        <span className="text-label truncate">{row.label}</span>
        <div className="h-2 rounded-full bg-fill overflow-hidden" aria-hidden="true">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700"
            style={{ width: `${maxValue ? Math.min(100, (row.value / maxValue) * 100) : 0}%` }}
          />
        </div>
        <span className="text-headline text-label tabular w-8 text-right">{row.value}</span>
      </div>
    ))}
  </div>
);

const SplitBar = ({ segments, total }) => (
  <div>
    <div className="flex h-2.5 rounded-full overflow-hidden bg-fill gap-0.5" aria-hidden="true">
      {segments.map((s) => (
        <div
          key={s.label}
          className={s.color}
          style={{ width: `${total ? (s.value / total) * 100 : 0}%` }}
          title={`${s.label}: ${s.value}`}
        />
      ))}
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-footnote text-secondary">
      {segments.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${s.color}`} aria-hidden="true" />
          {s.label} <span className="font-semibold text-label tabular">{s.value}</span>
        </span>
      ))}
    </div>
  </div>
);

export const AnalyticsReportPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [schemaSql, setSchemaSql] = useState('');
  const [schemaError, setSchemaError] = useState('');
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { queueTick } = useSocket();

  useEffect(() => {
    loadData();
  }, [queueTick]);

  useEffect(() => {
    if (!schemaModalOpen) return;
    const onKey = (e) => e.key === 'Escape' && setSchemaModalOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [schemaModalOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [anRes, notifRes] = await Promise.all([
        api.getAnalytics(),
        api.getNotifications(15)
      ]);
      setAnalytics(anRes);
      setNotifications(notifRes.notifications || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load analytics right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSchema = async () => {
    setSchemaError('');
    setSchemaLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/schema/postgresql`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setSchemaSql(await res.text());
      setSchemaModalOpen(true);
    } catch {
      setSchemaError('Could not load the schema. Check that the server is running, then try again.');
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const impact = analytics?.pilotImpact || {
    traditionalWaitMinutes: 52,
    systemWaitMinutes: 14,
    waitTimeReductionPercent: 73,
    patientSatisfactionRating: 4.8
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    const csvRows = [
      ['Metric', 'Value'],
      ['Total Patients Seen Today', analytics.totalPatientsToday],
      ['Consultations Completed', analytics.completedToday],
      ['Currently Waiting', analytics.currentlyWaiting],
      ['Average Wait Time (Minutes)', analytics.avgWaitTimeMinutes],
      ['Average Consultation Time (Minutes)', analytics.avgConsultTimeMinutes],
      ['Walk-in Patients', analytics.walkIns],
      ['Online Bookings', analytics.bookedAppointments],
      ['Missed / No Shows', analytics.noShows],
      ['Traditional Clinic Wait (Before Pilot)', impact.traditionalWaitMinutes],
      ['Smart Queue Wait (After Pilot)', analytics.avgWaitTimeMinutes],
      ['Wait Time Reduction', `${impact.waitTimeReductionPercent}%`]
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'MediQ_Pilot_Impact_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!analytics && loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full space-y-5" aria-busy="true" aria-label="Loading analytics">
        <div className="skeleton h-10 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-32" />)}
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (!analytics && error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="page-title mb-6">Analytics</h1>
        <div role="alert" className="card max-w-md mx-auto p-6 text-center">
          <AlertCircle size={24} className="text-red mx-auto mb-2" aria-hidden="true" />
          <p className="text-headline text-label">Analytics could not be loaded</p>
          <p className="text-subheadline text-secondary mt-1">{error}</p>
          <button type="button" onClick={loadData} className="btn-secondary mt-4">
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  }

  const avgWait = analytics?.avgWaitTimeMinutes ?? impact.systemWaitMinutes;
  const minutesSaved = Math.max(0, impact.traditionalWaitMinutes - avgWait);
  const doctorStats = analytics?.doctorStats || [];
  const maxDoctorTotal = Math.max(1, ...doctorStats.map(d => d.totalPatients));
  const statusSegments = [
    { label: 'Completed', value: analytics?.completedToday || 0, color: 'bg-green' },
    { label: 'Serving', value: analytics?.currentlyServing || 0, color: 'bg-accent' },
    { label: 'Waiting', value: analytics?.currentlyWaiting || 0, color: 'bg-orange' },
    { label: 'No show', value: analytics?.noShows || 0, color: 'bg-red' }
  ];
  const sourceSegments = [
    { label: 'Online bookings', value: analytics?.bookedAppointments || 0, color: 'bg-indigo' },
    { label: 'Walk-ins', value: analytics?.walkIns || 0, color: 'bg-teal' }
  ];
  const waitMax = Math.max(1, impact.traditionalWaitMinutes, avgWait);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full min-w-0 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle max-w-2xl">
            Queue throughput, waiting time reduction and notification log for the clinic pilot.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={loadData} disabled={loading} className="btn-secondary btn-icon" aria-label="Refresh analytics" title="Refresh analytics">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
          <button type="button" onClick={handleOpenSchema} disabled={schemaLoading} className="btn-secondary">
            <Database size={15} aria-hidden="true" /> SQL schema
          </button>
          <button type="button" onClick={handleExportCSV} className="btn-primary">
            <Download size={15} aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>

      {(error || schemaError) && (
        <div role="alert" className="flex flex-wrap items-center gap-2.5 px-3.5 py-2.5 rounded-control bg-red-tint text-subheadline text-red">
          <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0 py-1">{error || schemaError}</span>
          <button type="button" onClick={error ? loadData : handleOpenSchema} className="btn-danger-soft btn-sm">
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Patients today"
          value={analytics?.totalPatientsToday || 0}
          hint={`${analytics?.walkIns || 0} walk-ins, ${analytics?.bookedAppointments || 0} bookings`}
          icon={Users}
          tone=""
        />
        <StatCard
          label="Average wait"
          value={avgWait}
          unit="min"
          hint={
            impact.waitTimeReductionPercent > 0 ? (
              <span className="text-green font-medium flex items-center gap-1">
                <ArrowDownRight size={14} aria-hidden="true" /> {impact.waitTimeReductionPercent}% less than a manual desk
              </span>
            ) : 'Live average for today'
          }
          icon={Clock}
          tone="icon-tile-green"
        />
        <StatCard
          label="Average consult"
          value={analytics?.avgConsultTimeMinutes || 0}
          unit="min"
          hint="Per completed consultation"
          icon={BarChart3}
          tone="icon-tile-indigo"
        />
        <StatCard
          label="Pilot rating"
          value={impact.patientSatisfactionRating}
          unit="/ 5"
          hint="Patient feedback during pilot"
          icon={Award}
          tone="icon-tile-orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="card lg:col-span-3">
          <div className="card-header">
            <h2 className="text-headline text-label">Wait time, before and after</h2>
            <span className="badge-emerald tabular">{impact.waitTimeReductionPercent}% shorter</span>
          </div>
          <div className="card-body space-y-6">
            <p className="text-title2 text-label">
              Patients wait <span className="text-accent tabular">{minutesSaved} minutes</span> less than at a manual token desk.
            </p>
            <div className="space-y-4" role="img" aria-label={`Manual token desk ${impact.traditionalWaitMinutes} minutes, MediQ smart queue ${avgWait} minutes`}>
              {[
                { label: 'Manual token desk', value: impact.traditionalWaitMinutes, bar: 'bg-separator', text: 'text-secondary' },
                { label: 'MediQ smart queue', value: avgWait, bar: 'bg-accent', text: 'text-accent' }
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-subheadline text-label">{row.label}</span>
                    <span className={`text-title2 tabular ${row.text}`}>
                      {row.value}<span className="text-footnote font-normal text-secondary ml-1">min</span>
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-fill overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.bar} transition-[width] duration-700`}
                      style={{ width: `${Math.max(2, Math.min(100, (row.value / waitMax) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-footnote text-secondary">
              Manual desk figure is the pre-pilot baseline. Smart queue figure is today's live average.
            </p>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="text-headline text-label">Today's queue mix</h2>
          </div>
          <div className="card-body space-y-6">
            <div>
              <p className="text-subheadline font-medium text-secondary mb-2">By status</p>
              <SplitBar segments={statusSegments} total={statusSegments.reduce((s, x) => s + x.value, 0)} />
            </div>
            <div>
              <p className="text-subheadline font-medium text-secondary mb-2">By source</p>
              <SplitBar segments={sourceSegments} total={sourceSegments.reduce((s, x) => s + x.value, 0)} />
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between gap-2 px-4 mb-2">
          <h2 className="section-title">Doctor OPD performance</h2>
          <span className="text-footnote text-secondary tabular">{doctorStats.length} chambers</span>
        </div>
        <div className="card overflow-hidden">
          <div className="card-body">
            <BarChart
              rows={doctorStats.map(d => ({ label: d.name, value: d.totalPatients }))}
              maxValue={maxDoctorTotal}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Room</th>
                  <th className="text-right">Patients</th>
                  <th className="text-right">Completed</th>
                  <th className="text-right">Waiting</th>
                  <th>Serving</th>
                </tr>
              </thead>
              <tbody>
                {doctorStats.map((doc) => (
                  <tr key={doc.doctorId}>
                    <td>
                      <div className="text-subheadline font-medium text-label">{doc.name}</div>
                      <div className="text-footnote text-secondary">{doc.specialization}</div>
                    </td>
                    <td className="text-secondary tabular">{doc.roomNumber}</td>
                    <td className="text-label font-medium text-right tabular">{doc.totalPatients}</td>
                    <td className="text-green font-medium text-right tabular">{doc.completed}</td>
                    <td className="text-orange font-medium text-right tabular">{doc.waiting}</td>
                    <td>
                      <span className={doc.currentServing !== 'None' ? 'badge-emerald tabular' : 'badge-slate tabular'}>
                        {doc.currentServing}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2 px-4 mb-2">
          <h2 className="section-title">Notification log</h2>
          <span className="text-footnote text-secondary tabular">Last {notifications.length} sent</span>
        </div>
        <div className="list-inset max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="list-row text-secondary">No notifications sent yet. They appear here as tokens are called.</p>
          ) : (
            notifications.map((n) => {
              const isWhatsApp = n.channel === 'WHATSAPP';
              const Icon = isWhatsApp ? MessageSquare : PhoneCall;
              return (
                <div key={n.id} className="list-row items-start py-3">
                  <span className={`icon-tile ${isWhatsApp ? 'icon-tile-green' : ''}`} aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-subheadline font-medium text-label truncate">
                        {isWhatsApp ? 'WhatsApp' : 'SMS'} · {n.messageType}
                      </span>
                      <span className="text-caption text-secondary tabular shrink-0 pr-4">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-subheadline text-secondary mt-0.5 pr-4">{n.content}</p>
                    <p className="text-caption text-tertiary tabular mt-1">{n.recipientPhone} · Delivered</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {schemaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/35 animate-fade-in"
          onClick={() => setSchemaModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="schema-title"
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-t-sheet sm:rounded-sheet max-w-2xl w-full p-5 sm:p-6 flex flex-col max-h-[85vh] animate-slide-up"
          >
            <div className="flex items-center justify-between pb-3">
              <h3 id="schema-title" className="text-headline text-label">PostgreSQL schema</h3>
              <button
                type="button"
                onClick={() => setSchemaModalOpen(false)}
                aria-label="Close"
                className="w-11 h-11 -m-2 flex items-center justify-center rounded-full text-secondary hover:bg-fill"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-footnote text-secondary mb-3">
              Run this DDL in a Supabase or Railway PostgreSQL instance to deploy to the cloud.
            </p>
            <div className="flex-1 overflow-y-auto bg-surface-secondary p-4 rounded-control font-mono text-caption text-label leading-relaxed">
              <pre>{schemaSql}</pre>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSchemaModalOpen(false)} className="btn-ghost btn-sm">Close</button>
              <button type="button" onClick={handleCopySchema} className="btn-primary btn-sm">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy SQL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
