import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext();
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 heure

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const performLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    localStorage.removeItem('sessionStart');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const sessionStart = Number(localStorage.getItem('sessionStart'));
      const expired = !sessionStart || Date.now() - sessionStart >= SESSION_TIMEOUT_MS;
      if (expired) {
        performLogout();
        setLoading(false);
        return;
      }
      // Verify token by fetching user info
      apiClient.get('/accounts/me/')
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          performLogout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [performLogout]);

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/accounts/login/', {
        username,
        password,
      });

      const { token, refresh, user: userData } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refresh', refresh);
      localStorage.setItem('sessionStart', Date.now().toString());
      setUser(userData);

      return { success: true };
    } catch (error) {
      const status = error.response?.status;
      const responseError = error.response?.data?.error;

      if (status === 401) {
        // Auth failure - no details logged
      } else {
        // Server error - no internal details logged
      }

      const errorMessage = status === 401
        ? 'Nom d\'utilisateur ou mot de passe incorrect.'
        : responseError || error.message || 'Login failed';

      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    performLogout();
  };

  useEffect(() => {
    if (!user) return;
    const sessionStart = Number(localStorage.getItem('sessionStart'));
    if (!sessionStart) return;

    const remaining = SESSION_TIMEOUT_MS - (Date.now() - sessionStart);
    if (remaining <= 0) {
      performLogout();
      return;
    }

    const timer = setTimeout(() => {
      performLogout();
    }, remaining);

    return () => clearTimeout(timer);
  }, [user, performLogout]);

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
