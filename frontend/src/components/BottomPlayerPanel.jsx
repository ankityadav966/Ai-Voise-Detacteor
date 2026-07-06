import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { MdPlayArrow, MdPause, MdStop } from 'react-icons/md';

const BottomPlayerPanel = () => {
  const {
    currentRecording,
    isPlaying,
    position,
    duration,
    speed,
    pause,
    resume,
    stop,
    seek,
    setSpeed,
  } = usePlayer();

  if (!currentRecording) return null;

  // Format position & duration: MM:SS
  const formatTime = (ms) => {
    if (isNaN(ms) || ms < 0) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e) => {
    seek(Number(e.target.value));
  };

  const cycleSpeed = () => {
    const speeds = [1.0, 1.2, 1.5, 2.0];
    const currentIndex = speeds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Play/Pause Control Circle */}
        <button
          onClick={isPlaying ? pause : resume}
          style={styles.playButton}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
        </button>

        {/* Info & Slider Row */}
        <div style={styles.trackDetails}>
          <div style={styles.trackInfo}>
            <span style={styles.trackTitle}>{currentRecording.title}</span>
            <span style={styles.trackTime}>
              {formatTime(position)} / {formatTime(duration)}
            </span>
          </div>
          
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={position}
            onChange={handleProgressChange}
            style={styles.progressBar}
          />
        </div>

        {/* Speed Adjustment */}
        <button onClick={cycleSpeed} style={styles.speedButton}>
          {speed.toFixed(1)}x
        </button>

        {/* Close/Stop Panel Button */}
        <button onClick={stop} style={styles.stopButton} aria-label="Stop">
          <MdStop size={22} />
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80px',
    backgroundColor: 'rgba(21, 28, 51, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.3)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
  },
  content: {
    width: '100%',
    maxWidth: '960px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  playButton: {
    width: '44px',
    height: '44px',
    borderRadius: '22px',
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    transition: 'transform 0.15s ease',
  },
  trackDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  trackInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  trackTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    maxWidth: '200px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  trackTime: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#6366F1',
  },
  speedButton: {
    color: '#6366F1',
    fontWeight: 'bold',
    fontSize: '13px',
    padding: '8px 12px',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: '6px',
    border: '1px solid rgba(99, 102, 241, 0.2)',
  },
  stopButton: {
    color: '#94A3B8',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s ease',
  },
};

export default BottomPlayerPanel;
