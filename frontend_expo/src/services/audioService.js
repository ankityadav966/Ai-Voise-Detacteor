import { Audio } from 'expo-av';

class AudioService {
  constructor() {
    this.recording = null;
    this.sound = null;
    this.recordingInterval = null;
    this.playbackInterval = null;
  }

  /**
   * Check / Request Microphone permissions (Expo Audio)
   */
  async hasPermission() {
    try {
      const response = await Audio.requestPermissionsAsync();
      return response.granted;
    } catch (e) {
      console.warn('Microphone permission check failed', e);
      return false;
    }
  }

  /**
   * Start Audio Recording
   */
  async startRecording(onProgress) {
    try {
      // 1. Set audio settings for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 2. Initialize Recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;

      // 3. Monitor amplitude via metering updates
      this.recording.setOnRecordingStatusUpdate((status) => {
        if (!status.canRecord) return;

        let amplitude = 0.0;
        if (status.metering !== undefined) {
          // status.metering is in dB, ranging from -160 to 0
          const db = status.metering;
          if (db > -160) {
            // Map typical speaking ranges (-60dB to 0dB) to 0.0 - 1.0
            amplitude = Math.min(1.0, Math.max(0.0, (db + 60) / 60));
          }
        } else {
          amplitude = Math.random() * 0.15 + 0.05; // Fallback animation helper
        }

        if (onProgress) {
          onProgress({ amplitude });
        }
      });

    } catch (e) {
      console.error('Failed to start recording', e);
      throw e;
    }
  }

  /**
   * Pause Recording
   */
  async pauseRecording() {
    try {
      if (this.recording) {
        await this.recording.pauseAsync();
      }
    } catch (e) {
      console.error('Failed to pause recording', e);
    }
  }

  /**
   * Resume Recording
   */
  async resumeRecording() {
    try {
      if (this.recording) {
        await this.recording.startAsync();
      }
    } catch (e) {
      console.error('Failed to resume recording', e);
    }
  }

  /**
   * Stop Recording (Returns the File Object and URL)
   */
  async stopRecording() {
    try {
      if (!this.recording) return null;

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      // Reset recording mode configurations
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      this.recording = null;

      // Extract filename from URI
      const filename = uri.split('/').pop() || `recording_${Date.now()}.m4a`;

      // Expo files are represented as native paths.
      // We map this path to a standard multipart format.
      const file = {
        uri,
        name: filename,
        type: 'audio/m4a', // Default recording format for expo-av high quality preset
      };

      return { blob: null, fileUrl: uri, file };
    } catch (e) {
      console.error('Failed to stop recording', e);
      return null;
    }
  }

  /**
   * Cancel and discard recording
   */
  async cancelRecording() {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (e) {
      console.error('Failed to cancel recording', e);
    }
  }

  /**
   * Play Audio (Remote URL or local URI)
   */
  async playAudio(audioUrl, baseUrl, onProgress, onCompleted) {
    try {
      await this.stopAudio(); // Stop active sound first

      let fullUrl = audioUrl;
      if (!audioUrl.startsWith('http') && !audioUrl.startsWith('file:') && baseUrl) {
        fullUrl = `${baseUrl}${audioUrl}`;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true }
      );
      this.sound = sound;

      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;

        if (status.isPlaying) {
          if (onProgress) {
            onProgress({
              position: status.positionMillis,
              duration: status.durationMillis || 0,
            });
          }
        }

        if (status.didJustFinish) {
          this.stopAudio();
          if (onCompleted) onCompleted();
        }
      });
    } catch (e) {
      console.error('Failed to play audio', e);
      if (onCompleted) onCompleted();
    }
  }

  /**
   * Pause Audio Playback
   */
  async pauseAudio() {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
      }
    } catch (e) {
      console.error('Failed to pause audio', e);
    }
  }

  /**
   * Resume Audio Playback
   */
  async resumeAudio() {
    try {
      if (this.sound) {
        await this.sound.playAsync();
      }
    } catch (e) {
      console.error('Failed to resume audio', e);
    }
  }

  /**
   * Seek Audio Position (in milliseconds)
   */
  async seekAudio(positionMs) {
    try {
      if (this.sound) {
        await this.sound.setPositionAsync(positionMs);
      }
    } catch (e) {
      console.error('Failed to seek audio', e);
    }
  }

  /**
   * Stop Playback
   */
  async stopAudio() {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (e) {
      console.error('Failed to stop audio', e);
    }
  }

  /**
   * Set Playback Speed Rate
   */
  async setPlaybackSpeed(speed) {
    try {
      if (this.sound) {
        await this.sound.setRateAsync(speed, true);
      }
    } catch (e) {
      console.error('Failed to set speed rate', e);
    }
  }

  /**
   * Dispose Resources
   */
  async dispose() {
    await this.cancelRecording();
    await this.stopAudio();
  }
}

export default new AudioService();
