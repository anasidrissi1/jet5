import { getApiBaseUrl } from './env';

const API_BASE_URL = getApiBaseUrl();

export const API_ROUTES = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login/`,
  REGISTER: `${API_BASE_URL}/auth/register/`,
  LOGOUT: `${API_BASE_URL}/auth/logout/`,
  PROFILE: `${API_BASE_URL}/auth/profile/`,

  // Cars
  CARS: `${API_BASE_URL}/cars/voitures/`,
  CAR_DETAIL: (id) => `${API_BASE_URL}/cars/voitures/${id}/`,
  PUBLIC_CARS: `${API_BASE_URL}/cars/voitures/public/`,
  PUBLIC_CAR_DETAIL: (id) => `${API_BASE_URL}/cars/voitures/${id}/`,
  CAR_AVAILABILITY: (id) => `${API_BASE_URL}/cars/voitures/${id}/availability/`,

  // Clients
  CLIENTS: `${API_BASE_URL}/clients/`,
  CLIENT_DETAIL: (id) => `${API_BASE_URL}/clients/${id}/`,
  CLIENT_RENTALS: (id) => `${API_BASE_URL}/clients/${id}/rentals/`,

  // Reservations
  RESERVATIONS: `${API_BASE_URL}/reservations/`,
  RESERVATION_DETAIL: (id) => `${API_BASE_URL}/reservations/${id}/`,
  PUBLIC_RESERVATIONS: `${API_BASE_URL}/reservations/public/`,
  RESERVATION_CONFIRM: (id) => `${API_BASE_URL}/reservations/${id}/confirm/`,
  RESERVATION_CANCEL: (id) => `${API_BASE_URL}/reservations/${id}/cancel/`,

  // Payments
  PAYMENTS: `${API_BASE_URL}/payments/`,
  PAYMENT_DETAIL: (id) => `${API_BASE_URL}/payments/${id}/`,
  PAYMENT_REFUND: (id) => `${API_BASE_URL}/payments/${id}/refund/`,

  // Dashboard
  DASHBOARD_STATS: `${API_BASE_URL}/dashboard/stats/`,
  REVENUE_STATS: `${API_BASE_URL}/dashboard/revenue/`,
  RECENT_ACTIVITIES: `${API_BASE_URL}/dashboard/activities/`,

  // Notifications
  NOTIFICATIONS: `${API_BASE_URL}/notifications/`,
  NOTIFICATION_READ: (id) => `${API_BASE_URL}/notifications/${id}/read/`,
  NOTIFICATION_READ_ALL: `${API_BASE_URL}/notifications/read-all/`
};