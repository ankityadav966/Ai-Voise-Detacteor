class AudioService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    
    // Playback state
    this.audioElement = null;
    this.playbackInterval = null;

    // Web Audio Analyzer state (for real-time amplitude/waveform)
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
  }

  /**
   * Check / Request Microphone permissions (Web mediaDevices)
   */
  async hasPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      // Stop the test stream immediately
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (e) {
      console.warn('Microphone permission denied', e);
      return false;
    }
  }

  /**
   * Start Audio Recording
   */
  async startRecording(onProgress) {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });

    // 1. Initialize Web Audio API Analyser for real-time volume/amplitude meter
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    } catch (e) {
      console.error('Web Audio context creation failed', e);
    }

    // 2. Initialize MediaRecorder
    // Browser support check: WebM vs M4A vs Ogg audio formats
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg';
    }

    this.mediaRecorder = new MediaRecorder(this.stream, { 
      mimeType, 
      audioBitsPerSecond: 128000 // High quality bitrate
    });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(); // Trigger dataavailable only when stopped, to prevent choppy audio

    // 3. Start Amplitude progress interval
    this.playbackInterval = setInterval(() => {
      let amplitude = 0.0;
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i];
        }
        amplitude = sum / this.dataArray.length / 255; // Normalize 0 to 1
      } else {
        amplitude = Math.random() * 0.15 + 0.05; // Fallback
      }

      if (onProgress) {
        onProgress({ amplitude });
      }
    }, 100);
  }

  /**
   * Pause Recording
   */
  pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      if (this.audioContext && this.audioContext.state === 'running') {
        this.audioContext.suspend();
      }
    }
  }

  /**
   * Resume Recording
   */
  resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }
  }

  /**
   * Stop Recording (Returns the File Object and URL)
   */
  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Stop all mic tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
        }

        // Clean up audio analyzer
        if (this.audioContext) {
          this.audioContext.close();
        }

        clearInterval(this.playbackInterval);

        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const fileUrl = URL.createObjectURL(blob);

        // Map extension based on mimetype
        let ext = 'webm';
        if (mimeType.includes('mp4')) ext = 'm4a';
        else if (mimeType.includes('ogg')) ext = 'ogg';

        const file = new File([blob], `recording_${Date.now()}.${ext}`, { type: mimeType });

        resolve({ blob, fileUrl, file });
      };

      if (this.mediaRecorder.state === 'inactive') {
        this.mediaRecorder.onstop();
      } else {
        this.mediaRecorder.stop();
      }
    });
  }

  /**
   * Cancel and discard recording
   */
  cancelRecording() {
    if (this.mediaRecorder) {
      this.mediaRecorder.onstop = null; // Ignore stop events
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    clearInterval(this.playbackInterval);
    this.audioChunks = [];
  }

  /**
   * Play Audio (Remote URL or Blob URL)
   */
  playAudio(audioUrl, baseUrl, onProgress, onCompleted) {
    this.stopAudio(); // Reset active audio

    let fullUrl = audioUrl;
    if (!audioUrl.startsWith('http') && !audioUrl.startsWith('blob:') && baseUrl) {
      fullUrl = `${baseUrl}${audioUrl}`;
    }

    this.audioElement = new Audio(fullUrl);
    this.audioElement.play();

    // Start progress tracking tick
    this.playbackInterval = setInterval(() => {
      if (this.audioElement) {
        const positionMs = this.audioElement.currentTime * 1000;
        const durationMs = (this.audioElement.duration || 0) * 1000;

        if (onProgress) {
          onProgress({
            position: positionMs,
            duration: durationMs,
          });
        }
      }
    }, 100);

    this.audioElement.onended = () => {
      this.stopAudio();
      if (onCompleted) onCompleted();
    };
  }

  /**
   * Pause Audio Playback
   */
  pauseAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * Resume Audio Playback
   */
  resumeAudio() {
    if (this.audioElement) {
      this.audioElement.play();
    }
  }

  /**
   * Seek Audio Position (in milliseconds)
   */
  seekAudio(positionMs) {
    if (this.audioElement) {
      this.audioElement.currentTime = positionMs / 1000;
    }
  }

  /**
   * Stop Playback
   */
  stopAudio() {
    clearInterval(this.playbackInterval);
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }

  /**
   * Set Playback Speed Rate
   */
  setPlaybackSpeed(speed) {
    if (this.audioElement) {
      this.audioElement.defaultPlaybackRate = speed;
      this.audioElement.playbackRate = speed;
    }
  }

  /**
   * Dispose Resources
   */
  dispose() {
    this.cancelRecording();
    this.stopAudio();
  }
}

export default new AudioService();
