/**
 * API Service – Axios instance with interceptors.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach token ────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto-refresh token ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await AsyncStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refresh,
        });
        await AsyncStorage.setItem('access_token', data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  googleLogin: (data) => api.post('/auth/google', data),
  refresh: (refresh_token) => api.post('/auth/refresh', { refresh_token }),
  getMe: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  logout: () => api.post('/auth/logout'),
};

// ── Donations ─────────────────────────────────────────────────────────────────
export const donationsAPI = {
  create: (formData) => api.post('/donations/donations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params) => api.get('/donations/my-history', { params }),
  getById: (id) => api.get(`/donations/${id}/tracking`),
  getTracking: (id) => api.get(`/donations/${id}/tracking`),
};

// ── NGOs ──────────────────────────────────────────────────────────────────────
export const ngosAPI = {
  getDashboard: () => api.get('/ngo/dashboard'),
  createRequest: (data) => api.post('/ngo/requirements', data),
  getRequests: () => api.get('/ngo/requirements'),
  updateStatus: (id, status, note, longitude, latitude) =>
    api.put(`/ngo/donations/${id}/status`, { status, note, longitude, latitude }),
  uploadDocs: (formData) => api.post('/ngo/upload-docs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ── Matching ──────────────────────────────────────────────────────────────────
export const matchingAPI = {
  getMatches: (params) => api.get('/donations/ai-match', { params }),
  getNearby: (params) => api.get('/donations/nearby-ngos', { params }),
};

// ── Emergency ─────────────────────────────────────────────────────────────────
export const emergencyAPI = {
  getAlerts: () => api.get('/ngo/requirements'),
  oneTapDonate: (ngoId, category) =>
    api.post('/donations/donations', {
      category,
      description: 'Emergency Donation via One-Tap Mode',
      quantity: '1 Unit',
      assignedNgoId: ngoId,
    }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: () => Promise.resolve({ data: { success: true, data: [] } }),
  markRead: () => Promise.resolve({ data: { success: true } }),
  markAllRead: () => Promise.resolve({ data: { success: true } }),
  getUnreadCount: () => Promise.resolve({ data: { success: true, data: 0 } }),
};

// ── Blockchain ────────────────────────────────────────────────────────────────
export const blockchainAPI = {
  getRecord: (donationId) => api.get(`/donations/${donationId}/tracking`),
  verify: (txHash) => Promise.resolve({ data: { success: true, hash: txHash } }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getSummary: () => Promise.resolve({ data: { success: true, data: { total_donations: 0, people_helped: 0, verified_donations: 0 } } }),
  getMonthlyTrend: () => Promise.resolve({ data: { success: true, data: [] } }),
  getPlatformStats: () => Promise.resolve({ data: { success: true, data: {} } }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getPendingNGOs: () => api.get('/admin/ngos/pending'),
  verifyNGO: (id, status) => api.put(`/admin/ngos/${id}/approve`, { status }),
  getStats: () => api.get('/admin/stats'),
  getFraudDetection: () => api.get('/admin/fraud'),
};

export default api;
