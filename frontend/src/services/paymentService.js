import apiClient from '../api/apiClient';
import { getCachedValue, setCachedValue, invalidateCache } from './cache';

const SUMMARY_CACHE_KEY = 'payments:financial-summary';
const SUMMARY_CACHE_MS = 45 * 1000;

export const paymentService = {
  async getFinancialSummary() {
    const cached = getCachedValue(SUMMARY_CACHE_KEY, SUMMARY_CACHE_MS);
    if (cached) return cached;

    const response = await apiClient.get('/payments/financial-summary/');
    const payload = response.data || { summary: [], totals: {} };
    setCachedValue(SUMMARY_CACHE_KEY, payload);
    return payload;
  },

  async addPayment(paymentId, data) {
    const response = await apiClient.post(`/payments/${paymentId}/add-payment/`, data);
    invalidateCache('payments:');
    return response.data;
  },

  async getPaymentHistory(paymentId) {
    const response = await apiClient.get(`/payments/${paymentId}/payment-history/`);
    return response.data || [];
  },
};
