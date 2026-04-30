import axios from 'axios';
import { getApiBaseUrl } from '../config/env';

const API_BASE_URL = getApiBaseUrl();
const buildUrl = (path) => {
  if (!path) {
    return API_BASE_URL;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    // Ne pas ajouter le token pour les endpoints d'authentification
    if (!config.url?.includes('/accounts/login') && !config.url?.includes('/accounts/refresh')) {
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
        if (typeof config.headers?.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si erreur 401 et pas encore tenté de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh');
        
        if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null' || refreshToken.trim() === '') {
          // Pas de refresh token, déconnexion seulement si pas sur /login
          localStorage.removeItem('token');
          localStorage.removeItem('refresh');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        // Tenter de rafraîchir le token
        const response = await axios.post(buildUrl('/accounts/refresh/'), {
          refresh: refreshToken
        });

        const { token } = response.data;
        if (!token) {
          throw new Error('Jeton manquant après refresh');
        }
        localStorage.setItem('token', token);

        // Réessayer la requête originale avec le nouveau token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        // Échec du refresh, déconnexion seulement si pas sur /login
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
