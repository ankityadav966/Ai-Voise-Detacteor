import 'dart:io';
import 'package:flutter/material';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/recording_model.dart';
import '../../providers/history_provider.dart';
import '../../services/document_service.dart';

class TranscriptScreen extends ConsumerStatefulWidget {
  final RecordingModel recording;

  const TranscriptScreen({super.key, required this.recording});

  @override
  ConsumerState<TranscriptScreen> createState() => _TranscriptScreenState();
}

class _TranscriptScreenState extends ConsumerState<TranscriptScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final DocumentService _documentService = DocumentService();

  bool _isEditing = false;
  late TextEditingController _transcriptEditController;
  late RecordingModel _activeRecording;
  bool _isRegenerating = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _activeRecording = widget.recording;
    _transcriptEditController = TextEditingController(text: _activeRecording.transcript);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _transcriptEditController.dispose();
    super.dispose();
  }

  String _formatDuration(int seconds) {
    final int m = seconds ~/ 60;
    final int s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Copied to clipboard!'),
        backgroundColor: Color(0xFF6366F1),
        duration: Duration(seconds: 1),
      ),
    );
  }

  void _toggleEditMode() async {
    if (_isEditing) {
      // Save changes to backend
      final success = await ref.read(historyProvider.notifier).updateTranscript(
        _activeRecording.id,
        _transcriptEditController.text,
      );
      if (success) {
        setState(() {
          _activeRecording = _activeRecording.copyWith(
            transcript: _transcriptEditController.text,
            wordCount: _transcriptEditController.text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length,
          );
          _isEditing = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transcript updated successfully!'), backgroundColor: Color(0xFF10B981)),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update transcript.'), backgroundColor: Colors.redAccent),
        );
      }
    } else {
      setState(() {
        _isEditing = true;
      });
    }
  }

  void _showExportOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF151C33),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Export Transcript',
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
                ),
                const SizedBox(height: 16),
                _buildExportItem(Icons.picture_as_pdf, 'Export as PDF', () async {
                  context.pop();
                  final file = await _documentService.generatePdf(_activeRecording);
                  await _documentService.shareFile(file, mimeType: 'application/pdf');
                }),
                _buildExportItem(Icons.description, 'Export as Word (DOCX)', () async {
                  context.pop();
                  final file = await _documentService.generateDocx(_activeRecording);
                  await _documentService.shareFile(file, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                }),
                _buildExportItem(Icons.text_fields, 'Export as Plain Text (TXT)', () async {
                  context.pop();
                  final file = await _documentService.generateTxt(_activeRecording);
                  await _documentService.shareFile(file, mimeType: 'text/plain');
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildExportItem(IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFF6366F1)),
      title: Text(label, style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.w500)),
      onTap: onTap,
    );
  }

  void _deleteRecording() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF151C33),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Delete Recording?', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          content: Text('Are you sure you want to delete this recording permanently?', style: GoogleFonts.outfit(color: const Color(0xFF94A3B8))),
          actions: [
            TextButton(
              onPressed: () => context.pop(),
              child: Text('Cancel', style: GoogleFonts.outfit(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
              onPressed: () async {
                final success = await ref.read(historyProvider.notifier).deleteRecording(_activeRecording.id);
                if (!mounted) return;
                context.pop(); // Pop dialog
                if (success) {
                  context.pop(); // Pop screen
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to delete recording.'), backgroundColor: Colors.redAccent),
                  );
                }
              },
              child: Text('Delete', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  void _regenerateAnalysis() async {
    setState(() => _isRegenerating = true);

    final updated = await ref.read(historyProvider.notifier).regenerateAiAnalysis(_activeRecording.id);

    if (mounted) {
      setState(() => _isRegenerating = false);
      if (updated != null) {
        setState(() {
          _activeRecording = updated;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('AI analysis regenerated successfully!'), backgroundColor: Color(0xFF10B981)),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Regeneration failed.'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final characterCount = _activeRecording.transcript.length;
    final dateText = '${_activeRecording.dateTime.day}/${_activeRecording.dateTime.month}/${_activeRecording.dateTime.year}';

    if (_isRegenerating) {
      return Scaffold(
        backgroundColor: const Color(0xFF090D1A),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1))),
              const SizedBox(height: 24),
              Text(
                'Regenerating AI Analysis...',
                style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
              ),
              const SizedBox(height: 8),
              Text(
                'Updating summaries, key points, and action items...',
                style: GoogleFonts.outfit(color: const Color(0xFF94A3B8), fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF090D1A),
      appBar: AppBar(
        title: Text(
          _activeRecording.title,
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: Icon(_isEditing ? Icons.save_rounded : Icons.edit_outlined, color: _isEditing ? const Color(0xFF10B981) : Colors.white),
            tooltip: _isEditing ? 'Save Changes' : 'Edit Transcript',
            onPressed: _toggleEditMode,
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined),
            tooltip: 'Export / Share',
            onPressed: _showExportOptions,
          ),
          PopupMenuButton<String>(
            onSelected: (val) {
              if (val == 'regenerate') {
                _regenerateAnalysis();
              } else if (val == 'delete') {
                _deleteRecording();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'regenerate',
                child: Row(
                  children: [
                    Icon(Icons.refresh, color: Color(0xFF6366F1), size: 20),
                    SizedBox(width: 8),
                    Text('Regenerate AI'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                    SizedBox(width: 8),
                    Text('Delete', style: TextStyle(color: Colors.redAccent)),
                  ],
                ),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF6366F1),
          unselectedLabelColor: const Color(0xFF94A3B8),
          indicatorColor: const Color(0xFF6366F1),
          indicatorWeight: 3,
          labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold),
          unselectedLabelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w500),
          tabs: const [
            Tab(text: 'Summary'),
            Tab(text: 'Key Points'),
            Tab(text: 'Tasks'),
            Tab(text: 'Transcript'),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Metadata banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              color: const Color(0xFF151C33).withOpacity(0.5),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildMetadataTag(Icons.calendar_today_rounded, dateText),
                  _buildMetadataTag(Icons.access_time_rounded, _formatDuration(_activeRecording.durationInSeconds)),
                  _buildMetadataTag(Icons.short_text_rounded, '${_activeRecording.wordCount} words'),
                  _buildMetadataTag(Icons.text_snippet_outlined, '$characterCount chars'),
                ],
              ),
            ),

            // Tab Views
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildSummaryTab(),
                  _buildKeyPointsTab(),
                  _buildActionItemsTab(),
                  _buildTranscriptTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetadataTag(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 13, color: const Color(0xFF6366F1)),
        const SizedBox(width: 6),
        Text(
          text,
          style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildSummaryTab() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Executive Summary',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
              ),
              IconButton(
                icon: const Icon(Icons.copy_rounded, size: 18, color: Color(0xFF94A3B8)),
                onPressed: () => _copyToClipboard(_activeRecording.summary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF151C33),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.03)),
            ),
            child: Text(
              _activeRecording.summary.isNotEmpty
                  ? _activeRecording.summary
                  : 'No summary generated for this recording.',
              style: GoogleFonts.outfit(
                color: Colors.white.withOpacity(0.9),
                fontSize: 15,
                height: 1.6,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKeyPointsTab() {
    final points = _activeRecording.keyPoints;
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Key Discussion Points',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
          ),
          const SizedBox(height: 16),
          points.isEmpty
              ? _buildEmptyState('No key points extracted.')
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: points.length,
                  itemBuilder: (context, index) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF151C33),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.02)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Padding(
                            padding: EdgeInsets.only(top: 3.0, right: 12.0),
                            child: Icon(Icons.lens, size: 8, color: Color(0xFF6366F1)),
                          ),
                          Expanded(
                            child: Text(
                              points[index],
                              style: GoogleFonts.outfit(color: Colors.white.withOpacity(0.85), fontSize: 14, height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }

  Widget _buildActionItemsTab() {
    final tasks = _activeRecording.actionItems;
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Action Tasks & Assignees',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
          ),
          const SizedBox(height: 16),
          tasks.isEmpty
              ? _buildEmptyState('No action items detected.')
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: tasks.length,
                  itemBuilder: (context, index) {
                    final task = tasks[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF151C33),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: CheckboxListTile(
                        value: false,
                        onChanged: (val) {},
                        activeColor: const Color(0xFF6366F1),
                        checkColor: Colors.white,
                        controlAffinity: ListTileControlAffinity.leading,
                        title: Text(
                          task,
                          style: GoogleFonts.outfit(color: Colors.white.withOpacity(0.85), fontSize: 14),
                        ),
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }

  Widget _buildTranscriptTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _isEditing ? 'Editing Transcript...' : 'Formatted Transcript',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15, color: _isEditing ? const Color(0xFF10B981) : Colors.white),
              ),
              if (!_isEditing)
                IconButton(
                  icon: const Icon(Icons.copy_rounded, size: 18, color: Color(0xFF94A3B8)),
                  onPressed: () => _copyToClipboard(_activeRecording.transcript),
                ),
            ],
          ),
        ),
        Expanded(
          child: Container(
            margin: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF151C33),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.03)),
            ),
            child: _isEditing
                ? TextField(
                    controller: _transcriptEditController,
                    maxLines: null,
                    keyboardType: TextInputType.multiline,
                    style: GoogleFonts.outfit(color: Colors.white, fontSize: 14, height: 1.6),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      hintText: 'Enter transcript content...',
                      hintStyle: TextStyle(color: Colors.white24),
                    ),
                  )
                : SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: Text(
                      _activeRecording.transcript.isNotEmpty
                          ? _activeRecording.transcript
                          : 'No transcript recorded.',
                      style: GoogleFonts.outfit(
                        color: Colors.white.withOpacity(0.85),
                        fontSize: 14,
                        height: 1.6,
                      ),
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(String msg) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: const Color(0xFF151C33),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Center(
        child: Text(
          msg,
          style: GoogleFonts.outfit(color: const Color(0xFF94A3B8), fontSize: 14),
        ),
      ),
    );
  }
}
