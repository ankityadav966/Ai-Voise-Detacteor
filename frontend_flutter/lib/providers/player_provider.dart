import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';
import '../services/audio_service.dart';
import 'settings_provider.dart';

class PlayerStateData {
  final String? audioPath;
  final bool isPlaying;
  final Duration position;
  final Duration duration;
  final double speed;

  PlayerStateData({
    this.audioPath,
    this.isPlaying = false,
    this.position = Duration.zero,
    this.duration = Duration.zero,
    this.speed = 1.0,
  });

  PlayerStateData copyWith({
    String? audioPath,
    bool? isPlaying,
    Duration? position,
    Duration? duration,
    double? speed,
  }) {
    return PlayerStateData(
      audioPath: audioPath ?? this.audioPath,
      isPlaying: isPlaying ?? this.isPlaying,
      position: position ?? this.position,
      duration: duration ?? this.duration,
      speed: speed ?? this.speed,
    );
  }
}

class PlayerNotifier extends StateNotifier<PlayerStateData> {
  final Ref _ref;
  final AudioService _audioService = AudioService();
  StreamSubscription? _stateSub;
  StreamSubscription? _posSub;
  StreamSubscription? _durSub;

  PlayerNotifier(this._ref) : super(PlayerStateData()) {
    _initStreams();
  }

  void _initStreams() {
    _stateSub = _audioService.playerStateStream.listen((state) {
      final isPlaying = state.playing && state.processingState != ProcessingState.completed;
      this.state = this.state.copyWith(isPlaying: isPlaying);
    });

    _posSub = _audioService.positionStream.listen((pos) {
      this.state = this.state.copyWith(position: pos);
    });

    _durSub = _audioService.durationStream.listen((dur) {
      if (dur != null) {
        this.state = this.state.copyWith(duration: dur);
      }
    });
  }

  Future<void> play(String path) async {
    if (state.audioPath != null && state.audioPath != path) {
      await _audioService.stopAudio();
    }

    state = state.copyWith(audioPath: path);

    // If path is a remote file path, prepend the base backend API URL dynamically
    final settings = _ref.read(settingsProvider);
    await _audioService.playAudio(path, baseUrl: settings.apiUrl);
  }

  Future<void> pause() async {
    await _audioService.pauseAudio();
  }

  Future<void> resume() async {
    await _audioService.resumeAudio();
  }

  Future<void> seek(Duration pos) async {
    await _audioService.seekAudio(pos);
  }

  Future<void> setSpeed(double speed) async {
    await _audioService.setPlaybackSpeed(speed);
    state = state.copyWith(speed: speed);
  }

  Future<void> stop() async {
    await _audioService.stopAudio();
    state = state.copyWith(isPlaying: false, position: Duration.zero);
  }

  @override
  void dispose() {
    _stateSub?.cancel();
    _posSub?.cancel();
    _durSub?.cancel();
    _audioService.dispose();
    super.dispose();
  }
}

final playerProvider = StateNotifierProvider<PlayerNotifier, PlayerStateData>((ref) {
  return PlayerNotifier(ref);
});
