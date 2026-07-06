import 'package:flutter/material';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/theme/app_theme.dart';
import '../../models/recording_model.dart';
import '../../providers/history_provider.dart';
import '../../providers/auth_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final recordings = ref.watch(historyProvider);
    final user = ref.watch(authProvider);

    // Stats
    final totalRecordings = recordings.length;
    final totalDurationSeconds = recordings.fold<int>(0, (sum, rec) => sum + rec.durationInSeconds);
    final totalMinutes = (totalDurationSeconds / 60).toStringAsFixed(1);

    return Scaffold(
      backgroundColor: const Color(0xFF090D1A),
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.blur_on_rounded, color: Color(0xFF6366F1), size: 28),
            const SizedBox(width: 8),
            Text(
              'PATERA LEKHA',
              style: GoogleFonts.outfit(
                fontWeight: FontWeight.w900,
                fontSize: 20,
                letterSpacing: 1.5,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline_rounded),
            onPressed: () => context.push('/profile'),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),

              // Welcome banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppTheme.premiumGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF6366F1).withOpacity(0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hello, ${user?.name ?? "User"}',
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Record business conferences, hinges, and lectures. Instantly transcribe, diarize, and summarize in cloud.',
                      style: GoogleFonts.outfit(
                        color: Colors.white.withOpacity(0.85),
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildStatBox('$totalRecordings', 'Recordings'),
                        _buildStatBox('$totalMinutes m', 'Total Minutes'),
                        _buildStatBox(user != null ? 'Connected' : 'Offline', 'Status'),
                      ],
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 500.ms).scale(begin: const Offset(0.96, 0.96), duration: 500.ms),

              const SizedBox(height: 24),

              // Search bar
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF151C33),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white.withOpacity(0.04)),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    ref.read(searchFilterQueryProvider.notifier).state = val;
                  },
                  style: GoogleFonts.outfit(color: Colors.white),
                  decoration: InputDecoration(
                    icon: const Icon(Icons.search, color: Color(0xFF6366F1)),
                    hintText: 'Search transcripts, titles, or tags...',
                    hintStyle: GoogleFonts.outfit(color: const Color(0xFF94A3B8)),
                    border: InputBorder.none,
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Quick Actions
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildQuickAction(
                    context, 
                    Icons.mic_none_rounded, 
                    'Record', 
                    () => context.push('/recorder')
                  ),
                  _buildQuickAction(
                    context, 
                    Icons.history_toggle_off_rounded, 
                    'History', 
                    () {
                      ref.read(favoriteFilterProvider.notifier).state = false;
                      ref.read(folderFilterProvider.notifier).state = 'All';
                      context.push('/history');
                    }
                  ),
                  _buildQuickAction(
                    context, 
                    Icons.star_outline_rounded, 
                    'Favorites', 
                    () {
                      ref.read(favoriteFilterProvider.notifier).state = true;
                      context.push('/history');
                    }
                  ),
                  _buildQuickAction(
                    context, 
                    Icons.folder_open_rounded, 
                    'Meetings', 
                    () {
                      ref.read(favoriteFilterProvider.notifier).state = false;
                      ref.read(folderFilterProvider.notifier).state = 'Meetings';
                      context.push('/history');
                    }
                  ),
                ],
              ),

              const SizedBox(height: 28),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recent Recordings',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      ref.read(favoriteFilterProvider.notifier).state = false;
                      ref.read(folderFilterProvider.notifier).state = 'All';
                      context.push('/history');
                    },
                    child: Text(
                      'View All',
                      style: GoogleFonts.outfit(color: const Color(0xFF6366F1), fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              recordings.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40.0),
                        child: Column(
                          children: [
                            Icon(Icons.mic_external_off_rounded, size: 64, color: Colors.white.withOpacity(0.04)),
                            const SizedBox(height: 12),
                            Text(
                              'No recent recordings.',
                              style: GoogleFonts.outfit(color: const Color(0xFF94A3B8), fontSize: 14),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: recordings.length > 5 ? 5 : recordings.length,
                      itemBuilder: (context, index) {
                        final rec = recordings[index];
                        return _buildRecentCard(context, rec);
                      },
                    ),
              
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/recorder'),
        backgroundColor: const Color(0xFF6366F1),
        icon: const Icon(Icons.mic, color: Colors.white),
        label: Text(
          'Start Recording',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ).animate(onPlay: (c) => c.repeat(reverse: true)).shimmer(duration: 2.seconds, color: Colors.white.withOpacity(0.1)),
    );
  }

  Widget _buildStatBox(String val, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          val,
          style: GoogleFonts.outfit(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.outfit(
            color: Colors.white.withOpacity(0.7),
            fontSize: 10,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickAction(BuildContext context, IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF151C33),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white.withOpacity(0.03)),
            ),
            child: Icon(icon, color: const Color(0xFF6366F1), size: 24),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: GoogleFonts.outfit(
              color: const Color(0xFF94A3B8),
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentCard(BuildContext context, RecordingModel recording) {
    final String durationText = _formatDuration(recording.durationInSeconds);
    final String dateText = '${recording.dateTime.day}/${recording.dateTime.month}/${recording.dateTime.year}';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFF090D1A),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.article_outlined, color: Color(0xFF8B5CF6)),
        ),
        title: Text(
          recording.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.bold,
            fontSize: 15,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4.0),
          child: Row(
            children: [
              Text(dateText, style: GoogleFonts.outfit(fontSize: 12)),
              const SizedBox(width: 8),
              Text('•', style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF6366F1))),
              const SizedBox(width: 8),
              Text(durationText, style: GoogleFonts.outfit(fontSize: 12)),
            ],
          ),
        ),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xFF94A3B8)),
        onTap: () {
          context.push('/transcript', extra: recording);
        },
      ),
    );
  }

  String _formatDuration(int totalSeconds) {
    final int minutes = totalSeconds ~/ 60;
    final int seconds = totalSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }
}
