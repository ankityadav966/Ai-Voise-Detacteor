import 'package:flutter/material';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../providers/recorder_provider.dart';

class RecordingScreen extends ConsumerStatefulWidget {
  const RecordingScreen({super.key});

  @override
  ConsumerState<RecordingScreen> createState() => _RecordingScreenState();
}

class _RecordingScreenState extends ConsumerState<RecordingScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(recorderProvider.notifier).startRecording();
    });
  }

  String _formatDuration(int totalSeconds) {
    final int hours = totalSeconds ~/ 3600;
    final int minutes = (totalSeconds % 3600) ~/ 60;
    final int seconds = totalSeconds % 60;

    final String hoursStr = hours.toString().padLeft(2, '0');
    final String minutesStr = minutes.toString().padLeft(2, '0');
    final String secondsStr = seconds.toString().padLeft(2, '0');

    if (hours > 0) {
      return '$hoursStr:$minutesStr:$secondsStr';
    }
    return '$minutesStr:$secondsStr';
  }

  @override
  Widget build(BuildContext context) {
    final recorderState = ref.watch(recorderProvider);

    // Reactive navigation to TranscriptScreen on completion
    if (recorderState.status == RecorderStatus.completed && recorderState.resultRecording != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final rec = recorderState.resultRecording!;
        ref.read(recorderProvider.notifier).reset();
        context.pushReplacement('/transcript', extra: rec);
      });
    }

    if (recorderState.status == RecorderStatus.transcribing ||
        recorderState.status == RecorderStatus.summarizing) {
      return _buildProcessingScreen(recorderState.status);
    }

    return Scaffold(
      backgroundColor: const Color(0xFF090D1A),
      appBar: AppBar(
        title: Text(
          'Live Recording',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            _showCancelDialog();
          },
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            children: [
              const SizedBox(height: 20),

              // Timer Display
              Text(
                _formatDuration(recorderState.secondsRecorded),
                style: GoogleFonts.outfit(
                  fontSize: 64,
                  fontWeight: FontWeight.w300,
                  color: Colors.white,
                  letterSpacing: 2,
                ),
              ),

              // Pulsing Recording Status Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: recorderState.status == RecorderStatus.paused
                          ? Colors.amberAccent
                          : Colors.redAccent,
                      shape: BoxShape.circle,
                    ),
                  ).animate(onPlay: (c) => c.repeat()).scale(
                        begin: const Offset(0.7, 0.7),
                        end: const Offset(1.3, 1.3),
                        duration: 800.ms,
                        curve: Curves.easeInOut,
                      ),
                  const SizedBox(width: 8),
                  Text(
                    recorderState.status == RecorderStatus.paused
                        ? 'RECORDING PAUSED'
                        : 'RECORDING ACTIVE',
                    style: GoogleFonts.outfit(
                      color: recorderState.status == RecorderStatus.paused
                          ? Colors.amberAccent
                          : Colors.redAccent,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 40),

              // Amplitude Sound Wave Visualizer
              Expanded(
                child: Center(
                  child: recorderState.status == RecorderStatus.recording
                      ? _buildWaveform(recorderState.amplitude)
                      : Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.01),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.mic_off_rounded,
                            size: 72,
                            color: Colors.white.withOpacity(0.1),
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 30),

              // Live Transcription Box
              Container(
                width: double.infinity,
                height: 180,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF151C33),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.04)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.psychology_outlined, color: Color(0xFF6366F1), size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Live Transcription Preview',
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: Colors.white10, height: 20),
                    Expanded(
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        child: Text(
                          recorderState.liveTranscript.isNotEmpty
                              ? recorderState.liveTranscript
                              : 'Start speaking. Your speech will begin translating here in real-time...',
                          style: GoogleFonts.outfit(
                            color: recorderState.liveTranscript.isNotEmpty
                                ? Colors.white.withOpacity(0.9)
                                : Colors.white24,
                            fontSize: 14,
                            height: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 36),

              // Action Controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Cancel button
                  _buildControlCircle(
                    icon: Icons.close_rounded,
                    color: const Color(0xFF1E293B),
                    iconColor: Colors.white70,
                    onTap: () {
                      _showCancelDialog();
                    },
                  ),

                  // Play/Pause button
                  _buildControlCircle(
                    icon: recorderState.status == RecorderStatus.recording
                        ? Icons.pause_rounded
                        : Icons.mic_rounded,
                    color: const Color(0xFF6366F1),
                    iconColor: Colors.white,
                    isBig: true,
                    onTap: () {
                      if (recorderState.status == RecorderStatus.recording) {
                        ref.read(recorderProvider.notifier).pauseRecording();
                      } else if (recorderState.status == RecorderStatus.paused) {
                        ref.read(recorderProvider.notifier).resumeRecording();
                      }
                    },
                  ),

                  // Done / Save button
                  _buildControlCircle(
                    icon: Icons.check_rounded,
                    color: const Color(0xFF10B981),
                    iconColor: Colors.white,
                    onTap: () {
                      ref.read(recorderProvider.notifier).stopRecordingAndProcess();
                    },
                  ),
                ],
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWaveform(double amplitude) {
    const int barCount = 13;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(barCount, (index) {
        double scale = 1.0;
        if (index == 0 || index == 12) scale = 0.25;
        else if (index == 1 || index == 11) scale = 0.45;
        else if (index == 2 || index == 10) scale = 0.65;
        else if (index == 3 || index == 9) scale = 0.85;

        final double barHeight = 120 * amplitude * scale + 10;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 100),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: 6,
          height: barHeight.clamp(10.0, 110.0),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
            borderRadius: BorderRadius.circular(10),
          ),
        );
      }),
    );
  }

  Widget _buildControlCircle({
    required IconData icon,
    required Color color,
    required Color iconColor,
    required VoidCallback onTap,
    bool isBig = false,
  }) {
    final double size = isBig ? 76.0 : 54.0;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(size),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.2),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Icon(
          icon,
          color: iconColor,
          size: isBig ? 32 : 24,
        ),
      ),
    );
  }

  Widget _buildProcessingScreen(RecorderStatus status) {
    final title = status == RecorderStatus.transcribing
        ? 'Speech to Text In Progress'
        : 'Enhancing Transcript';
    final desc = status == RecorderStatus.transcribing
        ? 'Uploading audio chunk. Running high-fidelity speaker diarization to separate conversation voices...'
        : 'AI model generating summary, extracting key points, and structuring action items...';

    return Scaffold(
      backgroundColor: const Color(0xFF090D1A),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 64,
                height: 64,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                  backgroundColor: Colors.white.withOpacity(0.02),
                ),
              ).animate(onPlay: (c) => c.repeat()).rotate(duration: 1500.ms),
              
              const SizedBox(height: 36),

              Text(
                title,
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ).animate().fadeIn(duration: 500.ms),

              const SizedBox(height: 12),

              Text(
                desc,
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  color: const Color(0xFF94A3B8),
                  height: 1.5,
                ),
              ).animate().fadeIn(delay: 200.ms, duration: 500.ms),
            ],
          ),
        ),
      ),
    );
  }

  void _showCancelDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF151C33),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Discard Recording?',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white),
          ),
          content: Text(
            'Are you sure you want to stop and delete the current recording? This action cannot be undone.',
            style: GoogleFonts.outfit(color: const Color(0xFF94A3B8)),
          ),
          actions: [
            TextButton(
              onPressed: () => context.pop(),
              child: Text('Cancel', style: GoogleFonts.outfit(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {
                ref.read(recorderProvider.notifier).cancelRecording();
                context.pop(); // Pop dialog
                context.pop(); // Pop screen
              },
              child: Text('Discard', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }
}
