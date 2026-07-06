import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import {
  MdArrowBack,
  MdKeyboardArrowRight,
  MdInfoOutline,
  MdCheck,
  MdLockOutline,
} from 'react-icons/md';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();

  const [apiUrl, setApiUrl] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');

  useEffect(() => {
    if (settings) {
      setApiUrl(settings.apiUrl);
    }
  }, [settings]);

  const handleSaveEndpoint = (e) => {
    e.preventDefault();
    const trimmed = apiUrl.trim();
    if (!trimmed) {
      alert('Endpoint URL cannot be empty.');
      return;
    }
    updateSettings({ apiUrl: trimmed });
    alert('Endpoint updated successfully!');
  };

  const handleSavePasscode = (e) => {
    e.preventDefault();
    const trimmed = passcodeInput.trim();
    if (trimmed.length !== 4 || isNaN(trimmed)) {
      alert('Passcode must be exactly 4 digits.');
      return;
    }
    updateSettings({ passcode: trimmed });
    setShowPasscodeModal(false);
    setPasscodeInput('');
    alert('App Lock passcode is active!');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/home')} style={styles.headerBtn} aria-label="Back">
          <MdArrowBack size={24} />
        </button>
        <span style={styles.headerTitle}>Settings</span>
        <div style={{ width: '40px' }} />
      </div>

      <div style={styles.content}>
        {/* Connection Setup */}
        <h3 style={styles.sectionHeader}>BACKEND CONNECTION</h3>
        <div style={styles.card}>
          <form onSubmit={handleSaveEndpoint} style={styles.form}>
            <label style={styles.label}>API Base URL</label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="e.g. http://localhost:5000"
              style={styles.input}
              required
            />
            <button type="submit" style={styles.saveBtn}>
              Save Endpoint
            </button>
          </form>
        </div>

        {/* Speech Recognition */}
        <h3 style={styles.sectionHeader}>SPEECH & VOICE RECOGNITION</h3>
        <div style={styles.card}>
          <div onClick={() => setShowLanguageModal(true)} style={styles.rowClickable}>
            <div style={styles.rowTextCol}>
              <span style={styles.rowTitle}>Speech Recognition Language</span>
              <span style={styles.rowSubtitle}>
                {settings.speechLanguage === 'en-US' ? 'English (US)' : 'Hindi (India)'}
              </span>
            </div>
            <MdKeyboardArrowRight size={24} color="#6366F1" />
          </div>
        </div>

        {/* Security & Display Theme */}
        <h3 style={styles.sectionHeader}>SECURITY & THEME</h3>
        <div style={styles.card}>
          {/* App Theme */}
          <div onClick={() => setShowThemeModal(true)} style={styles.rowClickable}>
            <div style={styles.rowTextCol}>
              <span style={styles.rowTitle}>App Theme</span>
              <span style={styles.rowSubtitle}>{settings.themeMode.toUpperCase()}</span>
            </div>
            <MdKeyboardArrowRight size={24} color="#6366F1" />
          </div>
          <div style={styles.divider} />

          {/* Biometrics */}
          <div style={styles.rowStatic}>
            <div style={styles.rowTextCol}>
              <span style={styles.rowTitle}>Biometric Lock</span>
              <span style={styles.rowSubtitle}>
                Secure access using Face ID / Fingerprint.
              </span>
            </div>
            <label style={styles.switchLabel}>
              <input
                type="checkbox"
                checked={settings.useBiometricLock}
                onChange={(e) => updateSettings({ useBiometricLock: e.target.checked })}
                style={styles.switchInput}
              />
              <span style={styles.switchSlider} />
            </label>
          </div>
          <div style={styles.divider} />

          {/* Passcode Lock */}
          <div onClick={() => setShowPasscodeModal(true)} style={styles.rowClickable}>
            <div style={styles.rowTextCol}>
              <span style={styles.rowTitle}>Setup Lock Passcode</span>
              <span style={styles.rowSubtitle}>
                {settings.passcode ? 'Passcode is Active' : 'No passcode set'}
              </span>
            </div>
            <MdLockOutline size={22} color="#6366F1" style={{ marginRight: '4px' }} />
          </div>
        </div>

        {/* Info */}
        <h3 style={styles.sectionHeader}>INFO</h3>
        <div style={styles.card}>
          <div style={styles.rowStatic}>
            <div style={styles.rowTextCol}>
              <span style={styles.rowTitle}>Patera Lekha Version</span>
              <span style={styles.rowSubtitle}>v1.0.0 (Production Build)</span>
            </div>
            <MdInfoOutline size={22} color="#94A3B8" />
          </div>
        </div>
      </div>

      {/* Language Modal */}
      {showLanguageModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLanguageModal(false)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.dialogTitle}>Select Speech Language</h3>

            <button
              onClick={() => {
                updateSettings({ speechLanguage: 'en-US' });
                setShowLanguageModal(false);
              }}
              style={styles.dialogOption}
            >
              <span>English (US)</span>
              {settings.speechLanguage === 'en-US' && <MdCheck size={20} color="#6366F1" />}
            </button>

            <button
              onClick={() => {
                updateSettings({ speechLanguage: 'hi-IN' });
                setShowLanguageModal(false);
              }}
              style={styles.dialogOption}
            >
              <span>Hindi (India)</span>
              {settings.speechLanguage === 'hi-IN' && <MdCheck size={20} color="#6366F1" />}
            </button>
          </div>
        </div>
      )}

      {/* Theme Modal */}
      {showThemeModal && (
        <div style={styles.modalOverlay} onClick={() => setShowThemeModal(false)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.dialogTitle}>Select App Theme</h3>

            <button
              onClick={() => {
                updateSettings({ themeMode: 'dark' });
                setShowThemeModal(false);
              }}
              style={styles.dialogOption}
            >
              <span>Dark Mode</span>
              {settings.themeMode === 'dark' && <MdCheck size={20} color="#6366F1" />}
            </button>

            <button
              onClick={() => {
                updateSettings({ themeMode: 'light' });
                setShowThemeModal(false);
              }}
              style={styles.dialogOption}
            >
              <span>Light Mode</span>
              {settings.themeMode === 'light' && <MdCheck size={20} color="#6366F1" />}
            </button>

            <button
              onClick={() => {
                updateSettings({ themeMode: 'system' });
                setShowThemeModal(false);
              }}
              style={styles.dialogOption}
            >
              <span>System Default</span>
              {settings.themeMode === 'system' && <MdCheck size={20} color="#6366F1" />}
            </button>
          </div>
        </div>
      )}

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.dialog}>
            <h3 style={styles.dialogTitle}>Setup Passcode</h3>
            <form onSubmit={handleSavePasscode}>
              <input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                placeholder="4-Digit Passcode"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                style={styles.dialogPassInput}
                required
              />
              <div style={styles.dialogActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasscodeModal(false);
                    setPasscodeInput('');
                  }}
                  style={styles.dialogCancel}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.dialogSave}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#090D1A',
    color: '#FFFFFF',
    paddingBottom: '40px',
  },
  header: {
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
  },
  headerBtn: {
    color: '#FFFFFF',
    padding: '8px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  content: {
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto',
    padding: '24px',
  },
  sectionHeader: {
    fontSize: '12px',
    color: '#6366F1',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginBottom: '8px',
    marginLeft: '8px',
  },
  card: {
    backgroundColor: '#151C33',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  form: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  input: {
    width: '100%',
    height: '44px',
    backgroundColor: '#090D1A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#FFFFFF',
    padding: '0 12px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  saveBtn: {
    height: '44px',
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  rowClickable: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    cursor: 'pointer',
  },
  rowStatic: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
  },
  rowTextCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  rowTitle: {
    fontSize: '14px',
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: '12px',
    color: '#94A3B8',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  dialog: {
    backgroundColor: '#151C33',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.04)',
    padding: '24px',
    width: '320px',
  },
  dialogTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: '16px',
  },
  dialogOption: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    color: '#FFFFFF',
    fontSize: '14px',
  },
  dialogPassInput: {
    width: '100%',
    height: '44px',
    backgroundColor: '#090D1A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#FFFFFF',
    padding: '0 12px',
    fontSize: '18px',
    textAlign: 'center',
    letterSpacing: '8px',
    marginBottom: '20px',
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  dialogCancel: {
    color: '#94A3B8',
    fontSize: '14px',
    padding: '8px 12px',
  },
  dialogSave: {
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    borderRadius: '8px',
    padding: '8px 16px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  // Switch styling
  switchLabel: {
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  switchSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E293B',
    borderRadius: '24px',
    transition: '0.3s',
  },
};

// CSS injected rule for checkbox switch slider toggle
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    input:checked + span {
      background-color: #6366F1 !important;
    }
    span::before {
      content: "";
      position: absolute;
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: 0.3s;
    }
    input:checked + span::before {
      transform: translateX(20px);
    }
  `;
  document.head.appendChild(styleEl);
}

export default SettingsPage;
