import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import {
  fetchRecordings,
  setSearchQuery,
  setFavoriteFilter,
  setFolderFilter,
} from '../redux/historySlice';
import {
  MdBlurOn,
  MdPerson,
  MdSettings,
  MdMic,
  MdHistory,
  MdStar,
  MdFolder,
  MdDescription,
  MdChevronRight,
  MdMicOff,
} from 'react-icons/md';

const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const recordings = useSelector((state) => state.history.recordings);

  useEffect(() => {
    dispatch(fetchRecordings());
  }, [dispatch]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    dispatch(setSearchQuery(query));
    if (query.trim()) {
      navigate('/history');
    }
  };

  const handleQuickAction = (action) => {
    if (action === 'Record') {
      navigate('/recorder');
    } else if (action === 'History') {
      dispatch(setFavoriteFilter(false));
      dispatch(setFolderFilter('All'));
      navigate('/history');
    } else if (action === 'Favorites') {
      dispatch(setFavoriteFilter(true));
      navigate('/history');
    } else if (action === 'Meetings') {
      dispatch(setFavoriteFilter(false));
      dispatch(setFolderFilter('Meetings'));
      navigate('/history');
    }
  };

  const totalRecordings = recordings.length;
  const totalDurationSeconds = recordings.reduce((sum, rec) => sum + (rec.durationInSeconds || 0), 0);
  const totalMinutes = (totalDurationSeconds / 60).toFixed(1);

  const totalActionItems = recordings.reduce((sum, rec) => sum + (rec.actionItems?.length || 0), 0);
  const totalDecisions = recordings.reduce((sum, rec) => sum + (rec.keyDecisions?.length || 0), 0);
  
  // Calculate average confidence
  const confidences = recordings.map(rec => rec.meetingStats?.aiConfidence).filter(c => c !== undefined && c !== null);
  const averageConfidence = confidences.length > 0 
    ? Math.round((confidences.reduce((sum, val) => sum + val, 0) / confidences.length) * 100) 
    : 95;
    
  // Calculate sentiment breakdown
  const sentiments = recordings.map(rec => rec.sentiment).filter(Boolean);
  const positiveCount = sentiments.filter(s => s === 'Positive' || s === 'Excited').length;
  const concernedCount = sentiments.filter(s => s === 'Concerned' || s === 'Negative').length;
  const neutralCount = sentiments.filter(s => s === 'Neutral').length;

  // Format position & duration: MM:SS
  const formatDuration = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div style={styles.container}>
      {/* Header bar */}
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <MdBlurOn size={28} color="#6366F1" />
          <span style={styles.logoText}>PATERA LEKHA</span>
        </div>
        <div style={styles.headerRight}>
          <button onClick={() => navigate('/profile')} style={styles.headerBtn} aria-label="Profile">
            <MdPerson size={22} />
          </button>
          <button onClick={() => navigate('/settings')} style={styles.headerBtn} aria-label="Settings">
            <MdSettings size={22} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={styles.content}>
        {/* Welcome card banner */}
        <div style={styles.banner}>
          <h2 style={styles.bannerGreeting}>Hello, {user?.name || 'User'}</h2>
          <p style={styles.bannerDesc}>
            Record business conferences, hinges, and lectures. Instantly transcribe, diarize, and summarize in cloud.
          </p>

          <div style={styles.statsRow}>
            <div style={styles.statBox}>
              <span style={styles.statVal}>{totalRecordings}</span>
              <span style={styles.statLabel}>Recordings</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statVal}>{totalMinutes} m</span>
              <span style={styles.statLabel}>Total Minutes</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statVal}>{user ? 'Connected' : 'Offline'}</span>
              <span style={styles.statLabel}>Status</span>
            </div>
          </div>
        </div>

        {/* Aggregated AI Insights Grid */}
        {recordings.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            margin: '0 24px 24px 24px',
            backgroundColor: '#151C33',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.03)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ gridColumn: '1 / -1', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', color: '#6366F1', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                AI Dashboard Analytics
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>
                Aggregated business insights across all recorded meetings
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 'bold' }}>Decision Logging</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', marginTop: '4px' }}>{totalDecisions}</div>
              <div style={{ fontSize: '10px', color: '#10B981', marginTop: '4px' }}>Key choices recorded</div>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 'bold' }}>Action Items</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', marginTop: '4px' }}>{totalActionItems}</div>
              <div style={{ fontSize: '10px', color: '#6366F1', marginTop: '4px' }}>Tasks generated by AI</div>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 'bold' }}>Average AI Accuracy</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10B981', marginTop: '4px' }}>{averageConfidence}%</div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>Diarization confidence</div>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 'bold' }}>Sentiment Tone</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '12px' }}>
                <span style={{ color: '#10B981', fontWeight: 'bold' }}>😊 {positiveCount}</span>
                <span style={{ color: '#94A3B8', fontWeight: 'bold' }}>😐 {neutralCount}</span>
                <span style={{ color: '#EF4444', fontWeight: 'bold' }}>😟 {concernedCount}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>Overall meeting mood</div>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="Search transcripts, titles, or tags..."
            style={styles.searchInput}
            onChange={handleSearchChange}
          />
        </div>

        {/* Quick actions row */}
        <div style={styles.quickGrid}>
          <QuickButton
            icon={<MdMic size={24} />}
            label="Record"
            onClick={() => handleQuickAction('Record')}
          />
          <QuickButton
            icon={<MdHistory size={24} />}
            label="History"
            onClick={() => handleQuickAction('History')}
          />
          <QuickButton
            icon={<MdStar size={24} />}
            label="Favorites"
            onClick={() => handleQuickAction('Favorites')}
          />
          <QuickButton
            icon={<MdFolder size={24} />}
            label="Meetings"
            onClick={() => handleQuickAction('Meetings')}
          />
        </div>

        {/* Recent recordings */}
        <div style={styles.sectionHeaderRow}>
          <h3 style={styles.sectionTitle}>Recent Recordings</h3>
          <button onClick={() => handleQuickAction('History')} style={styles.viewAllBtn}>
            View All
          </button>
        </div>

        {recordings.length === 0 ? (
          <div style={styles.emptyState}>
            <MdMicOff size={48} color="rgba(255, 255, 255, 0.05)" />
            <p style={styles.emptyText}>No recent recordings.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {recordings.slice(0, 5).map((rec) => (
              <div
                key={rec.id}
                onClick={() => navigate(`/transcript/${rec.id}`, { state: { recording: rec } })}
                style={styles.card}
              >
                <div style={styles.cardIconBox}>
                  <MdDescription size={22} color="#8B5CF6" />
                </div>
                <div style={styles.cardInfo}>
                  <h4 style={styles.cardTitle}>{rec.title}</h4>
                  <div style={styles.cardMeta}>
                    <span>{formatDate(rec.createdAt || rec.dateTime)}</span>
                    <span style={styles.cardMetaDot} />
                    <span>{formatDuration(rec.durationInSeconds)}</span>
                  </div>
                </div>
                <MdChevronRight size={20} color="#94A3B8" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button onClick={() => navigate('/recorder')} style={styles.fab}>
        <MdMic size={22} style={{ marginRight: '6px' }} />
        <span>Start Recording</span>
      </button>
    </div>
  );
};

const QuickButton = ({ icon, label, onClick }) => (
  <button onClick={onClick} style={styles.quickBtn}>
    <div style={styles.quickCircle}>{icon}</div>
    <span style={styles.quickLabel}>{label}</span>
  </button>
);

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#090D1A',
    color: '#FFFFFF',
    paddingBottom: '100px', // padding for FAB and bottom player dock
  },
  header: {
    height: '64px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoText: {
    fontFamily: 'Outfit',
    fontWeight: '900',
    fontSize: '20px',
    letterSpacing: '1px',
    color: '#FFFFFF',
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
  },
  headerBtn: {
    color: '#FFFFFF',
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'flex',
  },
  content: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '24px',
  },
  banner: {
    background: 'linear-gradient(135deg, #1E1B4B 0%, #151C33 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '24px',
    marginBottom: '24px',
  },
  bannerGreeting: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  bannerDesc: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: '20px',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: '16px',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
  },
  statVal: {
    fontSize: '18px',
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: '10px',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '2px',
  },
  searchBar: {
    backgroundColor: '#151C33',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  searchInput: {
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '14px',
    outline: 'none',
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  quickBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  quickCircle: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: '#151C33',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    color: '#6366F1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
    transition: 'transform 0.15s ease',
  },
  quickLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  viewAllBtn: {
    color: '#6366F1',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '40px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94A3B8',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#151C33',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid rgba(255, 255, 255, 0.02)',
    cursor: 'pointer',
    transition: 'transform 0.15s ease',
  },
  cardIconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#090D1A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: '4px',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#94A3B8',
  },
  cardMetaDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#6366F1',
  },
  fab: {
    position: 'fixed',
    bottom: '96px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: '14px',
    padding: '12px 20px',
    borderRadius: '30px',
    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
    display: 'flex',
    alignItems: 'center',
    zIndex: 99,
  },
};

export default HomePage;
