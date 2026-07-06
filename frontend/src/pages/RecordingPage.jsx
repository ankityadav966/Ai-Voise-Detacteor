import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import audioService from '../services/audioService';
import apiClient from '../services/apiClient';
import { useSettings } from '../context/SettingsContext';
import { addRecording } from '../redux/historySlice';
import SoundWaveVisualizer from '../components/SoundWaveVisualizer';
import { MdArrowBack, MdClose, MdMic, MdPause, MdCheck, MdPsychology, MdStop } from 'react-icons/md';

const RecordingPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { settings } = useSettings();

  const [status, setStatus] = useState('idle'); // 'idle' | 'recording' | 'paused' | 'transcribing'
  const [secondsRecorded, setSecondsRecorded] = useState(0);
  const [amplitude, setAmplitude] = useState(0.0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [progressText, setProgressText] = useState('Processing Audio...');
  const [speakersExpected, setSpeakersExpected] = useState('detect'); // 'detect' | '1' | '2' | '3' | '4'
  
  const secondsRef = useRef(0);
  const timerId = useRef(null);

  // Web Speech Recognition references
  const recognitionRef = useRef(null);
  const accumulatedTextRef = useRef('');

  // Clean up timers and audio streams on unmount
  useEffect(() => {
    startRecordingFlow();

    return () => {
      audioService.dispose();
      if (timerId.current) clearInterval(timerId.current);
      stopWebSpeech();
    };
  }, []);

  /**
   * Start Web Speech Recognition
   */
  const startWebSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Browser does not support Web Speech API');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.speechLanguage || 'en-IN';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            accumulatedTextRef.current += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setLiveTranscript(accumulatedTextRef.current + interimTranscript);
      };

      recognition.onerror = (e) => {
        console.error('Speech recognition error', e);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Failed to initialize speech recognition', e);
    }
  };

  /**
   * Stop Web Speech Recognition
   */
  const stopWebSpeech = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // already stopped
      }
      recognitionRef.current = null;
    }
  };

  /**
   * Start Recording flow
   */
  const startRecordingFlow = async () => {
    const hasMicPermission = await audioService.hasPermission();
    if (!hasMicPermission) {
      alert('Microphone permission is required to record audio.');
      navigate('/home');
      return;
    }

    try {
      setStatus('recording');
      setLiveTranscript('');
      accumulatedTextRef.current = '';
      setSecondsRecorded(0);
      secondsRef.current = 0;

      // Start Audio recording and track amplitude updates
      await audioService.startRecording((progress) => {
        setAmplitude(progress.amplitude);
      });

      // Start Speech Translation
      startWebSpeech();

      // Start Seconds Tick timer
      if (timerId.current) clearInterval(timerId.current);
      timerId.current = setInterval(() => {
        secondsRef.current += 1;
        setSecondsRecorded(secondsRef.current);
      }, 1000);

    } catch (e) {
      console.error('Recording initialization failed', e);
      alert('Failed to start audio recording.');
      navigate('/home');
    }
  };

  /**
   * Pause recording
   */
  const pauseRecording = () => {
    if (status !== 'recording') return;
    audioService.pauseRecording();
    stopWebSpeech();
    if (timerId.current) {
      clearInterval(timerId.current);
      timerId.current = null;
    }
    setStatus('paused');
    setAmplitude(0.0);
  };

  /**
   * Resume recording
   */
  const resumeRecording = () => {
    if (status !== 'paused') return;
    audioService.resumeRecording();
    startWebSpeech();
    setStatus('recording');

    if (timerId.current) clearInterval(timerId.current);
    timerId.current = setInterval(() => {
      secondsRef.current += 1;
      setSecondsRecorded(secondsRef.current);
    }, 1000);
  };

  /**
   * Cancel and discard recording
   */
  const handleDiscard = () => {
    const confirm = window.confirm('Discard current recording? This action cannot be undone.');
    if (confirm) {
      audioService.cancelRecording();
      stopWebSpeech();
      if (timerId.current) clearInterval(timerId.current);
      navigate('/home');
    }
  };

  /**
   * Stop and upload audio file
   */
  const handleStopAndProcess = async () => {
    if (status !== 'recording' && status !== 'paused') return;

    if (timerId.current) clearInterval(timerId.current);
    stopWebSpeech();

    const recordedSeconds = secondsRef.current;
    setStatus('transcribing');
    setProgressText('Processing Audio...');

    const progressInterval = setInterval(() => {
      setProgressText((prev) => {
        if (prev === 'Processing Audio...') return 'Transcribing Speech...';
        if (prev === 'Transcribing Speech...') return 'Generating AI Summary...';
        return prev;
      });
    }, 2000);

    try {
      const recordingResult = await audioService.stopRecording();
      if (!recordingResult || !recordingResult.file) {
        throw new Error('No audio file generated.');
      }

      // Create Form Data
      const formData = new FormData();
      formData.append('durationInSeconds', recordedSeconds);
      formData.append('folder', 'General');
      formData.append('audio', recordingResult.file, recordingResult.file.name);
      formData.append('transcript', liveTranscript.trim());
      if (speakersExpected !== 'detect') {
        formData.append('speakersExpected', speakersExpected);
      }

      // Perform upload
      const response = await apiClient.post('/api/recordings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout for transcription and processing
      });

      if (response.data && response.data.success === true) {
        const recording = response.data.recording;
        
        // Save to Redux list
        dispatch(addRecording(recording));
        
        alert("Recording uploaded and processed successfully!");
        
        // Redirect to transcript
        navigate(`/transcript/${recording.id}`, { state: { recording } });
      } else {
        throw new Error(response.data?.message || 'Processing failed.');
      }
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Error processing audio file. Please retry.');
      setStatus('paused');
    } finally {
      clearInterval(progressInterval);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (status === 'transcribing') {
    return (
      <div style={styles.processingContainer}>
        <div style={styles.spinner} />
        <h2 style={styles.processingTitle}>{progressText}</h2>
        <p style={styles.processingDesc}>
          Uploading and running speech analytics. Please wait...
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={handleDiscard} style={styles.headerBtn} aria-label="Back">
          <MdArrowBack size={24} />
        </button>
        <span style={styles.headerTitle}>Live Recording</span>
        <div style={{ width: '40px' }} />
      </div>

      <div style={styles.content}>
        {/* Timer */}
        <h1 style={styles.timer}>{formatTimer(secondsRecorded)}</h1>

        {/* Status Indicator */}
        <div style={styles.statusRow}>
          <div
            style={{
              ...styles.statusDot,
              backgroundColor: status === 'paused' ? '#F59E0B' : '#EF4444',
            }}
          />
          <span
            style={{
              ...styles.statusText,
              color: status === 'paused' ? '#F59E0B' : '#EF4444',
            }}
          >
            {status === 'paused' ? 'RECORDING PAUSED' : 'RECORDING ACTIVE'}
          </span>
        </div>

        {/* Wave Visualizer */}
        <div style={styles.visualizerBox}>
          <SoundWaveVisualizer amplitude={amplitude} isRecording={status === 'recording'} />
        </div>

        {/* Live Transcription Preview */}
        <div style={styles.transcriptBox}>
          <div style={styles.transcriptHeader}>
            <MdPsychology size={20} color="#6366F1" />
            <span style={styles.transcriptTitle}>Live Transcription Preview</span>
          </div>
          <div style={styles.divider} />
          <div style={styles.transcriptBody}>
            {liveTranscript.trim() ? (
              <p style={styles.transcriptText}>{liveTranscript}</p>
            ) : (
              <p style={styles.transcriptPlaceholder}>
                Start speaking. Your speech will begin translating here in real-time...
              </p>
            )}
          </div>
        </div>

        {/* Expected Speakers Selector */}
        <div style={styles.speakersSelectorBox}>
          <span style={styles.speakersSelectorLabel}>EXPECTED SPEAKERS</span>
          <div style={styles.speakersBtnGroup}>
            {[
              { value: 'detect', label: 'Auto' },
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSpeakersExpected(opt.value)}
                style={{
                  ...styles.speakersBtn,
                  backgroundColor: speakersExpected === opt.value ? '#6366F1' : 'transparent',
                  color: speakersExpected === opt.value ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                  fontWeight: speakersExpected === opt.value ? 'bold' : 'normal',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div style={styles.controlsRow}>
          {/* Discard */}
          <button onClick={handleDiscard} style={styles.discardBtn} title="Discard">
            <MdClose size={24} />
          </button>

          {/* Pause / Resume */}
          <button
            onClick={status === 'recording' ? pauseRecording : resumeRecording}
            style={styles.micBtn}
            title={status === 'recording' ? 'Pause' : 'Record'}
          >
            {status === 'recording' ? <MdPause size={32} /> : <MdMic size={32} />}
          </button>

          {/* Done / Save */}
          <button onClick={handleStopAndProcess} style={styles.checkBtn} title="Stop & Save">
            <MdStop size={32} />
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#090D1A',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
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
    flex: 1,
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  timer: {
    fontSize: '64px',
    fontWeight: '300',
    letterSpacing: '2px',
    marginTop: '20px',
    marginBottom: '8px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '40px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  statusText: {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  visualizerBox: {
    width: '100%',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '120px',
  },
  transcriptBox: {
    width: '100%',
    height: '180px',
    backgroundColor: '#151C33',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '20px',
    marginBottom: '36px',
    display: 'flex',
    flexDirection: 'column',
  },
  transcriptHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  transcriptTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: '10px',
  },
  transcriptBody: {
    flex: 1,
    overflowY: 'auto',
  },
  transcriptText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  transcriptPlaceholder: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.24)',
  },
  speakersSelectorBox: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '24px',
  },
  speakersSelectorLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#6366F1',
    letterSpacing: '1px',
  },
  speakersBtnGroup: {
    display: 'flex',
    backgroundColor: '#151C33',
    borderRadius: '12px',
    padding: '4px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    width: '100%',
    maxWidth: '320px',
  },
  speakersBtn: {
    flex: 1,
    height: '36px',
    borderRadius: '8px',
    fontSize: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: '20px',
  },
  discardBtn: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: '#1E293B',
    color: 'rgba(255,255,255,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  micBtn: {
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
  },
  checkBtn: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  },
  processingContainer: {
    height: '100vh',
    width: '100vw',
    backgroundColor: '#090D1A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.05)',
    borderTopColor: '#6366F1',
    borderRadius: '50%',
    animation: 'spinner 1.2s linear infinite',
    marginBottom: '24px',
  },
  processingTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: '12px',
  },
  processingDesc: {
    fontSize: '13px',
    color: '#94A3B8',
    lineHeight: '1.6',
    maxWidth: '400px',
  },
};

export default RecordingPage;
