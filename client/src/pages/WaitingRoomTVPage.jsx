import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Bell,
  WifiOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const shortRoom = (room) => (room || '').replace(/\s*\(.*\)\s*$/, '');

const TVSkeleton = () => (
  <section aria-label="Loading queue board" aria-busy="true" className="grid gap-4 flex-1 grid-cols-1 md:grid-cols-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="card p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3.5">
          <div className="skeleton w-14 h-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-24 w-48" />
          <div className="skeleton h-6 w-40" />
        </div>
        <div className="skeleton h-5 w-full" />
      </div>
    ))}
  </section>
);

export const WaitingRoomTVPage = ({ clinic }) => {
  const [doctors, setDoctors] = useState([]);
  const [queueTokens, setQueueTokens] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const { latestCalledToken, queueTick, isAudioMuted, toggleSound, testChime, connectionStatus } = useSocket();

  useEffect(() => {
    loadData();
  }, [queueTick]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      clearInterval(timer);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, []);

  const loadData = async () => {
    try {
      const [docRes, queueRes] = await Promise.all([
        api.getDoctors(),
        api.getQueue()
      ]);
      setDoctors(docRes.doctors || []);
      setQueueTokens(queueRes.tokens || []);
      setLoaded(true);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load the queue board.');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const servingTokens = queueTokens.filter(t => t.status === 'serving' || t.status === 'called');
  const waitingTokens = queueTokens.filter(t => t.status === 'waiting');
  const notice = clinic?.activeNotice || 'Welcome. Please keep your token slip or phone pass ready. Emergency cases are prioritised.';
  const iconBtn = 'w-11 h-11 flex items-center justify-center rounded-full bg-fill text-accent transition-colors hover:brightness-95';

  return (
    <div className={`min-h-screen bg-grouped text-label flex flex-col gap-5 p-4 sm:p-6 lg:p-8 select-none ${
      isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto' : 'flex-1'
    }`}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1 basis-60">
          <p className="text-footnote text-secondary tabular">
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-title1 sm:text-large-title text-label sm:truncate">
            {clinic?.name || 'MediQ Health Clinic'}
          </h1>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:block text-right">
            <div className="text-title1 tabular text-label leading-none">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <p className="text-footnote text-secondary mt-1 flex items-center justify-end gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green" aria-hidden="true" /> Live queue
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              aria-label={isAudioMuted ? 'Unmute chime' : 'Mute chime'}
              title={isAudioMuted ? 'Unmute chime' : 'Mute chime'}
              aria-pressed={isAudioMuted}
              className={`${iconBtn} ${isAudioMuted ? 'text-red' : ''}`}
            >
              {isAudioMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button
              type="button"
              onClick={testChime}
              aria-label="Play test chime"
              title="Play test chime"
              className={iconBtn}
            >
              <Bell size={20} />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-accent text-white"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </header>

      {connectionStatus !== 'connected' && (
        <div role="status" aria-live="polite" className="status-banner rounded-control text-subheadline">
          <WifiOff size={18} aria-hidden="true" />
          {connectionStatus === 'connecting' ? 'Connecting to the live queue' : 'Connection lost, reconnecting. The board may be a few seconds behind.'}
        </div>
      )}

      {loadError && (
        <div role="alert" className="card p-5 flex flex-col sm:flex-row sm:items-center gap-3 text-left">
          <span className="icon-tile icon-tile-red" aria-hidden="true"><AlertCircle size={16} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-headline text-label">{loaded ? 'The board could not refresh' : 'The board could not be loaded'}</p>
            <p className="text-subheadline text-secondary">{loadError}</p>
          </div>
          <button type="button" onClick={loadData} className="btn-secondary shrink-0">
            <RefreshCw size={16} aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {!loaded ? (!loadError && <TVSkeleton />) : (
      <section
        aria-label="Now serving"
        className={`grid gap-4 flex-1 ${doctors.length >= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}
      >
        {doctors.map((doc) => {
          const currentToken = servingTokens.find(t => t.doctorId === doc.id);
          const isLatestCalled = Boolean(currentToken) && latestCalledToken?.token?.id === currentToken.id;
          const waitingHere = waitingTokens.filter(t => t.doctorId === doc.id).length;

          return (
            <article
              key={doc.id}
              className={`card p-6 flex flex-col transition-shadow duration-500 ${isLatestCalled ? 'animate-pulse-glow' : ''}`}
            >
              <div className="flex items-center gap-3.5">
                <img
                  src={doc.avatarUrl}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover bg-fill shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-title3 text-label truncate">{doc.name}</h2>
                  <p className="text-subheadline text-secondary truncate">{doc.specialization}</p>
                </div>
                <span className="badge-slate text-subheadline tabular shrink-0">{shortRoom(doc.roomNumber)}</span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <span className="section-title">Now serving</span>

                {currentToken ? (
                  <div key={currentToken.id} className="mt-3 w-full min-w-0 animate-token-pop">
                    <span className={`token-badge block whitespace-nowrap text-7xl md:text-5xl lg:text-7xl xl:text-8xl 2xl:text-9xl leading-none ${
                      isLatestCalled ? 'text-accent' : 'text-label'
                    }`}>
                      {currentToken.displayToken}
                    </span>
                    <p className="text-title2 text-label mt-5 truncate max-w-sm mx-auto">
                      {currentToken.patientName}
                    </p>
                    <p className="text-body text-secondary mt-1">
                      Please go to {doc.roomNumber}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 w-full min-w-0">
                    <span className="token-badge block text-7xl md:text-5xl lg:text-7xl xl:text-8xl leading-none text-tertiary">--</span>
                    <p className="text-body text-secondary mt-5">Waiting for the next call</p>
                  </div>
                )}
              </div>

              <div className="pt-4 divider flex items-center justify-between text-subheadline text-secondary">
                <span>Waiting for this doctor</span>
                <span className="text-headline text-label tabular">{waitingHere}</span>
              </div>
            </article>
          );
        })}
      </section>
      )}

      <section aria-label="Upcoming tokens">
        <div className="flex items-center justify-between gap-2 px-4 mb-2">
          <h2 className="section-title">Up next</h2>
          <span className="text-footnote text-secondary tabular">{waitingTokens.length} waiting</span>
        </div>

        <div className="list-inset">
          {waitingTokens.length === 0 ? (
            <p className="list-row text-secondary">No patients in the waiting line.</p>
          ) : (
            <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 pl-4 md:gap-x-4 [&>li:last-child]:border-b-0">
              {waitingTokens.slice(0, 12).map((tok, idx) => (
                <li key={tok.id} className="flex items-center gap-3 min-h-[44px] py-2.5 pr-4 border-b border-separator">
                  <span className={`token-badge text-title2 tabular w-20 shrink-0 ${idx === 0 ? 'text-accent' : 'text-label'}`}>{tok.displayToken}</span>
                  <span className="text-body text-label truncate flex-1">{tok.patientName}</span>
                  <span className="text-subheadline text-secondary tabular shrink-0">{shortRoom(tok.roomNumber)}</span>
                  {idx === 0 && <span className="sr-only">next in line</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <div className="px-4 text-footnote text-secondary flex items-center gap-3 overflow-hidden">
        <span className="shrink-0 font-semibold">Notice</span>
        <div className="flex-1 overflow-hidden" aria-live="off">
          <span className="marquee-track">{notice}</span>
        </div>
      </div>
    </div>
  );
};
