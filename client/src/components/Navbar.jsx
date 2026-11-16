import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Calendar,
  Ticket,
  Tv,
  Users,
  Stethoscope,
  BarChart3,
  Volume2,
  VolumeX,
  RotateCcw,
  UserCircle2,
  Wifi,
  WifiOff,
  LogOut,
  Bell,
  Check,
  Settings2
} from 'lucide-react';

const navItems = [
  { id: 'book', label: 'Book', fullLabel: 'Book appointment', icon: Calendar },
  { id: 'track', label: 'Track', fullLabel: 'Track queue', icon: Ticket, live: true },
  { id: 'tv', label: 'TV', fullLabel: 'Waiting room TV', icon: Tv },
  { id: 'reception', label: 'Reception', fullLabel: 'Reception desk', icon: Users },
  { id: 'doctor', label: 'Doctor', fullLabel: 'Doctor desk', icon: Stethoscope },
  { id: 'analytics', label: 'Analytics', fullLabel: 'Analytics', icon: BarChart3 },
  { id: 'admin', label: 'Admin', fullLabel: 'Admin dashboard', icon: Settings2 }
];

const roles = [
  { key: 'reception', name: 'Reception Desk', detail: 'Sunita Sharma', icon: Users },
  { key: 'doc-1', name: 'Dr. Rajesh Sharma', detail: 'Room 101 · Cardiology', icon: Stethoscope },
  { key: 'doc-2', name: 'Dr. Priya Patel', detail: 'Room 102 · General Medicine', icon: Stethoscope },
  { key: 'admin', name: 'Clinic Admin', detail: 'Settings · Doctors · Reports', icon: Settings2 }
];

export const Navbar = ({ activeTab, setActiveTab, clinic }) => {
  const { isConnected, isAudioMuted, toggleSound, testChime } = useSocket();
  const { user, loginAsReceptionist, loginAsDoctor, loginAsAdmin, logout } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetError, setResetError] = useState('');
  const dropdownRef = useRef(null);
  const resetRef = useRef(null);

  useEffect(() => {
    if (!roleDropdownOpen) return;
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setRoleDropdownOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setRoleDropdownOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [roleDropdownOpen]);

  useEffect(() => {
    if (!confirmReset) return;
    const onClick = (e) => {
      if (resetRef.current && !resetRef.current.contains(e.target)) setConfirmReset(false);
    };
    const onKey = (e) => e.key === 'Escape' && setConfirmReset(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [confirmReset]);

  const go = (tab) => {
    setActiveTab(tab);
    setRoleDropdownOpen(false);
  };

  const selectRole = (key) => {
    if (key === 'reception') {
      loginAsReceptionist();
      go('reception');
    } else if (key === 'admin') {
      loginAsAdmin();
      go('admin');
    } else {
      loginAsDoctor(key);
      go('doctor');
    }
  };

  const askReset = () => {
    setRoleDropdownOpen(false);
    setResetError('');
    setConfirmReset(true);
  };

  const handleResetData = async () => {
    setResetting(true);
    setResetError('');
    try {
      await api.resetDemoData();
      setConfirmReset(false);
    } catch (err) {
      setResetError(err.message || 'Reset failed. Try again.');
    } finally {
      setResetting(false);
    }
  };

  const hours = clinic?.openTime && clinic?.closeTime ? `OPD ${clinic.openTime} to ${clinic.closeTime}` : null;
  const activeIndex = Math.max(0, navItems.findIndex((i) => i.id === activeTab));
  const iconBtn = 'w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-fill';

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass border-x-0 border-t-0 rounded-none shadow-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 h-[52px] lg:h-14">
          <button
            type="button"
            onClick={() => go('book')}
            className="flex items-center gap-2.5 rounded-lg min-w-0 shrink-0 min-h-[44px]"
            aria-label="MediQ home"
          >
            <span className="icon-tile w-7 h-7 rounded-[7px]" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.5 5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3h-5.5z" /></svg>
            </span>
            <span className="text-headline text-label">MediQ</span>
          </button>

          <nav aria-label="Sections" className="hidden lg:block">
            <div className="segmented">
              <span
                className="segmented-thumb"
                aria-hidden="true"
                style={{ width: `calc((100% - 4px) / ${navItems.length})`, left: `calc(2px + (100% - 4px) * ${activeIndex} / ${navItems.length})` }}
              />
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => go(item.id)}
                    className="segmented-item flex-1"
                  >
                    {item.label}
                    {item.live && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green" aria-hidden="true" />
                    )}
                    {item.live && <span className="sr-only">live updates</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={isAudioMuted}
              aria-label={isAudioMuted ? 'Unmute chime' : 'Mute chime'}
              title={isAudioMuted ? 'Unmute chime' : 'Mute chime'}
              className={`${iconBtn} ${isAudioMuted ? 'text-red' : 'text-accent'}`}
            >
              {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              type="button"
              onClick={testChime}
              title="Play test chime"
              aria-label="Play test chime"
              className={`${iconBtn} text-accent hidden sm:flex`}
            >
              <Bell size={18} />
            </button>
            <div className="relative" ref={resetRef}>
              <button
                type="button"
                onClick={() => (confirmReset ? setConfirmReset(false) : askReset())}
                disabled={resetting}
                title="Reset demo data"
                aria-label="Reset demo data"
                aria-haspopup="dialog"
                aria-expanded={confirmReset}
                className={`${iconBtn} text-accent hidden sm:flex disabled:opacity-40 ${confirmReset ? 'bg-fill' : ''}`}
              >
                <RotateCcw size={18} className={resetting ? 'animate-spin' : ''} aria-hidden="true" />
              </button>
              {confirmReset && (
                <div
                  role="dialog"
                  aria-labelledby="reset-title"
                  className="popover bg-surface absolute right-0 mt-2 w-72 z-50 p-4 animate-scale-in origin-top-right"
                >
                  <p id="reset-title" className="text-headline text-label">Reset demo data?</p>
                  <p className="text-footnote text-secondary mt-1">
                    All bookings and queue tokens go back to the demo starting point. This cannot be undone.
                  </p>
                  {resetError && <p role="alert" className="text-footnote text-red mt-2">{resetError}</p>}
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => setConfirmReset(false)} disabled={resetting} className="btn-secondary btn-sm flex-1">
                      Cancel
                    </button>
                    <button type="button" onClick={handleResetData} disabled={resetting} className="btn-danger btn-sm flex-1" autoFocus>
                      {resetting ? 'Resetting' : 'Reset'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                aria-haspopup="menu"
                aria-expanded={roleDropdownOpen}
                aria-label={`Switch role, currently ${user ? user.name : 'Guest'}`}
                className={`${iconBtn} text-accent ${roleDropdownOpen ? 'bg-fill' : ''}`}
              >
                <UserCircle2 size={22} aria-hidden="true" />
              </button>

              {roleDropdownOpen && (
                <div
                  role="menu"
                  className="popover bg-surface absolute right-0 mt-2 w-72 z-50 animate-scale-in origin-top-right"
                >
                  <div className="px-3 pt-2 pb-1.5">
                    <p className="text-footnote text-secondary">Signed in as</p>
                    <p className="text-headline text-label truncate">{user ? user.name : 'Guest'}</p>
                  </div>
                  <div className="divider mx-3 my-1" />
                  <p className="section-title px-3 pt-2 pb-1">Switch role</p>
                  {roles.map((r) => {
                    const Icon = r.icon;
                    const active = user?.name === r.name;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        role="menuitem"
                        onClick={() => selectRole(r.key)}
                        aria-current={active ? 'true' : undefined}
                        className="menu-item"
                      >
                        <span className="w-8 h-8 rounded-lg bg-fill flex items-center justify-center text-accent shrink-0" aria-hidden="true">
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-subheadline font-medium text-label truncate">{r.name}</span>
                          <span className="block text-footnote text-secondary truncate">{r.detail}</span>
                        </span>
                        {active && <Check size={16} className="text-accent shrink-0" aria-hidden="true" />}
                      </button>
                    );
                  })}
                  <div className="divider mx-3 my-1" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={askReset}
                    disabled={resetting}
                    className="menu-item"
                  >
                    <RotateCcw size={16} className={`text-accent ${resetting ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span className="text-subheadline">Reset demo data</span>
                  </button>
                  {user && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { logout(); setRoleDropdownOpen(false); }}
                      className="menu-item text-red"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      <span className="text-subheadline text-red">Log out</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-1.5 -mt-0.5 flex items-center justify-between gap-3 text-footnote text-secondary">
          <span className="truncate">{clinic?.activeNotice || 'OPD queue active. Emergency and senior patients are prioritised.'}</span>
          <span className="flex items-center gap-3 shrink-0 tabular">
            {hours && <span className="hidden sm:inline">{hours}</span>}
            <span className={`flex items-center gap-1 ${isConnected ? 'text-green' : 'text-orange'}`}>
              {isConnected ? <Wifi size={12} aria-hidden="true" /> : <WifiOff size={12} aria-hidden="true" />}
              {isConnected ? 'Live' : 'Reconnecting'}
            </span>
          </span>
        </div>
      </header>

      <nav aria-label="Sections" className="tab-bar glass lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => go(item.id)}
              className="tab-bar-item"
            >
              <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
