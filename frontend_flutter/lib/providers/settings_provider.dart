import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/database/database_helper.dart';
import '../models/settings_model.dart';

class SettingsNotifier extends StateNotifier<SettingsModel> {
  SettingsNotifier() : super(SettingsModel()) {
    _loadSettings();
  }

  void _loadSettings() {
    state = DatabaseHelper.getSettings();
  }

  Future<void> updateSettings({
    String? apiUrl,
    String? themeMode,
    String? speechLanguage,
    bool? useBiometricLock,
    String? passcode,
  }) async {
    final updated = state.copyWith(
      apiUrl: apiUrl,
      themeMode: themeMode,
      speechLanguage: speechLanguage,
      useBiometricLock: useBiometricLock,
      passcode: passcode,
    );
    state = updated;
    await DatabaseHelper.saveSettings(updated);
  }
}

final settingsProvider = StateNotifierProvider<SettingsNotifier, SettingsModel>((ref) {
  return SettingsNotifier();
});
