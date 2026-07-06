import 'package:flutter/material';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/database/database_helper.dart';

class LockScreen extends ConsumerStatefulWidget {
  const LockScreen({super.key});

  @override
  ConsumerState<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<LockScreen> {
  final List<int> _passcode = [];
  String _message = 'Enter Passcode';
  bool _isError = false;

  void _onNumberPressed(int number) {
    if (_passcode.length >= 4) return;

    setState(() {
      _passcode.add(number);
      _isError = false;
      _message = 'Enter Passcode';
    });

    if (_passcode.length == 4) {
      _verifyPasscode();
    }
  }

  void _onBackspace() {
    if (_passcode.isEmpty) return;
    setState(() {
      _passcode.removeLast();
    });
  }

  void _verifyPasscode() async {
    final settings = DatabaseHelper.getSettings();
    final savedPasscode = settings.passcode.isNotEmpty ? settings.passcode : '1234';

    final input = _passcode.join();
    if (input == savedPasscode) {
      setState(() {
        _message = 'Authenticated!';
      });
      await Future.delayed(const Duration(milliseconds: 300));
      if (!mounted) return;
      context.go('/home');
    } else {
      setState(() {
        _passcode.clear();
        _message = 'Invalid Passcode. Try again.';
        _isError = true;
      });
    }
  }

  void _triggerBiometric() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Simulated Face ID/Fingerprint success!'),
        backgroundColor: Color(0xFF6366F1),
        duration: Duration(seconds: 1),
      ),
    );
    await Future.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;
    context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final settings = DatabaseHelper.getSettings();

    return Scaffold(
      backgroundColor: const Color(0xFF090D1A),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 2),

            const Icon(
              Icons.lock_outline_rounded,
              size: 64,
              color: Color(0xFF6366F1),
            ),
            const SizedBox(height: 16),
            Text(
              'PATERA LEKHA SECURED',
              style: GoogleFonts.outfit(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _message,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _isError ? Colors.redAccent : const Color(0xFF94A3B8),
                fontWeight: FontWeight.w500,
              ),
            ),

            const SizedBox(height: 36),

            // Passcode Dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (index) {
                final isFilled = index < _passcode.length;
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 12),
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: isFilled ? const Color(0xFF6366F1) : Colors.transparent,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFF6366F1),
                      width: 2,
                    ),
                  ),
                );
              }),
            ),

            const Spacer(flex: 2),

            // Keypad Grid
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 48),
              child: Column(
                children: [
                  for (var row = 0; row < 3; row++) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        for (var col = 1; col <= 3; col++) ...[
                          _buildKeypadButton(row * 3 + col),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Biometrics trigger
                      settings.useBiometricLock 
                          ? _buildActionButton(Icons.fingerprint_rounded, _triggerBiometric)
                          : const SizedBox(width: 72, height: 72),
                          
                      _buildKeypadButton(0),
                      
                      _buildActionButton(Icons.backspace_outlined, _onBackspace),
                    ],
                  ),
                ],
              ),
            ),

            const Spacer(),
          ],
        ),
      ),
    );
  }

  Widget _buildKeypadButton(int number) {
    return InkWell(
      onTap: () => _onNumberPressed(number),
      borderRadius: BorderRadius.circular(36),
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          color: const Color(0xFF151C33),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withOpacity(0.04)),
        ),
        child: Center(
          child: Text(
            number.toString(),
            style: GoogleFonts.outfit(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(IconData icon, VoidCallback action) {
    return InkWell(
      onTap: action,
      borderRadius: BorderRadius.circular(36),
      child: Container(
        width: 72,
        height: 72,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Icon(
            icon,
            size: 26,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}
