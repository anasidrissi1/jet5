/**
 * JET5 Centralized API Service
 * Single source of truth for all API calls.
 * Pages should import from here instead of calling apiClient directly.
 */
import apiClient from '../api/apiClient';

// ─── Cars ────────────────────────────────────────────────────
export const carsService = {
  list: (params) => apiClient.get('/cars/voitures/', { params }),
  get: (id) => apiClient.get(`/cars/voitures/${id}/`),
  create: (data) => apiClient.post('/cars/voitures/', data),
  update: (id, data) => apiClient.put(`/cars/voitures/${id}/`, data),
  patch: (id, data) => apiClient.patch(`/cars/voitures/${id}/`, data),
  delete: (id) => apiClient.delete(`/cars/voitures/${id}/`),
  publicList: (params) => apiClient.get('/cars/voitures/public/', { params }),
  publicDetail: (id) => apiClient.get(`/cars/voitures/${id}/public/`),
};

// ─── Clients ─────────────────────────────────────────────────
export const clientsService = {
  list: (params) => apiClient.get('/clients/', { params }),
  get: (id) => apiClient.get(`/clients/${id}/`),
  create: (data) => apiClient.post('/clients/', data),
  update: (id, data) => apiClient.put(`/clients/${id}/`, data),
  patch: (id, data) => apiClient.patch(`/clients/${id}/`, data),
  delete: (id) => apiClient.delete(`/clients/${id}/`),
  requests: (params) => apiClient.get('/clients/requests/', { params }),
  createRequest: (data) => apiClient.post('/clients/requests/', data),
  approveRequest: (id, data) => apiClient.post(`/clients/requests/${id}/approve/`, data),
  rejectRequest: (id) => apiClient.post(`/clients/requests/${id}/reject/`),
};

// ─── Reservations ────────────────────────────────────────────
export const reservationsService = {
  list: (params) => apiClient.get('/reservations/', { params }),
  get: (id) => apiClient.get(`/reservations/${id}/`),
  create: (data) => apiClient.post('/reservations/', data),
  update: (id, data) => apiClient.put(`/reservations/${id}/`, data),
  patch: (id, data) => apiClient.patch(`/reservations/${id}/`, data),
  delete: (id) => apiClient.delete(`/reservations/${id}/`),
  publicCreate: (data) => apiClient.post('/reservations/public/', data),
  returnsToday: () => apiClient.get('/reservations/returns-today/'),
  extendRental: (id, data) => apiClient.post(`/reservations/${id}/extend-rental/`, data),
  markReturned: (id, data) => apiClient.post(`/reservations/${id}/mark-returned/`, data),
  paUpdate: (id, data) => apiClient.post(`/reservations/${id}/pa-update/`, data),
  historique: () => apiClient.get('/reservations/historique/'),
};

// ─── Payments ────────────────────────────────────────────────
export const paymentsService = {
  list: (params) => apiClient.get('/payments/', { params }),
  get: (id) => apiClient.get(`/payments/${id}/`),
  create: (data) => apiClient.post('/payments/', data),
  update: (id, data) => apiClient.put(`/payments/${id}/`, data),
  patch: (id, data) => apiClient.patch(`/payments/${id}/`, data),
  delete: (id) => apiClient.delete(`/payments/${id}/`),
  financialSummary: (params) => apiClient.get('/payments/financial-summary/', { params }),
  addPayment: (id, data) => apiClient.post(`/payments/${id}/add-payment/`, data),
  history: (id) => apiClient.get(`/payments/${id}/payment-history/`),
};

// ─── Entretiens ──────────────────────────────────────────────
export const entretiensService = {
  list: (params) => apiClient.get('/cars/entretiens/', { params }),
  get: (id) => apiClient.get(`/cars/entretiens/${id}/`),
  create: (data) => apiClient.post('/cars/entretiens/', data),
  update: (id, data) => apiClient.put(`/cars/entretiens/${id}/`, data),
  delete: (id) => apiClient.delete(`/cars/entretiens/${id}/`),
};

// ─── Assurances ──────────────────────────────────────────────
export const assurancesService = {
  list: (params) => apiClient.get('/cars/assurances/', { params }),
  get: (id) => apiClient.get(`/cars/assurances/${id}/`),
  create: (data) => apiClient.post('/cars/assurances/', data),
  update: (id, data) => apiClient.put(`/cars/assurances/${id}/`, data),
  delete: (id) => apiClient.delete(`/cars/assurances/${id}/`),
};

// ─── Visites Techniques ─────────────────────────────────────
export const visitesTechniquesService = {
  list: (params) => apiClient.get('/cars/visites/', { params }),
  get: (id) => apiClient.get(`/cars/visites/${id}/`),
  create: (data) => apiClient.post('/cars/visites/', data),
  update: (id, data) => apiClient.put(`/cars/visites/${id}/`, data),
  delete: (id) => apiClient.delete(`/cars/visites/${id}/`),
};

// ─── Autorisations ──────────────────────────────────────────
export const autorisationsService = {
  list: (params) => apiClient.get('/cars/autorisations/', { params }),
  get: (id) => apiClient.get(`/cars/autorisations/${id}/`),
  create: (data) => apiClient.post('/cars/autorisations/', data),
  update: (id, data) => apiClient.put(`/cars/autorisations/${id}/`, data),
  delete: (id) => apiClient.delete(`/cars/autorisations/${id}/`),
};

// ─── Dashboard ──────────────────────────────────────────────
export const dashboardService = {
  full: () => apiClient.get('/dashboard/'),
  allStats: () => apiClient.get('/dashboard/all-stats/'),
  timeline: () => apiClient.get('/dashboard/timeline-aujourdhui/'),
  cashFlow: (params) => apiClient.get('/dashboard/cash-flow/', { params }),
  globalSearch: (q) => apiClient.get('/dashboard/search/', { params: { q } }),
  returnsToday: () => apiClient.get('/dashboard/retours-aujourdhui/'),
  returnsSimple: () => apiClient.get('/dashboard/retours-aujourdhui-simple/'),
  alertsUrgent: () => apiClient.get('/dashboard/alertes-urgentes/'),
  pendingPayments: () => apiClient.get('/dashboard/paiements-en-attente/'),
  monthlyFinances: (params) => apiClient.get('/dashboard/finances-mensuelles/', { params }),
};

// ─── Notifications ──────────────────────────────────────────
export const notificationsService = {
  list: (params) => apiClient.get('/notifications/', { params }),
  get: (id) => apiClient.get(`/notifications/${id}/`),
  markRead: (id) => apiClient.patch(`/notifications/${id}/`, { est_lue: true }),
  markAllRead: (ids) => Promise.all(ids.map(id => apiClient.patch(`/notifications/${id}/`, { est_lue: true }))),
  delete: (id) => apiClient.delete(`/notifications/${id}/`),
  generate: () => apiClient.post('/notifications/generer/'),
  stats: () => apiClient.get('/notifications/statistiques/'),
};

// ─── Auth ───────────────────────────────────────────────────
export const authService = {
  login: (data) => apiClient.post('/accounts/login/', data),
  me: () => apiClient.get('/accounts/me/'),
  refresh: (data) => apiClient.post('/accounts/refresh/', data),
};

// ─── Contact ────────────────────────────────────────────────
export const contactService = {
  send: (data) => apiClient.post('/dashboard/contact/', data),
  list: (params) => apiClient.get('/dashboard/contact/messages/', { params }),
  markRead: (id) => apiClient.post(`/dashboard/contact/messages/${id}/read/`),
};

// ─── Rentabilité ────────────────────────────────────────────
export const rentabiliteService = {
  get: (params) => apiClient.get('/cars/rentabilite/', { params }),
};
