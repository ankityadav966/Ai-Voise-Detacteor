import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialIcons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

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

  const handleProgressChange = (val) => {
    seek(val);
  };

  const cycleSpeed = () => {
    const speeds = [1.0, 1.2, 1.5, 2.0];
    const currentIndex = speeds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Play/Pause Control Circle */}
        <TouchableOpacity
          onPress={isPlaying ? pause : resume}
          style={styles.playButton}
          activeOpacity={0.8}
        >
          <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Info & Slider Row */}
        <View style={styles.trackDetails}>
          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {currentRecording.title}
            </Text>
            <Text style={styles.trackTime}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>
          
          <Slider
            minimumValue={0}
            maximumValue={duration || 100}
            value={position}
            onSlidingComplete={handleProgressChange}
            minimumTrackTintColor="#6366F1"
            maximumTrackTintColor="rgba(255, 255, 255, 0.1)"
            thumbTintColor="#6366F1"
            style={styles.progressBar}
          />
        </View>

        {/* Speed Adjustment */}
        <TouchableOpacity onPress={cycleSpeed} style={styles.speedButton} activeOpacity={0.7}>
          <Text style={styles.speedText}>{speed.toFixed(1)}x</Text>
        </TouchableOpacity>

        {/* Close/Stop Panel Button */}
        <TouchableOpacity onPress={stop} style={styles.stopButton} activeOpacity={0.7}>
          <MaterialIcons name="stop" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: '#151C33',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  trackDetails: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  trackInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  trackTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 13,
    maxWidth: 150,
  },
  trackTime: {
    color: '#94A3B8',
    fontWeight: '500',
    fontSize: 12,
  },
  progressBar: {
    width: '100%',
    height: 20,
  },
  speedButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    color: '#6366F1',
    fontWeight: 'bold',
    fontSize: 12,
  },
  stopButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BottomPlayerPanel;
