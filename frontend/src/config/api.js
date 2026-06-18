import { getApiBaseUrl } from './env';

const API = getApiBaseUrl();

export const API_ROUTES = {
  LOGIN: `${API}/accounts/login/`,
  REFRESH: `${API}/accounts/refresh/`,
  ME: `${API}/accounts/me/`,

  CARS: `${API}/cars/voitures/`,
  CAR_DETAIL: (id) => `${API}/cars/voitures/${id}/`,
  PUBLIC_CARS: `${API}/cars/voitures/public/`,
  PUBLIC_CAR_DETAIL: (id) => `${API}/cars/voitures/${id}/public/`,

  CLIENTS: `${API}/clients/`,
  CLIENT_REQUESTS: `${API}/clients/requests/`,

  RESERVATIONS: `${API}/reservations/`,
  RESERVATION_HISTORIQUE: `${API}/reservations/historique/`,
  PUBLIC_RESERVATIONS: `${API}/reservations/public/`,

  PAYMENTS: `${API}/payments/`,
  PAYMENT_FINANCIAL_SUMMARY: `${API}/payments/financial-summary/`,

  NOTIFICATIONS: `${API}/notifications/`,
  NOTIFICATION_GENERATE: `${API}/notifications/generer/`,

  DASHBOARD: `${API}/dashboard/`,
  CONTACT: `${API}/dashboard/contact/`,
};
