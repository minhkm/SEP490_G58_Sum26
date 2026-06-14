import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor to add token to headers
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

export const authService = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  changeFirstPassword: async (email, newPassword) => {
    const response = await api.post('/auth/change-first-password', { email, newPassword });
    return response.data;
  }
};

export const voyageService = {
  createVoyage: async (data) => {
    const response = await api.post('/voyages', data);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/voyages');
    return response.data;
  }
};

export const cargoService = {
  getAllCargos: async () => {
    const response = await api.get('/cargos');
    return response.data;
  }
};

export const dashboardService = {
  getAgencyDashboardData: async () => {
    const response = await api.get('/dashboard/agency');
    return response.data;
  }
};

export const crewService = {
  getAll: async () => {
    const response = await api.get('/crews');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/crews/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/crews', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/crews/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/crews/${id}`);
    return response.data;
  }
};

export const vesselService = {
  getAll: async () => {
    const response = await api.get('/vessels');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/vessels/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/vessels', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/vessels/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/vessels/${id}`);
    return response.data;
  }
};

export const engineLogService = {
  getActiveVoyage: async () => {
    const response = await api.get('/engine-logs/active-voyage');
    return response.data;
  },
  getShifts: async (voyageId) => {
    const response = await api.get(`/engine-logs/shifts/${voyageId}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/engine-logs', data);
    return response.data;
  },
  getHistoryByShift: async (shiftId) => {
    const response = await api.get(`/engine-logs/history/shift/${shiftId}`);
    return response.data;
  },
  getHistoryByVoyage: async (voyageId) => {
    const response = await api.get(`/engine-logs/history/voyage/${voyageId}`);
    return response.data;
  }
};

export default api;
