'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const authData = localStorage.getItem('auth');
      if (!authData) return;
      const { access_token } = JSON.parse(authData);
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/testcases/notifications`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      try {
        const authData = localStorage.getItem('auth');
        const { access_token } = JSON.parse(authData || '{}');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        await fetch(`${baseUrl}/testcases/notifications/${notif.id}/read`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${access_token}` }
        });
        fetchNotifications();
      } catch(err) {}
    }
    setIsOpen(false);
    router.push(`/dashboard/testcases?highlight=${notif.testcaseId}`);
  };

  return (
    <div className="relative z-[100]" data-testid="notification-bell">
      <button 
        id="notification-bell-btn"
        data-testid="notification-bell-btn"
        aria-label="Notifikasi"
        title="Notifikasi"
        onClick={() => setIsOpen(!isOpen)}
        className="header-icon-button relative"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border border-slate-900 shadow-md " data-testid="notification-unread-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-800 rounded-2xl shadow-sm overflow-hidden z-[100]" data-testid="notification-dropdown">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/80 ">
            <h3 className="font-bold text-white" data-testid="notification-dropdown-title">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-indigo-300 font-medium" data-testid="notification-unread-count">{unreadCount} unread</span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto" data-testid="notification-list">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-white/50 text-sm" data-testid="notification-empty">No notifications yet.</div>
            ) : (
              notifications.map((notif: any) => (
                <div 
                  key={notif.id} 
                  data-testid={`notification-item-${notif.id}`}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-white/5 transition-colors ${!notif.isRead ? 'bg-indigo-500/10' : ''}`}
                >
                  <p className={`text-sm ${!notif.isRead ? 'text-white font-medium' : 'text-white/70'}`} data-testid="notification-message">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-white/40 mt-1" data-testid="notification-timestamp">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
