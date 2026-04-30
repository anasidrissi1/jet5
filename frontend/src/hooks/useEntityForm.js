import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export const useEntityForm = ({ fetchUrl, saveUrl, initialValues }) => {
  const [form, setForm] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (fetchUrl) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const response = await apiClient.get(fetchUrl);
          setForm(response.data);
          setError(null);
        } catch (err) {
          console.error('Error fetching data:', err);
          setError(err.response?.data?.message || 'Error loading data');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [fetchUrl]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = fetchUrl
        ? await apiClient.put(fetchUrl, form)
        : await apiClient.post(saveUrl, form);
      return response.data;
    } catch (err) {
      console.error('Error submitting form:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.response?.data || 
                          'Error submitting form';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    setForm,
    loading,
    setLoading,
    error,
    setError,
    handleSubmit
  };
};

export default useEntityForm;
