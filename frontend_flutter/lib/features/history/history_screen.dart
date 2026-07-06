import 'package:flutter/material';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/recording_model.dart';
import '../../providers/history_provider.dart';
import '../../providers/player_provider.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _searchController.text = ref.read(searchFilterQueryProvider);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  void _renameRecording(RecordingModel rec) {
    final controller = TextEditingController(text: rec.title);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF151C33),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Rename Recording', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          content: TextField(
            controller: controller,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(
              labelText: 'Title',
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
                if (controller.text.trim().isNotEmpty) {
                  ref.read(historyProvider.notifier).renameRecording(rec.id, controller.text.trim());
                  context.pop();
                }
              },
              child: Text('Save', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  void _changeFolder(RecordingModel rec, List<String> folders) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF151C33),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Move to Folder', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: folders.length,
              itemBuilder: (context, index) {
                final folder = folders[index];
                return ListTile(
                  title: Text(folder, style: const TextStyle(color: Colors.white)),
                  trailing: rec.folder == folder ? const Icon(Icons.check, color: Color(0xFF6366F1)) : null,
                  onTap: () {
                    ref.read(historyProvider.notifier).updateFolder(rec.id, folder);
                    context.pop();
                  },
                );
              },
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredRecs = ref.watch(filteredHistoryProvider);
    final folders = ref.watch(foldersListProvider);
    final activeFolder = ref.watch(folderFilterProvider);
    final activeFavorite = ref.watch(favoriteFilterProvider);
    final playerState = ref.watch(playerProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF090D1A),
      appBar: AppBar(
        title: Text(
          activeFavorite ? 'Favorite Recordings' : 'Recordings History',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF151C33),
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    ref.read(searchFilterQueryProvider.notifier).state = val;
                  },
                  style: GoogleFonts.outfit(color: Colors.white),
                  decoration: InputDecoration(
                    icon: const Icon(Icons.search, color: Color(0xFF94A3B8)),
                    hintText: 'Search title, tags, or words...',
                    hintStyle: GoogleFonts.outfit(color: Colors.white24),
                    border: InputBorder.none,
                  ),
                ),
              ),
            ),

            // Horizontal Folder Filter Chips
            if (!activeFavorite)
              SizedBox(
                height: 48,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: folders.length + 1,
                  itemBuilder: (context, index) {
                    final String folderName = index == 0 ? 'All' : folders[index - 1];
                    final isSelected = activeFolder == folderName;
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6.0),
                      child: ChoiceChip(
                        label: Text(folderName),
                        selected: isSelected,
                        selectedColor: const Color(0xFF6366F1),
                        backgroundColor: const Color(0xFF151C33),
                        labelStyle: GoogleFonts.outfit(
                          color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                          fontWeight: FontWeight.bold,
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        onSelected: (selected) {
                          if (selected) {
                            ref.read(folderFilterProvider.notifier).state = folderName;
                          }
                        },
                      ),
                    );
                  },
                ),
              ),

            const SizedBox(height: 10),

            // Main List
            Expanded(
              child: filteredRecs.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.library_books_outlined, size: 64, color: Colors.white.withOpacity(0.04)),
                          const SizedBox(height: 16),
                          Text(
                            'No recordings found matching criteria.',
                            style: GoogleFonts.outfit(color: const Color(0xFF94A3B8), fontSize: 15),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: filteredRecs.length,
                      itemBuilder: (context, index) {
                        final rec = filteredRecs[index];
                        final isCurrentlyPlaying = playerState.audioPath == rec.audioUrl;
                        return _buildRecordingListItem(rec, isCurrentlyPlaying, folders);
                      },
                    ),
            ),

            // Persistent Audio Player panel
            if (playerState.audioPath != null) _buildBottomPlayerPanel(playerState),
          ],
        ),
      ),
    );
  }

  Widget _buildRecordingListItem(RecordingModel rec, bool isPlaying, List<String> folders) {
    final durationText = _formatDuration(Duration(seconds: rec.durationInSeconds));
    final dateText = '${rec.dateTime.day}/${rec.dateTime.month}/${rec.dateTime.year}';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
        leading: InkWell(
          onTap: () {
            if (isPlaying) {
              final activeState = ref.read(playerProvider);
              if (activeState.isPlaying) {
                ref.read(playerProvider.notifier).pause();
              } else {
                ref.read(playerProvider.notifier).resume();
              }
            } else {
              ref.read(playerProvider.notifier).play(rec.audioUrl);
            }
          },
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isPlaying ? const Color(0xFF6366F1).withOpacity(0.1) : const Color(0xFF090D1A),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isPlaying && ref.watch(playerProvider).isPlaying
                  ? Icons.pause_rounded
                  : Icons.play_arrow_rounded,
              color: const Color(0xFF6366F1),
            ),
          ),
        ),
        title: Text(
          rec.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15),
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
              if (rec.folder.isNotEmpty && rec.folder != 'General') ...[
                const SizedBox(width: 8),
                Text('•', style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF6366F1))),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFF6366F1).withOpacity(0.15), borderRadius: BorderRadius.circular(4)),
                  child: Text(rec.folder, style: GoogleFonts.outfit(fontSize: 10, color: const Color(0xFF8B5CF6), fontWeight: FontWeight.bold)),
                ),
              ],
            ],
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: Icon(
                rec.isFavorite ? Icons.star_rounded : Icons.star_outline_rounded,
                color: rec.isFavorite ? Colors.amber : const Color(0xFF94A3B8),
                size: 20,
              ),
              onPressed: () {
                ref.read(historyProvider.notifier).toggleFavorite(rec.id);
              },
            ),
            PopupMenuButton<String>(
              onSelected: (val) {
                if (val == 'view') {
                  context.push('/transcript', extra: rec);
                } else if (val == 'rename') {
                  _renameRecording(rec);
                } else if (val == 'move') {
                  _changeFolder(rec, folders);
                } else if (val == 'delete') {
                  ref.read(historyProvider.notifier).deleteRecording(rec.id);
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'view', child: Text('Open Transcript')),
                const PopupMenuItem(value: 'rename', child: Text('Rename')),
                const PopupMenuItem(value: 'move', child: Text('Move Folder')),
                const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.redAccent))),
              ],
            ),
          ],
        ),
        onTap: () {
          context.push('/transcript', extra: rec);
        },
      ),
    );
  }

  Widget _buildBottomPlayerPanel(PlayerStateData state) {
    final recordings = ref.read(historyProvider);
    final activeRecording = recordings.firstWhere((r) => r.audioUrl == state.audioPath, orElse: () => RecordingModel(id: '', title: 'Unknown', audioUrl: '', durationInSeconds: 0, dateTime: DateTime.now()));

    if (activeRecording.id.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      decoration: BoxDecoration(
        color: const Color(0xFF151C33),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 12),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  activeRecording.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8), size: 20),
                onPressed: () {
                  ref.read(playerProvider.notifier).stop();
                },
              ),
            ],
          ),

          Row(
            children: [
              Text(_formatDuration(state.position), style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF94A3B8))),
              Expanded(
                child: Slider(
                  activeColor: const Color(0xFF6366F1),
                  inactiveColor: Colors.white10,
                  min: 0.0,
                  max: state.duration.inMilliseconds.toDouble(),
                  value: state.position.inMilliseconds.toDouble().clamp(0.0, state.duration.inMilliseconds.toDouble()),
                  onChanged: (val) {
                    ref.read(playerProvider.notifier).seek(Duration(milliseconds: val.toInt()));
                  },
                ),
              ),
              Text(_formatDuration(state.duration), style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF94A3B8))),
            ],
          ),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              TextButton(
                onPressed: () {
                  double nextSpeed = 1.0;
                  if (state.speed == 1.0) nextSpeed = 1.5;
                  else if (state.speed == 1.5) nextSpeed = 2.0;
                  else if (state.speed == 2.0) nextSpeed = 0.5;
                  ref.read(playerProvider.notifier).setSpeed(nextSpeed);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(border: Border.all(color: const Color(0xFF6366F1)), borderRadius: BorderRadius.circular(4)),
                  child: Text('${state.speed}x', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 12, color: const Color(0xFF6366F1))),
                ),
              ),

              IconButton(
                icon: const Icon(Icons.replay_10_rounded, color: Colors.white, size: 28),
                onPressed: () {
                  final newPos = state.position - const Duration(seconds: 10);
                  ref.read(playerProvider.notifier).seek(newPos < Duration.zero ? Duration.zero : newPos);
                },
              ),

              FloatingActionButton(
                mini: true,
                onPressed: () {
                  if (state.isPlaying) {
                    ref.read(playerProvider.notifier).pause();
                  } else {
                    ref.read(playerProvider.notifier).resume();
                  }
                },
                backgroundColor: const Color(0xFF6366F1),
                child: Icon(state.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded, color: Colors.white),
              ),

              IconButton(
                icon: const Icon(Icons.forward_10_rounded, color: Colors.white, size: 28),
                onPressed: () {
                  final newPos = state.position + const Duration(seconds: 10);
                  ref.read(playerProvider.notifier).seek(newPos > state.duration ? state.duration : newPos);
                },
              ),

              const SizedBox(width: 48),
            ],
          ),
        ],
      ),
    );
  }
}
