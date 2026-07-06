import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { MdOutlineFingerprint, MdBackspace } from 'react-icons/md';

const LockPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();

  const [pin, setPin] = useState('');
  const [errorState, setErrorState] = useState(false);

  const targetPath = location.state?.redirectTo || '/home';

  // Automatically trigger biometric unlock if active on load
  useEffect(() => {
    if (settings.useBiometricLock) {
      handleBiometricAuth();
    }
  }, [settings.useBiometricLock]);

  const handleKeyPress = (num) => {
    if (pin.length >= 4) return;
    setErrorState(false);

    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === 4) {
      // Validate
      if (newPin === settings.passcode) {
        setTimeout(() => {
          navigate(targetPath, { replace: true });
        }, 150);
      } else {
        setTimeout(() => {
          setErrorState(true);
          setPin('');
        }, 200);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setErrorState(false);
  };

  const handleBiometricAuth = async () => {
    // Web simulation of Biometric unlock prompt
    const confirm = window.confirm('Authenticate using biometric fingerprint/face recognition?');
    if (confirm) {
      navigate(targetPath, { replace: true });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h2 style={styles.title}>Enter Passcode</h2>
        <p style={styles.subtitle}>Patera Lekha is locked. Enter your 4-digit PIN.</p>

        {/* DOTS Indicator */}
        <div style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                style={{
                  ...styles.dot,
                  backgroundColor: errorState
                    ? '#EF4444'
                    : isFilled
                    ? '#6366F1'
                    : 'rgba(255, 255, 255, 0.1)',
                  transform: errorState ? 'scale(1.2)' : 'none',
                }}
              />
            );
          })}
        </div>

        {errorState && <p style={styles.errorText}>Incorrect passcode. Try again.</p>}

        {/* KEYPAD */}
        <div style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              style={styles.keyButton}
            >
              {num}
            </button>
          ))}

          {/* Biometrics */}
          <button
            onClick={handleBiometricAuth}
            style={{
              ...styles.keyButton,
              color: settings.useBiometricLock ? '#6366F1' : 'rgba(255,255,255,0.05)',
              cursor: settings.useBiometricLock ? 'pointer' : 'default',
            }}
            disabled={!settings.useBiometricLock}
          >
            <MdOutlineFingerprint size={28} />
          </button>

          {/* Zero */}
          <button onClick={() => handleKeyPress(0)} style={styles.keyButton}>
            0
          </button>

          {/* Backspace */}
          <button onClick={handleBackspace} style={styles.keyButton}>
            <MdBackspace size={24} />
          </button>
        </div>
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
    width: '320px',
    textAlign: 'center',
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#94A3B8',
    marginBottom: '40px',
  },
  dotsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  dot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    transition: 'all 0.15s ease',
  },
  errorText: {
    fontSize: '12px',
    color: '#EF4444',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    justifyItems: 'center',
  },
  keyButton: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#151C33',
    color: '#FFFFFF',
    fontSize: '22px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 255, 255, 0.02)',
    transition: 'background-color 0.15s ease',
  },
};

export default LockPage;
