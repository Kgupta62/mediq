import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { soundController } from '../components/AudioChime';
import { BACKEND_URL } from '../services/api';

const SocketContext = createContext(null);

const QUEUE_EVENTS = [
  'TOKEN_COMPLETED',
  'TOKEN_CREATED',
  'QUEUE_UPDATED',
  'APPOINTMENT_BOOKED',
  'PATIENT_CHECKED_IN',
  'DATA_RESET'
];

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [latestCalledToken, setLatestCalledToken] = useState(null);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [isAudioMuted, setIsAudioMuted] = useState(soundController.isMuted);
  const [queueTick, setQueueTick] = useState(0);
  const tickTimer = useRef(null);
  const toastTimers = useRef(new Map());

  const bumpQueue = useCallback(() => {
    if (tickTimer.current) return;
    tickTimer.current = setTimeout(() => {
      tickTimer.current = null;
      setQueueTick((prev) => prev + 1);
    }, 120);
  }, []);

  const dismissNotification = useCallback((id) => {
    clearTimeout(toastTimers.current.get(id));
    toastTimers.current.delete(id);
    setRecentNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const options = {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000
    };
    const newSocket = BACKEND_URL ? io(BACKEND_URL, options) : io(options);
    const timers = toastTimers.current;
    let wasConnected = false;

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      if (wasConnected && !newSocket.recovered) bumpQueue();
      wasConnected = true;
    });
    newSocket.on('disconnect', () => setConnectionStatus('disconnected'));
    newSocket.io.on('reconnect_attempt', () => setConnectionStatus('reconnecting'));
    newSocket.io.on('error', () => setConnectionStatus((s) => (s === 'connected' ? s : 'reconnecting')));

    newSocket.on('TOKEN_CALLED', (data) => {
      setLatestCalledToken(data);
      bumpQueue();
      soundController.announceToken(
        data.token?.displayToken,
        data.doctor?.name || '',
        data.doctor?.roomNumber || ''
      );
    });

    newSocket.on('TOKEN_RECALLED', (data) => {
      soundController.announceToken(
        data.token?.displayToken,
        data.doctor?.name || '',
        data.token?.roomNumber || ''
      );
    });

    QUEUE_EVENTS.forEach((event) => newSocket.on(event, bumpQueue));

    newSocket.on('NOTIFICATION_DISPATCHED', (notif) => {
      setRecentNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id).slice(0, 4)]);
      clearTimeout(timers.get(notif.id));
      timers.set(notif.id, setTimeout(() => dismissNotification(notif.id), 7000));
    });

    const reconnectIfHidden = () => {
      if (document.visibilityState === 'visible' && !newSocket.connected) newSocket.connect();
    };
    const unlockAudio = () => soundController.unlock();
    document.addEventListener('visibilitychange', reconnectIfHidden);
    window.addEventListener('online', reconnectIfHidden);
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    setSocket(newSocket);

    return () => {
      document.removeEventListener('visibilitychange', reconnectIfHidden);
      window.removeEventListener('online', reconnectIfHidden);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      clearTimeout(tickTimer.current);
      tickTimer.current = null;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      newSocket.removeAllListeners();
      newSocket.io.off('reconnect_attempt');
      newSocket.io.off('error');
      newSocket.close();
      setSocket(null);
    };
  }, [bumpQueue, dismissNotification]);

  const toggleSound = useCallback(() => {
    soundController.unlock();
    setIsAudioMuted(soundController.toggleMute());
  }, []);

  const testChime = useCallback(() => {
    soundController.unlock();
    soundController.playChime();
  }, []);

  const value = useMemo(() => ({
    socket,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    latestCalledToken,
    queueTick,
    recentNotifications,
    isAudioMuted,
    toggleSound,
    testChime,
    dismissNotification
  }), [socket, connectionStatus, latestCalledToken, queueTick, recentNotifications, isAudioMuted, toggleSound, testChime, dismissNotification]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
