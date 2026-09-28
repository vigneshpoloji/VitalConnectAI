// frontend/src/config.js
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'https://vitalconnect-api.onrender.com'
).replace(/\/+$/, '');

export const API_ROOT = `${API_BASE_URL}/api`;