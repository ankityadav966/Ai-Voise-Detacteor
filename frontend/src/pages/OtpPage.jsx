import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdArrowBack, MdVisibility, MdVisibilityOff } from 'react-icons/md';

const OtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();

  const email = location.state?.email || '';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [obscurePassword, setObscurePassword] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedCode || !trimmedPassword) {
      setErrorMsg('Verification code and new password are required.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const error = await resetPassword(email, trimmedCode, trimmedPassword);

    setIsLoading(false);
    if (error) {
      setErrorMsg(error);
    } else {
      alert('Password updated successfully! Please log in.');
      navigate('/login');
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>
        <MdArrowBack size={24} color="#FFFFFF" />
      </button>

      <div style={styles.card}>
        <h2 style={styles.title}>Verify OTP</h2>
        <p style={styles.subtitle}>
          We sent a 4-digit code to <strong style={{ color: '#FFFFFF' }}>{email || 'your email'}</strong>. Enter it below with your new password.
        </p>

        {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Verification Code */}
          <div style={styles.field}>
            <label style={styles.label}>4-Digit Code</label>
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={4}
              style={{ ...styles.input, ...styles.codeInput }}
              placeholder="0000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              required
            />
          </div>

          {/* New Password */}
          <div style={styles.field}>
            <label style={styles.label}>New Password</label>
            <div style={styles.inputWrapper}>
              <input
                type={obscurePassword ? 'password' : 'text'}
                style={styles.passwordInput}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setObscurePassword(!obscurePassword)}
                style={styles.visibilityBtn}
              >
                {obscurePassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={isLoading} style={styles.submitBtn}>
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#090D1A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: '24px',
    left: '24px',
    padding: '8px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#151C33',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    padding: '36px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#94A3B8',
    lineHeight: '1.5',
    marginBottom: '32px',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    color: '#EF4444',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  input: {
    width: '100%',
    height: '44px',
    backgroundColor: '#090D1A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#FFFFFF',
    padding: '0 16px',
    fontSize: '14px',
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    height: '44px',
    backgroundColor: '#090D1A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#FFFFFF',
    padding: '0 48px 0 16px',
    fontSize: '14px',
  },
  visibilityBtn: {
    position: 'absolute',
    right: '12px',
    color: '#94A3B8',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
  },
  submitBtn: {
    height: '44px',
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
    transition: 'transform 0.15s ease, background-color 0.15s ease',
    marginTop: '10px',
  },
};

export default OtpPage;
