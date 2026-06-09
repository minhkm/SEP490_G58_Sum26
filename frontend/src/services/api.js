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

export default api;
