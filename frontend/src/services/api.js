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
  },
  getVoyageCrew: async (id) => {
    const response = await api.get(`/voyages/${id}/crew`);
    return response.data;
  },
  getVoyageCargo: async (id) => {
    const response = await api.get(`/voyages/${id}/cargo`);
    return response.data;
  },
  dischargeCargoItem: async (voyageId, itemId, isDischarged) => {
    const response = await api.put(`/voyages/${voyageId}/cargo/${itemId}/discharge`, { isDischarged });
    return response.data;
  },
  updateVoyage: async (id, data) => {
    const response = await api.put(`/voyages/${id}`, data);
    return response.data;
  },
  getAttendances: async (id, type, date) => {
    let query = `?type=${type}`;
    if (date) query += `&date=${date}`;
    const response = await api.get(`/voyages/${id}/attendances${query}`);
    return response.data;
  },
  saveAttendances: async (id, payload) => {
    const response = await api.post(`/voyages/${id}/attendances`, payload);
    return response.data;
  },
  exportOperationReport: async (id, params = {}) => {
    return api.get(`/voyages/${id}/operation-report/export`, {
      params,
      responseType: 'blob',
    });
  },
  getVoyageEquipments: async (id) => {
    const response = await api.get(`/voyages/${id}/equipments`);
    return response.data;
  },
  updateEquipmentStatus: async (equipmentId, status) => {
    const response = await api.patch(`/voyages/equipments/${equipmentId}/status`, { status });
    return response.data;
  },
  updateEquipmentBrokenCount: async (equipmentId, brokenCount) => {
    const response = await api.patch(`/voyages/equipments/${equipmentId}/broken-count`, { brokenCount });
    return response.data;
  }
};


export const cargoService = {
  getAllCargos: async (voyageId) => {
    const url = voyageId ? `/cargos?voyageId=${voyageId}` : '/cargos';
    const response = await api.get(url);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/cargos/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/cargos', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/cargos/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/cargos/${id}`);
    return response.data;
  }
};

export const cargoTypeService = {
  getAll: async () => {
    const response = await api.get('/cargo-types');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/cargo-types', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/cargo-types/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/cargo-types/${id}`);
    return response.data;
  }
};

export const dashboardService = {
  getAgencyDashboardData: async () => {
    const response = await api.get('/dashboard/agency');
    return response.data;
  },
  getMasterDashboardData: async (voyageId) => {
    let url = '/dashboard/master';
    if (voyageId) url += `?voyageId=${voyageId}`;
    const response = await api.get(url);
    return response.data;
  }
};

export const notificationService = {
  getAll: async (limit = 20) => {
    const response = await api.get(`/notifications?limit=${limit}`);
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },
};

export const crewService = {
  getAll: async () => {
    const response = await api.get('/crews');
    return response.data;
  },
  getAvailable: async () => {
    const response = await api.get('/crews?available=true');
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
  },
  updateEngineStatus: async (engineId, status) => {
    const response = await api.patch(`/vessels/engines/${engineId}/status`, { status });
    return response.data;
  },
  getShipEquipments: async (shipId) => {
    const response = await api.get(`/vessels/${shipId}/equipments`);
    return response.data;
  },
  createShipEquipments: async (shipId, equipmentList) => {
    const response = await api.post(`/vessels/${shipId}/equipments`, { equipmentList });
    return response.data;
  },
  updateEquipmentBrokenCount: async (equipmentId, brokenCount) => {
    const response = await api.patch(`/vessels/equipments/${equipmentId}/broken-count`, { brokenCount });
    return response.data;
  }
};

export const engineLogService = {
  getMyVoyages: async () => {
    const response = await api.get('/engine-logs/my-voyages');
    return response.data;
  },
  getShifts: async (voyageId, date) => {
    const params = date ? `?date=${date}` : '';
    const response = await api.get(`/engine-logs/shifts/${voyageId}${params}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/engine-logs', data);
    return response.data;
  },
  update: async (shiftLogId, data) => {
    const response = await api.put(`/engine-logs/${shiftLogId}`, data);
    return response.data;
  },
  getHistoryByShift: async (shiftId) => {
    const response = await api.get(`/engine-logs/history/shift/${shiftId}`);
    return response.data;
  },
  getHistoryByVoyage: async (voyageId) => {
    const response = await api.get(`/engine-logs/history/voyage/${voyageId}`);
    return response.data;
  },
  uploadImages: async (shiftLogId, files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    const response = await api.post(`/engine-logs/${shiftLogId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  getEditHistory: async (shiftLogId) => {
    const response = await api.get(`/engine-logs/${shiftLogId}/edit-history`);
    return response.data;
  }
};

export const deckLogService = {
  getMyVoyages: async () => {
    const response = await api.get('/deck-logs/my-voyages');
    return response.data;
  },
  getShifts: async (voyageId, date) => {
    const params = date ? `?date=${date}` : '';
    const response = await api.get(`/deck-logs/shifts/${voyageId}${params}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/deck-logs', data);
    return response.data;
  },
  update: async (shiftLogId, data) => {
    const response = await api.put(`/deck-logs/${shiftLogId}`, data);
    return response.data;
  },
  getHistoryByShift: async (shiftId) => {
    const response = await api.get(`/deck-logs/history/${shiftId}`);
    return response.data;
  },
  uploadImages: async (shiftLogId, files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    const response = await api.post(`/deck-logs/${shiftLogId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  getEditHistory: async (shiftLogId) => {
    const response = await api.get(`/deck-logs/${shiftLogId}/edit-history`);
    return response.data;
  }
};

export const reportService = {
  getReports: async (params = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    const qs = new URLSearchParams(clean).toString();
    const response = await api.get(`/reports${qs ? `?${qs}` : ''}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/reports', data);
    return response.data;
  },
  addReply: async (id, content) => {
    const response = await api.post(`/reports/${id}/replies`, { content });
    return response.data;
  },
  escalate: async (id, note) => {
    const response = await api.post(`/reports/${id}/escalate`, { note });
    return response.data;
  },
  resolve: async (id, note) => {
    const response = await api.post(`/reports/${id}/resolve`, { note });
    return response.data;
  },
  close: async (id, note) => {
    const response = await api.post(`/reports/${id}/close`, { note });
    return response.data;
  },
  reopen: async (id, note) => {
    const response = await api.post(`/reports/${id}/reopen`, { note });
    return response.data;
  },
  reject: async (id, note) => {
    const response = await api.post(`/reports/${id}/reject`, { note });
    return response.data;
  },
  // FT-10 v2: preview ngữ cảnh ca trực trước khi tạo báo cáo
  getShiftContext: async (shiftId) => {
    const response = await api.get(`/reports/shift/${shiftId}/context`);
    return response.data;
  },
};

export const profileService = {
  getMe: async () => {
    const response = await api.get('/crews/me');
    return response.data;
  },
  updateMe: async (data) => {
    const response = await api.put('/crews/me', data);
    return response.data;
  },
  getCertificates: async () => {
    const response = await api.get('/crews/me/certificates');
    return response.data;
  },
  addCertificate: async (data) => {
    const response = await api.post('/crews/me/certificates', data);
    return response.data;
  },
  updateCertificate: async (certId, data) => {
    const response = await api.put(`/crews/me/certificates/${certId}`, data);
    return response.data;
  },
  deleteCertificate: async (certId) => {
    const response = await api.delete(`/crews/me/certificates/${certId}`);
    return response.data;
  },
};

export const shiftService = {
  getCurrentVoyage: async () => {
    const response = await api.get('/shifts/current-voyage');
    return response.data;
  },
  getShifts: async (date) => {
    const response = await api.get('/shifts', { params: date ? { date } : {} });
    return response.data;
  },
  createBulk: async (data) => {
    const response = await api.post('/shifts/bulk', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/shifts/${id}`, data);
    return response.data;
  },
  remove: async (id) => {
    const response = await api.delete(`/shifts/${id}`);
    return response.data;
  },
  handover: async (id, note, { late = false, test = false } = {}) => {
    const response = await api.post(`/shifts/${id}/handover`, { note, late, test });
    return response.data;
  },
  receive: async (id, { test = false } = {}) => {
    const response = await api.post(`/shifts/${id}/receive`, { test });
    return response.data;
  },
};

export default api;
