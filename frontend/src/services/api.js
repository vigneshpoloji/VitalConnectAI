import { forceLogoutSuspended } from '../utils/sessionGuard';

// Resolve API base URL dynamically from environment variable with fallback
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL &&
  !import.meta.env.VITE_API_URL.includes('your-backend-api-service') &&
  !import.meta.env.VITE_API_URL.includes('placeholder')
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:5000'
).replace(/\/+$/, '');

const API_ROOT = `${API_BASE_URL}/api`;

/**
 * Standard fetch utility that automatically injects JWT authorization
 */
export async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('vital_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE_URL}${formattedEndpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'API request failed.');
  }
  return data;
}

/**
 * Centralized fetch wrapper with automatic JWT injection & 403 suspension interceptor
 */
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('vital_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_ROOT}${formattedEndpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 403) {
    const msg = data.message || '';
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes('suspended') || lowerMsg.includes('access denied')) {
      if (typeof forceLogoutSuspended === 'function') {
        forceLogoutSuspended(msg);
      }
    }
  }

  return data;
};

export const apiService = {
  signup: async (payload) => {
    return request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login: async (payload) => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  googleDonorAuth: async (payload) => {
    return request('/auth/google/donor', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCamps: async () => {
    return request('/camps');
  },

  hostCamp: async (payload) => {
    return request('/camps/host', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getInventory: async (bloodBankId) => {
    return request(`/blood/inventory/${bloodBankId}`);
  },

  getBankInventory: async (district = '') => {
    const query = district ? `?district=${district}` : '';
    return request(`/bloodbanks/inventory${query}`);
  },

  getActiveRequests: async () => {
    return request('/blood/requests/active');
  },

  getBloodRequests: async (query = {}) => {
    const params = new URLSearchParams(query).toString();
    const queryString = params ? `?${params}` : '';
    return request(`/blood-requests${queryString}`);
  },

  createBloodRequest: async (payload) => {
    return request('/blood-requests/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  fulfillBloodRequest: async (requestId) => {
    return request(`/blood-requests/${requestId}/fulfill`, {
      method: 'PATCH',
    });
  },

  getAdminAnalytics: async () => {
    return request('/admin/analytics');
  },

  updateCampStatus: async (campId, status) => {
    return request(`/admin/camps/${campId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  updateUserStatus: async (userId, status) => {
    return request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};