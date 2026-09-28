import { API_BASE_URL } from '../config';

/**
 * Triggers clean eviction across local storage and redirects immediately
 */
export const forceLogoutSuspended = (message) => {
  localStorage.removeItem('vital_token');
  localStorage.removeItem('vital_user');

  alert(`⚠️ Access Revoked: ${message || 'Your account has been suspended by an Administrator.'}`);
  window.location.replace('/auth?mode=login');
};

/**
 * Checks live account status against backend verify-status endpoint
 */
export const checkSessionStatus = async () => {
  const token = localStorage.getItem('vital_token');
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      forceLogoutSuspended(data.message);
    }
  } catch (err) {
    console.debug('Status check paused:', err.message);
  }
};