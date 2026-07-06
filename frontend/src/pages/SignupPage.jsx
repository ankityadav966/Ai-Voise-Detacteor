import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdBlurOn, MdVisibility, MdVisibilityOff } from 'react-icons/md';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [obscurePassword, setObscurePassword] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const error = await signup(trimmedEmail, trimmedPassword, trimmedName);

    setIsLoading(false);
    if (error) {
      setErrorMsg(error);
    } else {
      navigate('/home');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* LOGO */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <MdBlurOn size={40} color="#6366F1" />
          </div>
          <span style={styles.logoText}>PATERA LEKHA</span>
        </div>

        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.subtitle}>Unlock production-ready meeting transcription</p>

        {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Full Name */}
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              style={styles.input}
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Email */}
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

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <input
                type={obscurePassword ? 'password' : 'text'}
                style={styles.passwordInput}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div style={styles.bottomLinkRow}>
          <span style={styles.plainText}>Already have an account? </span>
          <Link to="/login" style={styles.linkBold}>
            Log In
          </Link>
        </div>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
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
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  logoIcon: {
    padding: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '900',
    letterSpacing: '1px',
    color: '#FFFFFF',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#94A3B8',
    textAlign: 'center',
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
  bottomLinkRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '28px',
    fontSize: '13px',
  },
  plainText: {
    color: '#94A3B8',
  },
  linkBold: {
    color: '#6366F1',
    fontWeight: 'bold',
    textDecoration: 'none',
  },
};

export default SignupPage;
