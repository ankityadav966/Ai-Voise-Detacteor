import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { MdBlurOn } from 'react-icons/md';

const SplashPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    if (authLoading) return;

    const timer = setTimeout(() => {
      // Determine redirection path
      let nextPath = '/login';
      if (isAuthenticated) {
        nextPath = '/home';
      }

      // If passcode lock is active, redirect to LockScreen first
      if (settings.passcode) {
        navigate('/lock', { state: { redirectTo: nextPath } });
      } else {
        navigate(nextPath);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, authLoading, settings.passcode, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Animated Icon */}
        <div style={styles.iconContainer}>
          <MdBlurOn size={72} color="#6366F1" />
        </div>
        
        {/* Animated Brand */}
        <h1 style={styles.title}>PATERA LEKHA</h1>
        <p style={styles.subtitle}>AI Meeting Assistant</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    backgroundColor: '#090D1A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    textAlign: 'center',
  },
  iconContainer: {
    padding: '24px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'pulse 2s infinite ease-in-out',
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '900',
    letterSpacing: '3px',
    color: '#FFFFFF',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#94A3B8',
    letterSpacing: '1px',
    fontWeight: '500',
  },
};

export default SplashPage;
