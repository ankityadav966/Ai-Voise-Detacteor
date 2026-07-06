import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdArrowBack } from 'react-icons/md';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const result = await forgotPassword(trimmedEmail);

    setIsLoading(false);
    if (!result.success) {
      setErrorMsg(result.error);
    } else {
      // Success toast / alert containing the OTP
      alert(`Your OTP is ${result.otp}`);
      // Redirect to OTP with email in state
      navigate('/otp', { state: { email: trimmedEmail } });
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>
        <MdArrowBack size={24} color="#FFFFFF" />
      </button>

      <div style={styles.card}>
        <h2 style={styles.title}>Reset Password</h2>
        <p style={styles.subtitle}>
          Enter your email address to receive a 4-digit verification code.
        </p>

        {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={isLoading} style={styles.submitBtn}>
            {isLoading ? 'Sending Code...' : 'Send Code'}
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
    gap: '24px',
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
  submitBtn: {
    height: '44px',
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
    transition: 'transform 0.15s ease, background-color 0.15s ease',
  },
};

export default ForgotPasswordPage;
