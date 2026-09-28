import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

export function useNotifications(user, pollInterval = 12000) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('vital_token');
      const district = user.district || 'Kamareddy';
      const role = user.role?.toLowerCase() || 'donor';

      const res = await fetch(
        `${API_BASE_URL}/api/notifications?district=${encodeURIComponent(
          district
        )}&role=${encodeURIComponent(role)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        const unread = (data.notifications || []).filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, pollInterval);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollInterval]);

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('vital_token');
      await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: user?._id }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  return { notifications, unreadCount, markAllAsRead, refresh: fetchNotifications };
}