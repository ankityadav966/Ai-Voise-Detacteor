import 'dart:io';
import 'package:flutter/material';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
import '../../providers/history_provider.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _nameController = TextEditingController();
  bool _isEditing = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(authProvider);
      if (user != null) {
        _nameController.text = user.name;
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<double> _calculateSpaceUsed(List<String> paths) async {
    double totalMb = 0.0;
    for (var path in paths) {
      try {
        final file = File(path);
        if (await file.exists()) {
          final size = await file.length();
          totalMb += size / (1024 * 1024);
        }
      } catch (_) {}
    }
    return totalMb;
  }

  void _saveProfile() async {
    setState(() => _isLoading = true);
    final error = await ref.read(authProvider.notifier).updateProfile(
      name: _nameController.text.trim(),
    );
    if (mounted) {
      setState(() {
        _isLoading = false;
        _isEditing = false;
      });
      if (error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error), backgroundColor: Colors.redAccent),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully!'), backgroundColor: Color(0xFF10B981)),
        );
      }
    }
  }

  void _handleLogout() async {
    await ref.read(authProvider.notifier).logout();
    if (mounted) {
      context.go('/login');
    }
  }

  void _handleDeleteAccount() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF151C33),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Delete Account?', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          content: Text('Are you sure you want to delete your account permanently? This will remove all your recordings from the database.', style: GoogleFonts.outfit(color: const Color(0xFF94A3B8))),
          actions: [
            TextButton(
              onPressed: () => context.pop(),
              child: Text('Cancel', style: GoogleFonts.outfit(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
              onPressed: () async {
                final error = await ref.read(authProvider.notifier).deleteAccount();
                if (!mounted) return;
                context.pop(); // Pop dialog
                if (error != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(error), backgroundColor: Colors.redAccent),
                  );
                } else {
                  context.go('/login');
                }
              },
              child: Text('Delete Account', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider);
    final history = ref.watch(historyProvider);

    final totalCount = history.length;
    final totalSec = history.fold<int>(0, (sum, rec) => sum + rec.durationInSeconds);
    final totalHours = (totalSec / 3600).toStringAsFixed(1);
    final totalWords = history.fold(0, (sum, rec) => sum + rec.wordCount);
    final audioPaths = history.map((e) => e.audioUrl).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF090D1A),
      appBar: AppBar(
        title: Text('Your Profile', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
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
              const SizedBox(height: 10),

              // Avatar Card
              Center(
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(colors: [Color(0xFF6366F1), Color(0xFFEC4899)]),
                        shape: BoxShape.circle,
                      ),
                      child: const CircleAvatar(
                        radius: 54,
                        backgroundColor: Color(0xFF151C33),
                        child: Icon(Icons.person, size: 54, color: Color(0xFF6366F1)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _isEditing
                        ? Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 180,
                                child: TextField(
                                  controller: _nameController,
                                  style: const TextStyle(color: Colors.white, fontSize: 16),
                                  decoration: const InputDecoration(
                                    contentPadding: EdgeInsets.symmetric(vertical: 4),
                                    enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF6366F1))),
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: Icon(_isLoading ? Icons.hourglass_empty : Icons.check, color: const Color(0xFF10B981)),
                                onPressed: _isLoading ? null : _saveProfile,
                              ),
                            ],
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                user?.name ?? 'Patera Lekha User',
                                style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              IconButton(
                                icon: const Icon(Icons.edit_outlined, size: 18, color: Color(0xFF94A3B8)),
                                onPressed: () => setState(() => _isEditing = true),
                              ),
                            ],
                          ),
                    Text(
                      user?.email ?? 'you@example.com',
                      style: GoogleFonts.outfit(fontSize: 13, color: const Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 36),

              Text(
                'Cloud Usage Statistics',
                style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(child: _buildMetricCard('Recordings', '$totalCount', Icons.mic_rounded, const Color(0xFF6366F1))),
                  const SizedBox(width: 16),
                  Expanded(child: _buildMetricCard('Total Hours', totalHours, Icons.timer_outlined, const Color(0xFFEC4899))),
                ],
              ),
              const SizedBox(height: 16),

              FutureBuilder<double>(
                future: _calculateSpaceUsed(audioPaths),
                builder: (context, snapshot) {
                  final space = snapshot.data ?? 0.0;
                  return Row(
                    children: [
                      Expanded(child: _buildMetricCard('Word Counts', '$totalWords', Icons.text_snippet_outlined, const Color(0xFF10B981))),
                      const SizedBox(width: 16),
                      Expanded(child: _buildMetricCard('Local Files Size', '${space.toStringAsFixed(2)} MB', Icons.sd_storage_outlined, const Color(0xFF8B5CF6))),
                    ],
                  );
                },
              ),

              const SizedBox(height: 36),

              // Action List
              _buildSectionHeader('Account Actions'),
              Card(
                color: const Color(0xFF151C33),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.logout_rounded, color: Color(0xFF94A3B8)),
                      title: Text('Log Out', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
                      trailing: const Icon(Icons.keyboard_arrow_right, color: Color(0xFF6366F1)),
                      onTap: _handleLogout,
                    ),
                    const Divider(color: Colors.white10, height: 1),
                    ListTile(
                      leading: const Icon(Icons.delete_forever_rounded, color: Colors.redAccent),
                      title: Text('Delete Account', style: GoogleFonts.outfit(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                      trailing: const Icon(Icons.keyboard_arrow_right, color: Colors.redAccent),
                      onTap: _handleDeleteAccount,
                    ),
                  ],
                ),
              ),

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

  Widget _buildMetricCard(String label, String value, IconData icon, Color accentColor) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF151C33),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.02)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: accentColor, size: 24),
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(color: accentColor, shape: BoxShape.circle),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            value,
            style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
