import 'package:hive/hive.dart';

@HiveType(typeId: 0)
class SettingsModel extends HiveObject {
  @HiveField(0)
  String apiUrl; // IP Address of backend (e.g. http://10.0.2.2:5000 for Android emulator)

  @HiveField(1)
  String themeMode; // 'light', 'dark', 'system'

  @HiveField(2)
  String speechLanguage; // 'en-US', 'hi-IN'

  @HiveField(3)
  bool useBiometricLock;

  @HiveField(4)
  String passcode;

  SettingsModel({
    this.apiUrl = 'http://10.0.2.2:5000', // Default Android Emulator loopback URL. iOS uses localhost.
    this.themeMode = 'dark',
    this.speechLanguage = 'en-US',
    this.useBiometricLock = false,
    this.passcode = '',
  });

  SettingsModel copyWith({
    String? apiUrl,
    String? themeMode,
    String? speechLanguage,
    bool? useBiometricLock,
    String? passcode,
  }) {
    return SettingsModel(
      apiUrl: apiUrl ?? this.apiUrl,
      themeMode: themeMode ?? this.themeMode,
      speechLanguage: speechLanguage ?? this.speechLanguage,
      useBiometricLock: useBiometricLock ?? this.useBiometricLock,
      passcode: passcode ?? this.passcode,
    );
  }
}

class SettingsModelAdapter extends TypeAdapter<SettingsModel> {
  @override
  final int typeId = 0;

  @override
  SettingsModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return SettingsModel(
      apiUrl: fields[0] as String? ?? 'http://10.0.2.2:5000',
      themeMode: fields[1] as String? ?? 'dark',
      speechLanguage: fields[2] as String? ?? 'en-US',
      useBiometricLock: fields[3] as bool? ?? false,
      passcode: fields[4] as String? ?? '',
    );
  }

  @override
  void write(BinaryWriter writer, SettingsModel obj) {
    writer
      ..writeByte(5)
      ..writeByte(0)
      ..write(obj.apiUrl)
      ..writeByte(1)
      ..write(obj.themeMode)
      ..writeByte(2)
      ..write(obj.speechLanguage)
      ..writeByte(3)
      ..write(obj.useBiometricLock)
      ..writeByte(4)
      ..write(obj.passcode);
  }
}
