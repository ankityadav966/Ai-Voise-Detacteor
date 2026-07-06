import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import {
  MdArrowBack,
  MdPerson,
  MdEdit,
  MdCheck,
  MdMic,
  MdTimer,
  MdTextSnippet,
  MdSdStorage,
  MdLogout,
  MdDeleteForever,
  MdKeyboardArrowRight,
} from 'react-icons/md';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateProfile, logout, deleteAccount } = useAuth();
  const recordings = useSelector((state) => state.history.recordings);

  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert('Name cannot be empty.');
      return;
    }

    setIsLoading(true);
    const error = await updateProfile({ name: trimmed });
    setIsLoading(false);
    setIsEditing(false);

    if (error) {
      alert(error);
    } else {
      alert('Profile updated successfully!');
    }
  };

  const handleLogout = () => {
    const confirm = window.confirm('Are you sure you want to log out?');
    if (confirm) {
      logout();
      navigate('/login');
    }
  };

  const handleDeleteAccount = () => {
    const confirm = window.confirm(
      'Are you sure you want to delete your account permanently? This will remove all your recordings from the database. This action cannot be undone.'
    );
    if (confirm) {
      setIsLoading(true);
      deleteAccount().then((error) => {
        setIsLoading(false);
        if (error) {
          alert(error);
        } else {
          navigate('/login');
        }
      });
    }
  };

  const totalCount = recordings.length;
  const totalDurationSeconds = recordings.reduce((sum, rec) => sum + (rec.durationInSeconds || 0), 0);
  const totalHours = (totalDurationSeconds / 3600).toFixed(1);
  const totalWords = recordings.reduce((sum, rec) => sum + (rec.wordCount || 0), 0);

  // Estimate file sizes on web (approx 128kbps audio quality = ~1MB per minute)
  const estimatedStorageMb = ((totalDurationSeconds / 60) * 0.95).toFixed(2);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/home')} style={styles.headerBtn} aria-label="Back">
          <MdArrowBack size={24} />
        </button>
        <span style={styles.headerTitle}>Your Profile</span>
        <div style={{ width: '40px' }} />
      </div>

      <div style={styles.content}>
        {/* Avatar Section */}
        <div style={styles.avatarSection}>
          <div style={styles.avatarGradientRing}>
            <div style={styles.avatarBg}>
              <MdPerson size={54} color="#6366F1" />
            </div>
          </div>

          {isEditing ? (
            <div style={styles.editNameRow}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.nameInput}
                autoFocus
              />
              <button onClick={handleSaveProfile} disabled={isLoading} style={styles.checkBtn}>
                <MdCheck size={24} color="#10B981" />
              </button>
            </div>
          ) : (
            <div style={styles.nameRow}>
              <h2 style={styles.profileName}>{user?.name || 'Patera Lekha User'}</h2>
              <button onClick={() => setIsEditing(true)} style={styles.editIconBtn}>
                <MdEdit size={18} color="#94A3B8" />
              </button>
            </div>
          )}

          <span style={styles.profileEmail}>{user?.email || 'you@example.com'}</span>
        </div>

        {/* Cloud Usage Statistics */}
        <h3 style={styles.sectionHeader}>Cloud Usage Statistics</h3>
        <div style={styles.metricsGrid}>
          <div style={styles.metricsRow}>
            <MetricCard
              label="Recordings"
              value={totalCount.toString()}
              icon={<MdMic size={24} />}
              accentColor="#6366F1"
            />
            <MetricCard
              label="Total Hours"
              value={totalHours}
              icon={<MdTimer size={24} />}
              accentColor="#EC4899"
            />
          </div>
          <div style={styles.metricsRow}>
            <MetricCard
              label="Word Counts"
              value={totalWords.toString()}
              icon={<MdTextSnippet size={24} />}
              accentColor="#10B981"
            />
            <MetricCard
              label="Local Files Size"
              value={`${estimatedStorageMb} MB`}
              icon={<MdSdStorage size={24} />}
              accentColor="#8B5CF6"
            />
          </div>
        </div>

        {/* Account Actions */}
        <h3 style={styles.sectionHeader}>Account Actions</h3>
        <div style={styles.card}>
          {/* Log Out */}
          <div onClick={handleLogout} style={styles.listRow}>
            <MdLogout size={22} color="#94A3B8" style={{ marginRight: '12px' }} />
            <span style={styles.rowText}>Log Out</span>
            <MdKeyboardArrowRight size={24} color="#6366F1" />
          </div>
          <div style={styles.cardDivider} />

          {/* Delete Account */}
          <div onClick={handleDeleteAccount} style={styles.listRow}>
            <MdDeleteForever size={22} color="#EF4444" style={{ marginRight: '12px' }} />
            <span style={{ ...styles.rowText, color: '#EF4444' }}>Delete Account</span>
            <MdKeyboardArrowRight size={24} color="#EF4444" />
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon, accentColor }) => (
  <div style={styles.metricCard}>
    <div style={styles.metricCardHeader}>
      <span style={{ color: accentColor }}>{icon}</span>
      <div style={{ ...styles.metricCardDot, backgroundColor: accentColor }} />
    </div>
    <span style={styles.metricCardVal}>{value}</span>
    <span style={styles.metricCardLabel}>{label}</span>
  </div>
);

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
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '36px',
  },
  avatarGradientRing: {
    padding: '4px',
    borderRadius: '50%',
    background: 'linear-gradient(to top, #6366F1, #EC4899)',
    display: 'inline-flex',
    marginBottom: '16px',
  },
  avatarBg: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#151C33',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  editNameRow: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #6366F1',
    width: '180px',
  },
  profileName: {
    fontSize: '22px',
    fontWeight: 'bold',
  },
  nameInput: {
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'center',
    width: '100%',
  },
  editIconBtn: {
    padding: '6px',
    display: 'flex',
  },
  checkBtn: {
    padding: '6px',
    display: 'flex',
  },
  profileEmail: {
    fontSize: '13px',
    color: '#94A3B8',
    marginTop: '6px',
  },
  sectionHeader: {
    fontSize: '12px',
    color: '#6366F1',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginBottom: '12px',
    marginLeft: '8px',
  },
  metricsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '36px',
  },
  metricsRow: {
    display: 'flex',
    gap: '16px',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#151C33',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.02)',
    display: 'flex',
    flexDirection: 'column',
  },
  metricCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  metricCardDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  metricCardVal: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  metricCardLabel: {
    fontSize: '12px',
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: '4px',
  },
  card: {
    backgroundColor: '#151C33',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    overflow: 'hidden',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    cursor: 'pointer',
  },
  rowText: {
    fontSize: '14px',
    fontWeight: 'bold',
    flex: 1,
  },
  cardDivider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
};

export default ProfilePage;
