import React from 'react';
import { useSocket } from '../context/SocketContext';
import { MessageSquare, PhoneCall, X } from 'lucide-react';

export const NotificationToast = () => {
  const { recentNotifications, dismissNotification } = useSocket();
  const items = recentNotifications || [];

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed top-3 right-3 left-3 sm:left-auto sm:w-[380px] z-50 flex flex-col gap-2 pointer-events-none"
    >
      {items.slice(0, 3).map((notif) => {
        const isWhatsApp = notif.channel === 'WHATSAPP';
        const Icon = isWhatsApp ? MessageSquare : PhoneCall;
        return (
          <div
            key={notif.id}
            role="status"
            className="pointer-events-auto glass rounded-sheet p-3 animate-slide-in-right"
          >
            <div className="flex items-start gap-3">
              <div className={`icon-tile w-10 h-10 rounded-[10px] ${isWhatsApp ? 'icon-tile-green' : ''}`} aria-hidden="true">
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-subheadline font-semibold text-label truncate">
                    {isWhatsApp ? 'WhatsApp sent' : 'SMS sent'}
                  </span>
                  <span className="text-caption text-secondary tabular shrink-0">
                    {notif.recipientPhone}
                  </span>
                </div>
                <p className="text-subheadline text-label mt-0.5 line-clamp-3">
                  {notif.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissNotification(notif.id)}
                className="shrink-0 -m-2 w-11 h-11 flex items-center justify-center rounded-full text-secondary hover:bg-fill transition-colors"
                aria-label="Dismiss notification"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
