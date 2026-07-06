import 'package:flutter/material';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'providers/settings_provider.dart';
import 'routes/app_routes.dart';

class PeterLakaApp extends ConsumerWidget {
  const PeterLakaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final router = ref.watch(routerProvider);

    ThemeMode mode;
    switch (settings.themeMode.toLowerCase()) {
      case 'light':
        mode = ThemeMode.light;
        break;
      case 'system':
        mode = ThemeMode.system;
        break;
      case 'dark':
      default:
        mode = ThemeMode.dark;
        break;
    }

    return MaterialApp.router(
      title: 'Patera Lekha',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: mode,
      routerConfig: router,
    );
  }
}
