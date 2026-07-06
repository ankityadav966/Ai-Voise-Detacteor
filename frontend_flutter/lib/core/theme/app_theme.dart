import 'package:flutter/material';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Dark Theme Colors
  static const Color darkBg = Color(0xFF090D1A);
  static const Color darkCard = Color(0xFF151C33);
  static const Color darkPrimary = Color(0xFF6366F1); // Indigo
  static const Color darkSecondary = Color(0xFFEC4899); // Pink
  static const Color darkAccent = Color(0xFF8B5CF6); // Purple Accent
  static const Color darkTextPrimary = Colors.white;
  static const Color darkTextSecondary = Color(0xFF94A3B8); // Slate 400

  // Light Theme Colors
  static const Color lightBg = Color(0xFFF8FAFC);
  static const Color lightCard = Colors.white;
  static const Color lightPrimary = Color(0xFF4F46E5); // Indigo Deep
  static const Color lightSecondary = Color(0xFFDB2777); // Pink Deep
  static const Color lightAccent = Color(0xFF7C3AED); // Purple Deep
  static const Color lightTextPrimary = Color(0xFF0F172A); // Slate 900
  static const Color lightTextSecondary = Color(0xFF475569); // Slate 600

  // Linear Gradients
  static const LinearGradient premiumGradient = LinearGradient(
    colors: [Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFFD946EF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBg,
      primaryColor: darkPrimary,
      cardColor: darkCard,
      colorScheme: const ColorScheme.dark(
        primary: darkPrimary,
        secondary: darkSecondary,
        tertiary: darkAccent,
        background: darkBg,
        surface: darkCard,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onBackground: darkTextPrimary,
        onSurface: darkTextPrimary,
      ),
      textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme).copyWith(
        titleLarge: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: darkTextPrimary),
        titleMedium: GoogleFonts.outfit(fontWeight: FontWeight.w600, color: darkTextPrimary),
        bodyLarge: GoogleFonts.outfit(color: darkTextPrimary),
        bodyMedium: GoogleFonts.outfit(color: darkTextSecondary),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: Colors.white),
      ),
      cardTheme: CardTheme(
        color: darkCard,
        elevation: 4,
        shadowColor: Colors.black.withOpacity(0.2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: darkPrimary,
        foregroundColor: Colors.white,
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: lightBg,
      primaryColor: lightPrimary,
      cardColor: lightCard,
      colorScheme: const ColorScheme.light(
        primary: lightPrimary,
        secondary: lightSecondary,
        tertiary: lightAccent,
        background: lightBg,
        surface: lightCard,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onBackground: lightTextPrimary,
        onSurface: lightTextPrimary,
      ),
      textTheme: GoogleFonts.outfitTextTheme(ThemeData.light().textTheme).copyWith(
        titleLarge: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: lightTextPrimary),
        titleMedium: GoogleFonts.outfit(fontWeight: FontWeight.w600, color: lightTextPrimary),
        bodyLarge: GoogleFonts.outfit(color: lightTextPrimary),
        bodyMedium: GoogleFonts.outfit(color: lightTextSecondary),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: lightTextPrimary),
      ),
      cardTheme: CardTheme(
        color: lightCard,
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.05),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: lightPrimary,
        foregroundColor: Colors.white,
      ),
    );
  }
}
