import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseHelper } from '../services/storage';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    apiUrl: 'http://localhost:9990',
    themeMode: 'dark',
    speechLanguage: 'en-IN',
    useBiometricLock: false,
    passcode: '',
  });
  const [loading, setLoading] = useState(true);

  // Load saved settings asynchronously on launch
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await DatabaseHelper.getSettings();
        setSettings(saved);
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const updateSettings = async (newFields) => {
    const updated = { ...settings, ...newFields };
    setSettings(updated);
    await DatabaseHelper.saveSettings(updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
