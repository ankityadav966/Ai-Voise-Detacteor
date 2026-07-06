import 'package:hive_flutter/hive_flutter.dart';
import '../../models/settings_model.dart';

class DatabaseHelper {
  static const String settingsBoxName = 'settingsBox';
  static const String authBoxName = 'authBox';

  static Future<void> init() async {
    await Hive.initFlutter();
    
    // Register settings adapter
    Hive.registerAdapter(SettingsModelAdapter());

    // Open boxes
    await Hive.openBox<SettingsModel>(settingsBoxName);
    await Hive.openBox(authBoxName);
  }

  static Box<SettingsModel> getSettingsBox() {
    return Hive.box<SettingsModel>(settingsBoxName);
  }

  static Box getAuthBox() {
    return Hive.box(authBoxName);
  }

  static SettingsModel getSettings() {
    final box = getSettingsBox();
    if (box.isEmpty) {
      final defaultSettings = SettingsModel();
      box.put('current', defaultSettings);
      return defaultSettings;
    }
    return box.get('current')!;
  }

  static Future<void> saveSettings(SettingsModel settings) async {
    final box = getSettingsBox();
    await box.put('current', settings);
  }

  // --- TOKEN CACHE METHODS ---

  static Future<void> saveTokens(String accessToken, String refreshToken) async {
    final box = getAuthBox();
    await box.put('accessToken', accessToken);
    await box.put('refreshToken', refreshToken);
  }

  static String? getAccessToken() {
    return getAuthBox().get('accessToken') as String?;
  }

  static String? getRefreshToken() {
    return getAuthBox().get('refreshToken') as String?;
  }

  static Future<void> clearAuthData() async {
    final box = getAuthBox();
    await box.delete('accessToken');
    await box.delete('refreshToken');
    await box.delete('user');
  }

  static Future<void> saveUserData(Map<String, dynamic> userMap) async {
    final box = getAuthBox();
    await box.put('user', userMap);
  }

  static Map<String, dynamic>? getUserData() {
    final data = getAuthBox().get('user');
    if (data == null) return null;
    return Map<String, dynamic>.from(data as Map);
  }
}
