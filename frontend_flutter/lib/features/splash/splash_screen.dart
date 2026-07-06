import 'package:flutter/material';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/database/database_helper.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigateToNext();
  }

  void _navigateToNext() async {
    await Future.delayed(const Duration(milliseconds: 2500));
    if (!mounted) return;

    final isLoggedIn = DatabaseHelper.getAccessToken() != null;
    final settings = DatabaseHelper.getSettings();

    // Check passcode lock first if enabled
    if (isLoggedIn) {
      if (settings.passcode.isNotEmpty) {
        context.go('/lock');
      } else {
        context.go('/home');
      }
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF090D1A), Color(0xFF0F172A), Color(0xFF1E1B4B)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Spacer(),
            
            // Pulsing Glowing Logo
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withOpacity(0.08)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF6366F1).withOpacity(0.15),
                    blurRadius: 40,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: const Icon(
                Icons.keyboard_voice_rounded,
                size: 82,
                color: Color(0xFF8B5CF6),
              ),
            )
            .animate(onPlay: (controller) => controller.repeat())
            .shimmer(duration: 1800.ms, color: const Color(0xFF6366F1))
            .scale(begin: const Offset(0.9, 0.9), end: const Offset(1.1, 1.1), duration: 1200.ms, curve: Curves.easeInOutDouble),

            const SizedBox(height: 32),

            // Title
            Text(
              'PATERA LEKHA',
              style: GoogleFonts.outfit(
                fontSize: 36,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: 4,
              ),
            )
            .animate()
            .fadeIn(duration: 800.ms)
            .slideY(begin: 0.3, end: 0, duration: 800.ms, curve: Curves.easeOutBack),

            const SizedBox(height: 8),

            // Subtitle
            Text(
              'INTELLIGENT AI VOICE RECORDER',
              style: GoogleFonts.outfit(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF6366F1),
                letterSpacing: 2,
              ),
            )
            .animate()
            .fadeIn(delay: 400.ms, duration: 800.ms),

            const Spacer(),

            // Loader
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation<Color>(const Color(0xFF6366F1).withOpacity(0.8)),
              ),
            ),

            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }
}
