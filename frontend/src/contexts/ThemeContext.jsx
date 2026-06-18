import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({ theme: 'light', isDarkMode: false });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    document.body?.setAttribute('data-theme', 'light');

    try {
      window.localStorage.setItem('jet5-theme', 'light');
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', isDarkMode: false }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
