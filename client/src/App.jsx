import React, { useState, useEffect, lazy, Suspense } from 'react';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { NotificationToast } from './components/NotificationToast';
import { PageLoader } from './components/PageLoader';
import { api } from './services/api';
import { ArrowLeft, ShieldCheck, Stethoscope, ClipboardList, WifiOff } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';

const PatientBookingPage = lazy(() => import('./pages/PatientBookingPage').then((m) => ({ default: m.PatientBookingPage })));
const PatientQueueTracker = lazy(() => import('./pages/PatientQueueTracker').then((m) => ({ default: m.PatientQueueTracker })));
const WaitingRoomTVPage = lazy(() => import('./pages/WaitingRoomTVPage').then((m) => ({ default: m.WaitingRoomTVPage })));
const ReceptionistDashboard = lazy(() => import('./pages/ReceptionistDashboard').then((m) => ({ default: m.ReceptionistDashboard })));
const DoctorDeskPage = lazy(() => import('./pages/DoctorDeskPage').then((m) => ({ default: m.DoctorDeskPage })));
const AnalyticsReportPage = lazy(() => import('./pages/AnalyticsReportPage').then((m) => ({ default: m.AnalyticsReportPage })));

function ConnectionBanner() {
  const { connectionStatus } = useSocket();
  if (connectionStatus !== 'reconnecting' && connectionStatus !== 'disconnected') return null;
  return (
    <div role="status" aria-live="polite" className="status-banner">
      <WifiOff size={16} aria-hidden="true" />
      Reconnecting to live updates. The queue shown may be a few seconds old.
    </div>
  );
}

function StaffGate({ role, children }) {
  const { user, loginAsReceptionist, loginAsDoctor } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return children;

  const signIn = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message || 'Could not sign in. Check that the server is running, then try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="card max-w-sm w-full p-8 text-center animate-fade-in">
        <div className="icon-tile w-14 h-14 rounded-2xl mx-auto mb-5">
          <ShieldCheck size={28} />
        </div>
        <h2 className="text-title2 text-label mb-1.5">Staff sign in required</h2>
        <p className="text-subheadline text-secondary mb-6">
          {role === 'doctor' ? 'The doctor desk' : 'The reception desk'} is for clinic staff. Continue with a demo account.
        </p>
        <div className="grid gap-2.5">
          <button className="btn-primary" disabled={busy} onClick={() => signIn(loginAsReceptionist)}>
            <ClipboardList size={18} aria-hidden="true" /> Continue as receptionist
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => signIn(() => loginAsDoctor('doc-1'))}>
            <Stethoscope size={18} aria-hidden="true" /> Continue as doctor
          </button>
        </div>
        {error && <p role="alert" className="text-footnote text-red mt-4">{error}</p>}
      </div>
    </div>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('book');
  const [clinic, setClinic] = useState(null);
  const [trackedTokenNumber, setTrackedTokenNumber] = useState('104');

  useEffect(() => {
    loadClinic();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab]);

  const loadClinic = async () => {
    try {
      const data = await api.getClinic();
      setClinic(data.clinic);
    } catch {
      setClinic(null);
    }
  };

  const handleNavigateToTracker = (tokenNum = '104') => {
    if (tokenNum) setTrackedTokenNumber(tokenNum);
    setActiveTab('track');
  };

  const isTV = activeTab === 'tv';

  return (
    <div className="min-h-screen bg-grouped text-label flex flex-col">
      <a href="#main-content" className="sr-only-focusable fixed top-2 left-2 z-[60] btn-primary btn-sm">
        Skip to content
      </a>

      {!isTV && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          clinic={clinic}
        />
      )}
      <ConnectionBanner />

      <main id="main-content" className="flex-1 flex flex-col" tabIndex={-1}>
        <Suspense fallback={<PageLoader />}>
        {activeTab === 'book' && (
          <PatientBookingPage onNavigateToTracker={handleNavigateToTracker} />
        )}

        {activeTab === 'track' && (
          <PatientQueueTracker initialTokenNumber={trackedTokenNumber} />
        )}

        {isTV && (
          <div className="flex-1 flex flex-col">
            <div className="px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-footnote text-secondary">
              <span className="truncate">
                Waiting room TV
                <span className="hidden sm:inline">. Full screen signage for the lobby display.</span>
              </span>
              <button
                onClick={() => setActiveTab('reception')}
                className="btn-ghost btn-sm shrink-0 -mr-3"
              >
                <ArrowLeft size={14} aria-hidden="true" /> Back to reception
              </button>
            </div>
            <WaitingRoomTVPage clinic={clinic} />
          </div>
        )}

        {activeTab === 'reception' && (
          <StaffGate role="reception">
            <ReceptionistDashboard
              clinic={clinic}
              onNavigateToTracker={handleNavigateToTracker}
            />
          </StaffGate>
        )}

        {activeTab === 'doctor' && (
          <StaffGate role="doctor">
            <DoctorDeskPage />
          </StaffGate>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsReportPage />
        )}
        </Suspense>
      </main>

      <NotificationToast />

      {!isTV && (
        <footer className="py-6 pb-28 lg:pb-6 text-footnote text-secondary">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-1.5">
            <p>MediQ. Hospital appointment and real-time OPD queue management.</p>
            <p className="tabular">{clinic?.name || 'Pilot clinic'} · v1.0</p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
