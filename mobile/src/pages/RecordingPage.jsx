import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useSettings } from '../context/SettingsContext';
import { addRecording } from '../redux/historySlice';
import audioService from '../services/audioService';
import apiClient from '../services/apiClient';
import SoundWaveVisualizer from '../components/SoundWaveVisualizer';
import { MaterialIcons } from '@expo/vector-icons';

const RecordingPage = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { settings } = useSettings();

  const [status, setStatus] = useState('idle');
  const [secondsRecorded, setSecondsRecorded] = useState(0);
  const [amplitude, setAmplitude] = useState(0.0);
  const [progressText, setProgressText] = useState('Processing Audio...');
  const [speakersExpected, setSpeakersExpected] = useState('detect');
  
  const secondsRef = useRef(0);
  const timerId = useRef(null);

  useEffect(() => {
    startRecordingFlow();
    return () => {
      audioService.dispose();
      if (timerId.current) clearInterval(timerId.current);
    };
  }, []);

  const startRecordingFlow = async () => {
    const hasMicPermission = await audioService.hasPermission();
    if (!hasMicPermission) {
      Alert.alert('Permission Denied', 'Microphone permission is required to record audio.');
      navigation.goBack();
      return;
    }

    try {
      setStatus('recording');
      setSecondsRecorded(0);
      secondsRef.current = 0;

      await audioService.startRecording((progress) => {
        setAmplitude(progress.amplitude);
      });

      if (timerId.current) clearInterval(timerId.current);
      timerId.current = setInterval(() => {
        secondsRef.current += 1;
        setSecondsRecorded(secondsRef.current);
      }, 1000);

    } catch (e) {
      console.error('Recording initialization failed', e);
      Alert.alert('Error', 'Failed to start audio recording.');
      navigation.goBack();
    }
  };

  const pauseRecording = async () => {
    if (status !== 'recording') return;
    await audioService.pauseRecording();
    if (timerId.current) {
      clearInterval(timerId.current);
      timerId.current = null;
    }
    setStatus('paused');
    setAmplitude(0.0);
  };

  const resumeRecording = async () => {
    if (status !== 'paused') return;
    await audioService.resumeRecording();
    setStatus('recording');

    if (timerId.current) clearInterval(timerId.current);
    timerId.current = setInterval(() => {
      secondsRef.current += 1;
      setSecondsRecorded(secondsRef.current);
    }, 1000);
  };

  const handleDiscard = () => {
    Alert.alert('Discard Recording', 'Discard current recording? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Discard', 
        style: 'destructive',
        onPress: async () => {
          await audioService.cancelRecording();
          if (timerId.current) clearInterval(timerId.current);
          navigation.goBack();
        }
      }
    ]);
  };

  const handleStopAndProcess = async () => {
    if (status !== 'recording' && status !== 'paused') return;

    if (timerId.current) clearInterval(timerId.current);

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
      if (!recordingResult || !recordingResult.uri) {
        throw new Error('No audio file generated.');
      }

      const formData = new FormData();
      formData.append('durationInSeconds', recordedSeconds);
      formData.append('folder', 'General');
      formData.append('audio', {
        uri: recordingResult.uri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      });
      formData.append('transcript', ''); 
      
      if (speakersExpected !== 'detect') {
        formData.append('speakersExpected', speakersExpected);
      }

      const response = await apiClient.post('/api/recordings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      });

      if (response.data && response.data.success === true) {
        const recording = response.data.recording;
        dispatch(addRecording(recording));
        Alert.alert('Success', "Recording uploaded and processed successfully!");
        navigation.replace('Transcript', { recording });
      } else {
        throw new Error(response.data?.message || 'Processing failed.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.response?.data?.message || 'Error processing audio file. Please retry.');
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
        <ActivityIndicator size="large" color="#6366F1" style={styles.spinner} />
        <Text style={styles.processingTitle}>{progressText}</Text>
        <Text style={styles.processingDesc}>
          Uploading and running speech analytics. Please wait...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscard} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Recording</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Timer */}
        <Text style={styles.timer}>{formatTimer(secondsRecorded)}</Text>

        {/* Status Indicator */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status === 'paused' ? '#F59E0B' : '#EF4444' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: status === 'paused' ? '#F59E0B' : '#EF4444' },
            ]}
          >
            {status === 'paused' ? 'RECORDING PAUSED' : 'RECORDING ACTIVE'}
          </Text>
        </View>

        {/* Wave Visualizer */}
        <View style={styles.visualizerBox}>
          <SoundWaveVisualizer amplitude={amplitude} isRecording={status === 'recording'} />
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
                  {
                    backgroundColor: speakersExpected === opt.value ? '#6366F1' : 'transparent',
                  }
                ]}
              >
                <Text style={{
                  color: speakersExpected === opt.value ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                  fontWeight: speakersExpected === opt.value ? 'bold' : 'normal',
                }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={handleDiscard} style={styles.discardBtn}>
            <MaterialIcons name="close" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={status === 'recording' ? pauseRecording : resumeRecording}
            style={styles.micBtn}
          >
            <MaterialIcons name={status === 'recording' ? 'pause' : 'mic'} size={32} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleStopAndProcess} style={styles.checkBtn}>
            <MaterialIcons name="stop" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
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
    color: '#FFF',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timer: {
    fontSize: 64,
    fontWeight: '300',
    letterSpacing: 2,
    color: '#FFF',
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  speakersSelectorBox: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: 40,
  },
  discardBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  micBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  checkBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  processingContainer: {
    flex: 1,
    backgroundColor: '#090D1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  spinner: {
    marginBottom: 24,
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
    textAlign: 'center',
  },
});

export default RecordingPage;
