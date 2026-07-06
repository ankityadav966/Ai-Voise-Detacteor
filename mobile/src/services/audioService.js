import { Audio } from 'expo-av';

class AudioService {
  constructor() {
    this.recording = null;
    this.sound = null;
    this.playbackInterval = null;
    this.onProgressCallback = null;
    this.soundProgressCallback = null;
  }

  async hasPermission() {
    try {
      const response = await Audio.requestPermissionsAsync();
      return response.status === 'granted';
    } catch (e) {
      console.warn('Microphone permission denied', e);
      return false;
    }
  }

  async startRecording(onProgress) {
    try {
      this.onProgressCallback = onProgress;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      
      this.recording.setOnRecordingStatusUpdate((status) => {
        if (this.onProgressCallback && status.isRecording) {
          const amplitude = status.metering ? Math.pow(10, status.metering / 20) : Math.random() * 0.15 + 0.05;
          this.onProgressCallback({ amplitude });
        }
      });
      await this.recording.setProgressUpdateInterval(100);
    } catch (e) {
      console.error('Failed to start recording', e);
    }
  }

  async pauseRecording() {
    if (this.recording) {
      await this.recording.pauseAsync();
    }
  }

  async resumeRecording() {
    if (this.recording) {
      await this.recording.startAsync();
    }
  }

  async stopRecording() {
    if (!this.recording) return null;

    try {
      await this.recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = this.recording.getURI();
      this.recording = null;
      this.onProgressCallback = null;
      
      return { fileUrl: uri, file: { uri, name: 'recording.m4a', type: 'audio/m4a' } };
    } catch (e) {
      console.error('Failed to stop recording', e);
      return null;
    }
  }

  async cancelRecording() {
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (e) {}
      this.recording = null;
      this.onProgressCallback = null;
    }
  }

  async playAudio(audioUrl, baseUrl, onProgress, onCompleted) {
    await this.stopAudio();
    this.soundProgressCallback = onProgress;

    let fullUrl = audioUrl;
    if (!audioUrl.startsWith('http') && !audioUrl.startsWith('file:') && baseUrl) {
      fullUrl = `${baseUrl}${audioUrl}`;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (this.soundProgressCallback) {
              this.soundProgressCallback({
                position: status.positionMillis,
                duration: status.durationMillis,
              });
            }
            if (status.didJustFinish) {
              this.stopAudio();
              if (onCompleted) onCompleted();
            }
          }
        }
      );
      this.sound = sound;
    } catch (e) {
      console.error('Failed to play audio', e);
    }
  }

  async pauseAudio() {
    if (this.sound) {
      await this.sound.pauseAsync();
    }
  }

  async resumeAudio() {
    if (this.sound) {
      await this.sound.playAsync();
    }
  }

  async seekAudio(positionMs) {
    if (this.sound) {
      await this.sound.setPositionAsync(positionMs);
    }
  }

  async stopAudio() {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (e) {}
      this.sound = null;
    }
    this.soundProgressCallback = null;
  }

  async setPlaybackSpeed(speed) {
    if (this.sound) {
      await this.sound.setRateAsync(speed, true);
    }
  }

  dispose() {
    this.cancelRecording();
    this.stopAudio();
  }
}

export default new AudioService();
