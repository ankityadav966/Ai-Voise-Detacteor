import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseHelper } from '../services/storage';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    apiUrl: 'http://10.0.2.2:9990',
    themeMode: 'dark',
    speechLanguage: 'en-IN',
    useBiometricLock: false,
    passcode: '',
  });

  useEffect(() => {
    const loadSettings = async () => {
      const data = await DatabaseHelper.getSettings();
      setSettings(data);
    };
    loadSettings();
  }, []);

  const updateSettings = async (newFields) => {
    const updated = { ...settings, ...newFields };
    setSettings(updated);
    await DatabaseHelper.saveSettings(updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
