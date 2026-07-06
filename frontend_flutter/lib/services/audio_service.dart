import 'dart:async';
import 'package:record/record.dart';
import 'package:just_audio/just_audio.dart';

class AudioService {
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();

  // Recorder duration counter state
  int _secondsRecorded = 0;
  final _amplitudeController = StreamController<double>.broadcast();

  // Recording streams
  Stream<double> get amplitudeStream => _amplitudeController.stream;
  int get secondsRecorded => _secondsRecorded;

  // Player streams
  Stream<PlayerState> get playerStateStream => _player.playerStateStream;
  Stream<Duration> get positionStream => _player.positionStream;
  Stream<Duration?> get durationStream => _player.durationStream;

  /// Check microphone permission
  Future<bool> hasPermission() async {
    return await _recorder.hasPermission();
  }

  /// Start Audio Recording
  Future<void> startRecording(String filePath) async {
    if (await _recorder.isRecording()) return;
    _secondsRecorded = 0;
    
    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        sampleRate: 16000,
        numChannels: 1,
      ),
      path: filePath,
    );
  }

  /// Pause Recording
  Future<void> pauseRecording() async {
    await _recorder.pause();
  }

  /// Resume Recording
  Future<void> resumeRecording() async {
    await _recorder.resume();
  }

  /// Stop Recording and save local file
  Future<String?> stopRecording() async {
    final path = await _recorder.stop();
    return path;
  }

  /// Cancel and delete audio chunks
  Future<void> cancelRecording() async {
    await _recorder.stop();
  }

  /// Query active microphone status
  Future<bool> isRecording() async {
    return await _recorder.isRecording();
  }

  Future<bool> isPaused() async {
    return await _recorder.isPaused();
  }

  /// Fetch microphone volume amplitudes (0.0 to 1.0)
  Future<double> getAmplitude() async {
    final amp = await _recorder.getAmplitude();
    double normalized = (amp.current + 160) / 160;
    return normalized.clamp(0.0, 1.0);
  }

  // --- AUDIO PLAYER CONTROLS ---

  /// Play audio url or path
  Future<void> playAudio(String audioUrl, {String? baseUrl}) async {
    try {
      final String fullUrl = (audioUrl.startsWith('http') || baseUrl == null) 
          ? audioUrl 
          : '$baseUrl$audioUrl';

      if (fullUrl.startsWith('http')) {
        await _player.setUrl(fullUrl);
      } else {
        await _player.setFilePath(fullUrl);
      }
      await _player.play();
    } catch (e) {
      throw Exception('Playback failed: $e');
    }
  }

  /// Pause playback
  Future<void> pauseAudio() async {
    await _player.pause();
  }

  /// Resume playback
  Future<void> resumeAudio() async {
    await _player.play();
  }

  /// Seek position
  Future<void> seekAudio(Duration position) async {
    await _player.seek(position);
  }

  /// Playback speed rate configuration
  Future<void> setPlaybackSpeed(double speed) async {
    await _player.setSpeed(speed);
  }

  /// Stop playback
  Future<void> stopAudio() async {
    await _player.stop();
  }

  /// Clean resources
  void dispose() {
    _recorder.dispose();
    _player.dispose();
    _amplitudeController.close();
  }
}
