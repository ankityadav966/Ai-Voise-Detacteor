import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import audioService from '../services/audioService';
import apiClient from '../services/apiClient';
import { useSettings } from '../context/SettingsContext';
import { addRecording } from '../redux/historySlice';
import SoundWaveVisualizer from '../components/SoundWaveVisualizer';

const RecordingScreen = () => {
  const navigation = useNavigation();
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

  // Native Speech Recognition reference placeholder (e.g. for @react-native-voice/voice)
  const recognitionRef = useRef(null);
  const accumulatedTextRef = useRef('');

  // Clean up timers and audio streams on unmount
  useEffect(() => {
    startRecordingFlow();

    return () => {
      audioService.dispose();
      if (timerId.current) clearInterval(timerId.current);
      stopNativeSpeech();
    };
  }, []);

  /**
   * Start Native Speech Recognition
   * (Placeholder logic adapting browser Web Speech API to mobile)
   */
  const startNativeSpeech = () => {
    // If user installs @react-native-voice/voice in the future:
    // Voice.start(settings.speechLanguage || 'en-IN')
    console.warn('Live Speech API is available via native @react-native-voice/voice plugin integration');
  };

  /**
   * Stop Native Speech Recognition
   */
  const stopNativeSpeech = () => {
    // Voice.stop()
  };

  /**
   * Start Recording flow
   */
  const startRecordingFlow = async () => {
    const hasMicPermission = await audioService.hasPermission();
    if (!hasMicPermission) {
      Alert.alert(
        'Permission Required',
        'Microphone permission is required to record audio.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
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
      startNativeSpeech();

      // Start Seconds Tick timer
      if (timerId.current) clearInterval(timerId.current);
      timerId.current = setInterval(() => {
        secondsRef.current += 1;
        setSecondsRecorded(secondsRef.current);
      }, 1000);

    } catch (e) {
      console.error('Recording initialization failed', e);
      Alert.alert(
        'Error',
        'Failed to start audio recording.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    }
  };

  /**
   * Pause recording
   */
  const pauseRecording = async () => {
    if (status !== 'recording') return;
    await audioService.pauseRecording();
    stopNativeSpeech();
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
  const resumeRecording = async () => {
    if (status !== 'paused') return;
    await audioService.resumeRecording();
    startNativeSpeech();
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
    Alert.alert(
      'Discard Recording',
      'Discard current recording? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await audioService.cancelRecording();
            stopNativeSpeech();
            if (timerId.current) clearInterval(timerId.current);
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  /**
   * Stop and upload audio file
   */
  const handleStopAndProcess = async () => {
    if (status !== 'recording' && status !== 'paused') return;

    if (timerId.current) clearInterval(timerId.current);
    stopNativeSpeech();

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

      // Create Form Data for React Native (uri, name, type mapping)
      const formData = new FormData();
      formData.append('durationInSeconds', recordedSeconds);
      formData.append('folder', 'General');
      
      formData.append('audio', {
        uri: recordingResult.file.uri,
        name: recordingResult.file.name,
        type: recordingResult.file.type,
      });

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
        
        Alert.alert("Success", "Recording uploaded and processed successfully!");
        
        // Redirect to transcript
        navigation.navigate('Transcript', { id: recording.id, recording });
      } else {
        throw new Error(response.data?.message || 'Processing failed.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Error',
        e.response?.data?.message || 'Error processing audio file. Please retry.'
      );
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
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#6366F1" style={{ marginBottom: 24 }} />
        <Text style={styles.processingTitle}>{progressText}</Text>
        <Text style={styles.processingDesc}>
          Uploading and running speech analytics. Please wait...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscard} style={styles.headerBtn} accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Recording</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Timer */}
        <Text style={styles.timer}>{formatTimer(secondsRecorded)}</Text>

        {/* Status Indicator */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status === 'paused' ? '#F59E0B' : '#EF4444' }
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: status === 'paused' ? '#F59E0B' : '#EF4444' }
            ]}
          >
            {status === 'paused' ? 'RECORDING PAUSED' : 'RECORDING ACTIVE'}
          </Text>
        </View>

        {/* Wave Visualizer */}
        <View style={styles.visualizerBox}>
          <SoundWaveVisualizer amplitude={amplitude} isRecording={status === 'recording'} />
        </View>

        {/* Live Transcription Preview */}
        <View style={styles.transcriptBox}>
          <View style={styles.transcriptHeader}>
            <MaterialIcons name="psychology" size={20} color="#6366F1" />
            <Text style={styles.transcriptTitle}>Live Transcription Preview</Text>
          </View>
          <View style={styles.divider} />
          <ScrollView style={styles.transcriptBody}>
            {liveTranscript.trim() ? (
              <Text style={styles.transcriptText}>{liveTranscript}</Text>
            ) : (
              <Text style={styles.transcriptPlaceholder}>
                Start speaking. Your speech will begin translating here in real-time...
              </Text>
            )}
          </ScrollView>
        </View>

        {/* Expected Speakers Selector */}
        <View style={styles.speakersSelectorBox}>
          <Text style={styles.speakersSelectorLabel}>EXPECTED SPEAKERS</Text>
          <View style={styles.speakersBtnGroup}>
            {[
              { value: 'detect', label: 'Auto' },
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setSpeakersExpected(opt.value)}
                style={[
                  styles.speakersBtn,
                  speakersExpected === opt.value && styles.speakersBtnActive
                ]}
              >
                <Text
                  style={[
                    styles.speakersBtnText,
                    speakersExpected === opt.value && styles.speakersBtnTextActive
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          {/* Discard */}
          <TouchableOpacity onPress={handleDiscard} style={styles.discardBtn}>
            <MaterialIcons name="close" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* Pause / Resume */}
          <TouchableOpacity
            onPress={status === 'recording' ? pauseRecording : resumeRecording}
            style={styles.micBtn}
          >
            <MaterialIcons
              name={status === 'recording' ? 'pause' : 'mic'}
              size={32}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Done / Save */}
          <TouchableOpacity onPress={handleStopAndProcess} style={styles.checkBtn}>
            <MaterialIcons name="stop" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D1A',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  timer: {
    fontSize: 64,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  visualizerBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginBottom: 20,
  },
  transcriptBox: {
    width: '100%',
    height: 180,
    backgroundColor: '#151C33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 20,
    marginBottom: 36,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  transcriptTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  transcriptBody: {
    flex: 1,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  transcriptPlaceholder: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.24)',
  },
  speakersSelectorBox: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  speakersSelectorLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6366F1',
    letterSpacing: 1,
    marginBottom: 8,
  },
  speakersBtnGroup: {
    flexDirection: 'row',
    backgroundColor: '#151C33',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    width: '100%',
    maxWidth: 320,
  },
  speakersBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakersBtnActive: {
    backgroundColor: '#6366F1',
  },
  speakersBtnText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  speakersBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  discardBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  micBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  checkBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  processingContainer: {
    flex: 1,
    backgroundColor: '#090D1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  processingDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
    maxWidth: 400,
    textAlign: 'center',
  },
});

export default RecordingScreen;
