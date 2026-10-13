import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically add role and userId headers if available
api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem('qms_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user.role) {
        config.headers['X-User-Role'] = user.role;
      }
      if (user.id) {
        config.headers['X-User-Id'] = user.id;
      }
    } catch (e) {
      console.error('Failed to parse stored user:', e);
    }
  }
  return config;
});

// Authentication APIs
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// Services & Counters APIs
export const serviceApi = {
  getAll: (activeOnly = false) => api.get(`/services?activeOnly=${activeOnly}`),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

export const counterApi = {
  getAll: () => api.get('/counters'),
  getById: (id) => api.get(`/counters/${id}`),
  create: (data) => api.post('/counters', data),
  update: (id, data) => api.put(`/counters/${id}`, data),
  delete: (id) => api.delete(`/counters/${id}`),
};

// Queue & Token APIs
export const tokenApi = {
  generate: (data) => api.post('/tokens', data),
  getById: (id) => api.get(`/tokens/${id}`),
  getPosition: (id) => api.get(`/tokens/${id}/position`),
  getUserTokens: (userId) => api.get(`/users/${userId}/tokens`),
  cancel: (id, userId) => api.put(`/tokens/${id}/cancel?userId=${userId}`),
};

export const queueApi = {
  getServiceQueue: (serviceId) => api.get(`/queues/${serviceId}`),
};

export const staffApi = {
  getQueue: (serviceId) => api.get(`/staff/queue/${serviceId}`),
  callNext: (serviceId, counterId) =>
    api.post(`/staff/queue/${serviceId}/next${counterId ? `?counterId=${counterId}` : ''}`),
  completeToken: (id) => api.put(`/staff/tokens/${id}/complete`),
  skipToken: (id) => api.put(`/staff/tokens/${id}/skip`),
};

export const userApi = {
  getAll: () => api.get('/users'),
};

export default api;
