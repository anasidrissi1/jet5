import apiClient from '../api/apiClient';
import { getCachedValue, setCachedValue } from './cache';

const DASHBOARD_CACHE_MS = 60 * 1000;

const getCacheKey = (month, year) => `dashboard:all-stats:${year}-${month}`;

export const dashboardService = {
  async getAllStats(month, year) {
    const cacheKey = getCacheKey(month, year);
    const cached = getCachedValue(cacheKey, DASHBOARD_CACHE_MS);
    if (cached) return cached;

    const response = await apiClient.get(`/dashboard/all-stats/?month=${month}&year=${year}`);
    const payload = response.data || {};
    setCachedValue(cacheKey, payload);
    return payload;
  },
};
