import React, { createContext, useContext, useState, useEffect } from 'react';
import audioService from '../services/audioService';
import { useSettings } from './SettingsContext';

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const { settings } = useSettings();

  const [currentRecording, setCurrentRecording] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1.0);

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      audioService.stopAudio();
    };
  }, []);

  /**
   * Play recording
   */
  const play = (recording) => {
    if (!recording || !recording.audioUrl) return;

    setCurrentRecording(recording);
    setIsPlaying(true);
    setPosition(0);
    setDuration((recording.durationInSeconds || 0) * 1000);

    audioService.playAudio(
      recording.audioUrl,
      settings.apiUrl,
      (progress) => {
        setPosition(progress.position);
        if (progress.duration > 0) {
          setDuration(progress.duration);
        }
      },
      () => {
        // Playback finished
        setIsPlaying(false);
        setPosition(0);
      }
    );
    // Apply speed settings if modified
    audioService.setPlaybackSpeed(speed);
  };

  /**
   * Pause
   */
  const pause = () => {
    if (isPlaying) {
      audioService.pauseAudio();
      setIsPlaying(false);
    }
  };

  /**
   * Resume
   */
  const resume = () => {
    if (currentRecording && !isPlaying) {
      audioService.resumeAudio();
      setIsPlaying(true);
    }
  };

  /**
   * Stop
   */
  const stop = () => {
    audioService.stopAudio();
    setCurrentRecording(null);
    setIsPlaying(false);
    setPosition(0);
  };

  /**
   * Seek (milliseconds)
   */
  const seek = (positionMs) => {
    if (currentRecording) {
      audioService.seekAudio(positionMs);
      setPosition(positionMs);
    }
  };

  /**
   * Adjust Speed
   */
  const adjustSpeed = (newSpeed) => {
    setSpeed(newSpeed);
    if (currentRecording) {
      audioService.setPlaybackSpeed(newSpeed);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentRecording,
        isPlaying,
        position,
        duration,
        speed,
        play,
        pause,
        resume,
        stop,
        seek,
        setSpeed: adjustSpeed,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
