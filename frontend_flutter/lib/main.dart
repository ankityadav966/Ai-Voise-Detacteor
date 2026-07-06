import 'package:flutter/material';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/database/database_helper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize local database helper (Hive settings and caching)
  await DatabaseHelper.init();

  runApp(
    const ProviderScope(
      child: PeterLakaApp(),
    ),
  );
}
