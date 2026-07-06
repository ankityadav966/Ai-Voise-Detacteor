import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

import '../models/recording_model.dart';
import '../services/audio_service.dart';
import 'auth_provider.dart';
import 'history_provider.dart';
import 'settings_provider.dart';

enum RecorderStatus {
  idle,
  recording,
  paused,
  transcribing, // Uploading & transcribing in backend
  summarizing,  // Enhancing transcript in backend (represented as single loading status or sequential)
  completed,
  error,
}

class RecorderState {
  final RecorderStatus status;
  final int secondsRecorded;
  final double amplitude;
  final String liveTranscript;
  final String? audioPath;
  final String errorMessage;
  final RecordingModel? resultRecording;

  RecorderState({
    this.status = RecorderStatus.idle,
    this.secondsRecorded = 0,
    this.amplitude = 0.0,
    this.liveTranscript = '',
    this.audioPath,
    this.errorMessage = '',
    this.resultRecording,
  });

  RecorderState copyWith({
    RecorderStatus? status,
    int? secondsRecorded,
    double? amplitude,
    String? liveTranscript,
    String? audioPath,
    String? errorMessage,
    RecordingModel? resultRecording,
  }) {
    return RecorderState(
      status: status ?? this.status,
      secondsRecorded: secondsRecorded ?? this.secondsRecorded,
      amplitude: amplitude ?? this.amplitude,
      liveTranscript: liveTranscript ?? this.liveTranscript,
      audioPath: audioPath ?? this.audioPath,
      errorMessage: errorMessage ?? this.errorMessage,
      resultRecording: resultRecording ?? this.resultRecording,
    );
  }
}

class RecorderNotifier extends StateNotifier<RecorderState> {
  final Ref _ref;
  final AudioService _audioService = AudioService();
  final stt.SpeechToText _speechToText = stt.SpeechToText();

  Timer? _timer;
  Timer? _amplitudeTimer;
  bool _speechInitialized = false;
  String _accumulatedTranscript = '';

  RecorderNotifier(this._ref) : super(RecorderState());

  /// Request permissions and start local recording
  Future<void> startRecording() async {
    final recordPermission = await _audioService.hasPermission();
    if (!recordPermission) {
      state = state.copyWith(
        status: RecorderStatus.error,
        errorMessage: 'Microphone permission is required.',
      );
      return;
    }

    try {
      state = RecorderState(status: RecorderStatus.recording);
      _accumulatedTranscript = '';

      final tempDir = await getTemporaryDirectory();
      final path = '${tempDir.path}/rec_${DateTime.now().millisecondsSinceEpoch}.m4a';

      // Start audio recorder
      await _audioService.startRecording(path);

      // Start local Speech-to-Text for live feedback preview
      _startLiveSpeechRecognition();

      // Start duration timers
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        state = state.copyWith(secondsRecorded: state.secondsRecorded + 1);
      });

      _amplitudeTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) async {
        final amp = await _audioService.getAmplitude();
        state = state.copyWith(amplitude: amp);
      });

      state = state.copyWith(audioPath: path);
    } catch (e) {
      _cleanupTimers();
      state = state.copyWith(
        status: RecorderStatus.error,
        errorMessage: 'Failed to start recording: $e',
      );
    }
  }

  /// Pause recording
  Future<void> pauseRecording() async {
    if (state.status != RecorderStatus.recording) return;

    try {
      await _audioService.pauseRecording();
      _speechToText.stop();
      _timer?.cancel();
      _amplitudeTimer?.cancel();
      state = state.copyWith(status: RecorderStatus.paused, amplitude: 0.0);
    } catch (e) {
      state = state.copyWith(
        status: RecorderStatus.error,
        errorMessage: 'Failed to pause recording: $e',
      );
    }
  }

  /// Resume recording
  Future<void> resumeRecording() async {
    if (state.status != RecorderStatus.paused) return;

    try {
      await _audioService.resumeRecording();
      _startLiveSpeechRecognition();
      
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        state = state.copyWith(secondsRecorded: state.secondsRecorded + 1);
      });

      _amplitudeTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) async {
        final amp = await _audioService.getAmplitude();
        state = state.copyWith(amplitude: amp);
      });

      state = state.copyWith(status: RecorderStatus.recording);
    } catch (e) {
      state = state.copyWith(
        status: RecorderStatus.error,
        errorMessage: 'Failed to resume recording: $e',
      );
    }
  }

  /// Discard recording
  Future<void> cancelRecording() async {
    _cleanupTimers();
    await _audioService.cancelRecording();
    _speechToText.stop();
    state = RecorderState();
  }

  /// Stop local recording and upload file to Express API for transcription & summary
  Future<void> stopRecordingAndProcess() async {
    if (state.status != RecorderStatus.recording && state.status != RecorderStatus.paused) return;

    final path = state.audioPath;
    final seconds = state.secondsRecorded;
    
    _cleanupTimers();
    await _audioService.stopRecording();
    _speechToText.stop();

    if (path == null) {
      state = state.copyWith(
        status: RecorderStatus.error,
        errorMessage: 'Audio recording path is missing.',
      );
      return;
    }

    final audioFile = File(path);
    if (!await audioFile.exists()) {
      state = state.copyWith(
        status: RecorderStatus.error,
        errorMessage: 'Audio file does not exist on disk.',
      );
      return;
    }

    try {
      // 1. UPLOAD & TRANSCRIBE PHASE (Represented in UI)
      state = state.copyWith(status: RecorderStatus.transcribing);

      final client = _ref.read(apiClientProvider).dio;

      final formData = FormData.fromMap({
        'durationInSeconds': seconds,
        'folder': 'General',
        'transcript': state.liveTranscript.trim(),
        'audio': await MultipartFile.fromFile(
          audioFile.path,
          filename: 'recording_${DateTime.now().millisecondsSinceEpoch}.m4a',
        ),
      });

      // Submit file to backend (backend runs transcription and AI analysis synchronously in the endpoint)
      final response = await client.post(
        '/api/recordings/upload',
        data: formData,
        options: Options(
          sendTimeout: const Duration(minutes: 5),
          receiveTimeout: const Duration(minutes: 5),
        ),
      );

      if (response.data['success'] == true) {
        final recording = RecordingModel.fromJson(response.data['recording']);
        
        // Push recording to history provider
        _ref.read(historyProvider.notifier).addRecording(recording);

        state = state.copyWith(
          status: RecorderStatus.completed,
          resultRecording: recording,
        );
      } else {
        throw Exception(response.data['message'] ?? 'Backend upload processing failed.');
      }
    } catch (e) {
      state = state.copyWith(
        status: RecorderStatus.error,
        errorMessage: e is DioException 
            ? (e.response?.data?['message'] ?? 'Network error uploading audio file.')
            : 'Error processing audio upload: $e',
      );
    }
  }

  void reset() {
    state = RecorderState();
  }

  // --- PRIVATE SERVICES HELPERS ---

  Future<void> _startLiveSpeechRecognition() async {
    if (!_speechInitialized) {
      final settings = _ref.read(settingsProvider);
      _speechInitialized = await _speechToText.initialize(
        onError: (val) => debugPrint('STT Error: $val'),
        onStatus: (val) => debugPrint('STT Status: $val'),
      );
    }

    if (_speechInitialized) {
      final settings = _ref.read(settingsProvider);
      _speechToText.listen(
        onResult: (result) {
          final currentWords = result.recognizedWords;
          state = state.copyWith(
            liveTranscript: _accumulatedTranscript.isEmpty 
                ? currentWords 
                : '$_accumulatedTranscript $currentWords'
          );

          if (result.finalResult) {
            _accumulatedTranscript = state.liveTranscript;
          }
        },
        localeId: settings.speechLanguage,
        cancelOnError: false,
        listenMode: stt.ListenMode.dictation,
      );
    }
  }

  void _cleanupTimers() {
    _timer?.cancel();
    _amplitudeTimer?.cancel();
  }

  @override
  void dispose() {
    _cleanupTimers();
    _audioService.dispose();
    _speechToText.stop();
    super.dispose();
  }
}

final recorderProvider = StateNotifierProvider<RecorderNotifier, RecorderState>((ref) {
  return RecorderNotifier(ref);
});
