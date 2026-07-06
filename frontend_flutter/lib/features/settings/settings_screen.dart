import 'package:flutter/material';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/settings_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _apiUrlController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final settings = ref.read(settingsProvider);
      _apiUrlController.text = settings.apiUrl;
    });
  }

  @override
  void dispose() {
    _apiUrlController.dispose();
    super.dispose();
  }

  void _saveSettings() {
    ref.read(settingsProvider.notifier).updateSettings(
      apiUrl: _apiUrlController.text.trim(),
    );
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Settings saved successfully!'), backgroundColor: Color(0xFF10B981)),
    );
  }

  void _setupPasscode() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF151C33),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Setup Passcode', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          content: TextField(
            controller: controller,
            obscureText: true,
            maxLength: 4,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(
              labelText: '4-Digit Passcode',
              labelStyle: TextStyle(color: Color(0xFF94A3B8)),
              enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF6366F1))),
              focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF8B5CF6))),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => context.pop(),
              child: Text('Cancel', style: GoogleFonts.outfit(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
              onPressed: () {
                if (controller.text.length == 4) {
                  ref.read(settingsProvider.notifier).updateSettings(passcode: controller.text);
                  context.pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Passcode lock configured!'), backgroundColor: Color(0xFF10B981)),
                  );
                }
              },
              child: Text('Save', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF090D1A),
      appBar: AppBar(
        title: Text(
          'Settings',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionHeader('Backend Connection'),
              _buildSettingsCard([
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: TextField(
                    controller: _apiUrlController,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    decoration: const InputDecoration(
                      labelText: 'API Base URL',
                      labelStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                      hintText: 'e.g. http://192.168.1.100:5000',
                      hintStyle: TextStyle(color: Colors.white24, fontSize: 12),
                      enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: Colors.white10), borderRadius: BorderRadius.all(Radius.circular(8))),
                      focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF6366F1)), borderRadius: BorderRadius.all(Radius.circular(8))),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16.0, 0, 16.0, 16.0),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: _saveSettings,
                      child: Text('Save Endpoint', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ),
              ]),

              const SizedBox(height: 24),

              _buildSectionHeader('Speech & Voice Recognition'),
              _buildSettingsCard([
                ListTile(
                  title: Text('Speech Recognition Language', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                  subtitle: Text(settings.speechLanguage == 'en-US' ? 'English (US)' : 'Hindi (India)', style: GoogleFonts.outfit()),
                  trailing: const Icon(Icons.keyboard_arrow_right, color: Color(0xFF6366F1)),
                  onTap: () {
                    _showLanguagePicker(settings.speechLanguage);
                  },
                ),
              ]),

              const SizedBox(height: 24),

              _buildSectionHeader('Security & Theme'),
              _buildSettingsCard([
                ListTile(
                  title: Text('App Theme', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                  subtitle: Text(settings.themeMode.toUpperCase(), style: GoogleFonts.outfit()),
                  trailing: const Icon(Icons.keyboard_arrow_right, color: Color(0xFF6366F1)),
                  onTap: () {
                    _showThemePicker(settings.themeMode);
                  },
                ),
                const Divider(color: Colors.white10, height: 1),
                SwitchListTile(
                  title: Text('Biometric Lock', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                  subtitle: Text('Secure access using Face ID / Fingerprint.', style: GoogleFonts.outfit(fontSize: 12)),
                  value: settings.useBiometricLock,
                  activeColor: const Color(0xFF6366F1),
                  onChanged: (val) {
                    ref.read(settingsProvider.notifier).updateSettings(useBiometricLock: val);
                  },
                ),
                const Divider(color: Colors.white10, height: 1),
                ListTile(
                  title: Text('Setup Lock Passcode', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                  subtitle: Text(settings.passcode.isNotEmpty ? 'Passcode is Active' : 'No passcode set', style: GoogleFonts.outfit(fontSize: 12)),
                  trailing: const Icon(Icons.pin_outlined, color: Color(0xFF6366F1)),
                  onTap: _setupPasscode,
                ),
              ]),

              const SizedBox(height: 24),

              _buildSectionHeader('Info'),
              _buildSettingsCard([
                ListTile(
                  title: Text('Patera Lekha Version', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                  subtitle: Text('v1.0.0 (Production Build)', style: GoogleFonts.outfit()),
                  trailing: const Icon(Icons.info_outline, color: Color(0xFF94A3B8)),
                ),
              ]),

              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 8.0, bottom: 8.0),
      child: Text(
        title,
        style: GoogleFonts.outfit(
          color: const Color(0xFF6366F1),
          fontWeight: FontWeight.bold,
          fontSize: 13,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildSettingsCard(List<Widget> children) {
    return Card(
      color: const Color(0xFF151C33),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.white.withOpacity(0.03)),
      ),
      child: Column(
        children: children,
      ),
    );
  }

  void _showLanguagePicker(String current) {
    showDialog(
      context: context,
      builder: (context) {
        return SimpleDialog(
          backgroundColor: const Color(0xFF151C33),
          title: Text('Select Speech Language', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          children: [
            SimpleDialogOption(
              onPressed: () {
                ref.read(settingsProvider.notifier).updateSettings(speechLanguage: 'en-US');
                context.pop();
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('English (US)', style: TextStyle(color: Colors.white)),
                  if (current == 'en-US') const Icon(Icons.check, color: Color(0xFF6366F1)),
                ],
              ),
            ),
            SimpleDialogOption(
              onPressed: () {
                ref.read(settingsProvider.notifier).updateSettings(speechLanguage: 'hi-IN');
                context.pop();
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Hindi (India)', style: TextStyle(color: Colors.white)),
                  if (current == 'hi-IN') const Icon(Icons.check, color: Color(0xFF6366F1)),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  void _showThemePicker(String current) {
    showDialog(
      context: context,
      builder: (context) {
        return SimpleDialog(
          backgroundColor: const Color(0xFF151C33),
          title: Text('Select App Theme', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          children: [
            SimpleDialogOption(
              onPressed: () {
                ref.read(settingsProvider.notifier).updateSettings(themeMode: 'dark');
                context.pop();
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Dark Mode', style: TextStyle(color: Colors.white)),
                  if (current == 'dark') const Icon(Icons.check, color: Color(0xFF6366F1)),
                ],
              ),
            ),
            SimpleDialogOption(
              onPressed: () {
                ref.read(settingsProvider.notifier).updateSettings(themeMode: 'light');
                context.pop();
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Light Mode', style: TextStyle(color: Colors.white)),
                  if (current == 'light') const Icon(Icons.check, color: Color(0xFF6366F1)),
                ],
              ),
            ),
            SimpleDialogOption(
              onPressed: () {
                ref.read(settingsProvider.notifier).updateSettings(themeMode: 'system');
                context.pop();
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('System Default', style: TextStyle(color: Colors.white)),
                  if (current == 'system') const Icon(Icons.check, color: Color(0xFF6366F1)),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}
