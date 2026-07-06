import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseHelper } from '../services/storage';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => DatabaseHelper.getSettings());

  // Apply theme class to document body on changes
  useEffect(() => {
    const isDark = settings.themeMode === 'dark' || 
      (settings.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      document.body.style.backgroundColor = '#090D1A';
      document.body.style.color = '#FFFFFF';
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#F8FAFC';
      document.body.style.color = '#0F172A';
    }
  }, [settings.themeMode]);

  const updateSettings = (newFields) => {
    const updated = { ...settings, ...newFields };
    setSettings(updated);
    DatabaseHelper.saveSettings(updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
