import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only treat this as "your session expired" when the failed request
    // actually carried a token — a 401 from /auth/login just means wrong
    // credentials, and redirecting there too would wipe out the error
    // message the login page is about to show.
    const hadToken = !!error.config?.headers?.Authorization;
    // Logging out is now an authenticated call, so an already-invalid token
    // makes it 401 — but the user asked to leave, and "your session expired"
    // would be a confusing way to confirm it. The sign-out path clears local
    // state itself, so just let the error through.
    const isLogout = (error.config?.url || '').includes('/auth/logout');
    if (error.response?.status === 401 && hadToken && !isLogout) {
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login?sessionExpired=true';
    }
    return Promise.reject(error);
  }
);

export default api;
