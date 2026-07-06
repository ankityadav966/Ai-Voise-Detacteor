import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';
import '../models/recording_model.dart';

class DocumentService {
  /// Generate a PDF document from a Recording model
  Future<File> generatePdf(RecordingModel recording) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        build: (pw.Context context) {
          return [
            // Header
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'PATERA LEKHA AI MEETING ASSISTANT',
                  style: pw.TextStyle(
                    fontSize: 10,
                    fontWeight: pw.FontWeight.bold,
                    color: PdfColors.indigo600,
                  ),
                ),
                pw.Text(
                  recording.dateTime.toLocal().toString().substring(0, 16),
                  style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey600),
                ),
              ],
            ),
            pw.Divider(thickness: 1, color: PdfColors.indigo100),
            pw.SizedBox(height: 16),

            // Title
            pw.Text(
              recording.title,
              style: pw.TextStyle(
                fontSize: 22,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.grey900,
              ),
            ),
            pw.SizedBox(height: 8),

            // Metadata Row
            pw.Row(
              children: [
                _pdfMetaTag('Duration: ${_formatDuration(recording.durationInSeconds)}'),
                pw.SizedBox(width: 12),
                _pdfMetaTag('Words: ${recording.wordCount}'),
                pw.SizedBox(width: 12),
                _pdfMetaTag('Folder: ${recording.folder}'),
              ],
            ),
            pw.SizedBox(height: 20),

            // Executive Summary
            if (recording.summary.isNotEmpty) ...[
              pw.Text(
                'EXECUTIVE SUMMARY',
                style: pw.TextStyle(
                  fontSize: 12,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.indigo700,
                ),
              ),
              pw.SizedBox(height: 6),
              pw.Text(
                recording.summary,
                style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey800, lineHeight: 1.4),
              ),
              pw.SizedBox(height: 18),
            ],

            // Key Discussion Points
            if (recording.keyPoints.isNotEmpty) ...[
              pw.Text(
                'KEY DISCUSSION POINTS',
                style: pw.TextStyle(
                  fontSize: 12,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.indigo700,
                ),
              ),
              pw.SizedBox(height: 6),
              ...recording.keyPoints.map((point) => pw.Padding(
                    padding: const pw.EdgeInsets.only(left: 8, bottom: 4),
                    child: pw.Row(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('• ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.indigo500)),
                        pw.Expanded(
                          child: pw.Text(point, style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey800)),
                        ),
                      ],
                    ),
                  )),
              pw.SizedBox(height: 18),
            ],

            // Action Items
            if (recording.actionItems.isNotEmpty) ...[
              pw.Text(
                'ACTION ITEMS',
                style: pw.TextStyle(
                  fontSize: 12,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.indigo700,
                ),
              ),
              pw.SizedBox(height: 6),
              ...recording.actionItems.map((item) => pw.Padding(
                    padding: const pw.EdgeInsets.only(left: 8, bottom: 4),
                    child: pw.Row(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Container(
                          margin: const pw.EdgeInsets.only(top: 2, right: 6),
                          width: 8,
                          height: 8,
                          decoration: pw.BoxDecoration(
                            border: pw.Border.all(color: PdfColors.grey600, width: 1),
                            borderRadius: const pw.ProjectingRingBorder(),
                          ),
                        ),
                        pw.Expanded(
                          child: pw.Text(item, style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey800)),
                        ),
                      ],
                    ),
                  )),
              pw.SizedBox(height: 18),
            ],

            // Diarized Transcript
            if (recording.transcript.isNotEmpty) ...[
              pw.Text(
                'DIARIZED TRANSCRIPT',
                style: pw.TextStyle(
                  fontSize: 12,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.indigo700,
                ),
              ),
              pw.SizedBox(height: 8),
              pw.Text(
                recording.transcript,
                style: const pw.TextStyle(
                  fontSize: 9,
                  color: PdfColors.grey700,
                  lineHeight: 1.5,
                ),
              ),
            ],
          ];
        },
        footer: (pw.Context context) {
          return pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.Text(
              'Page ${context.pageNumber} of ${context.pagesCount}',
              style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey500),
            ),
          );
        },
      ),
    );

    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/${_sanitizeFileName(recording.title)}.pdf');
    await file.writeAsBytes(await pdf.save());
    return file;
  }

  /// Generate a plain TXT file from a Recording model
  Future<File> generateTxt(RecordingModel recording) async {
    final buffer = StringBuffer();
    buffer.writeln('=== ${recording.title.toUpperCase()} ===');
    buffer.writeln('Date: ${recording.dateTime.toLocal()}');
    buffer.writeln('Duration: ${_formatDuration(recording.durationInSeconds)}');
    buffer.writeln('Word Count: ${recording.wordCount}');
    buffer.writeln('Folder: ${recording.folder}');
    buffer.writeln('\n========================================\n');

    if (recording.summary.isNotEmpty) {
      buffer.writeln('EXECUTIVE SUMMARY:');
      buffer.writeln(recording.summary);
      buffer.writeln('\n========================================\n');
    }

    if (recording.keyPoints.isNotEmpty) {
      buffer.writeln('KEY POINTS:');
      for (var point in recording.keyPoints) {
        buffer.writeln('- $point');
      }
      buffer.writeln('\n========================================\n');
    }

    if (recording.actionItems.isNotEmpty) {
      buffer.writeln('ACTION ITEMS:');
      for (var item in recording.actionItems) {
        buffer.writeln('[ ] $item');
      }
      buffer.writeln('\n========================================\n');
    }

    if (recording.transcript.isNotEmpty) {
      buffer.writeln('TRANSCRIPT:');
      buffer.writeln(recording.transcript);
    }

    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/${_sanitizeFileName(recording.title)}.txt');
    await file.writeAsString(buffer.toString());
    return file;
  }

  /// Generate a Microsoft Word compatible HTML/DOCX file
  Future<File> generateDocx(RecordingModel recording) async {
    final buffer = StringBuffer();
    buffer.writeln('<html>');
    buffer.writeln('<head><meta charset="utf-8"><title>${recording.title}</title>');
    buffer.writeln('<style>');
    buffer.writeln('body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }');
    buffer.writeln('h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }');
    buffer.writeln('h2 { color: #2563eb; margin-top: 24px; }');
    buffer.writeln('.meta { color: #6b7280; font-size: 0.9em; margin-bottom: 20px; }');
    buffer.writeln('.transcript { background-color: #f3f4f6; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-size: 0.95em; }');
    buffer.writeln('ul { padding-left: 20px; }');
    buffer.writeln('li { margin-bottom: 6px; }');
    buffer.writeln('</style>');
    buffer.writeln('</head>');
    buffer.writeln('<body>');

    buffer.writeln('<h1>${recording.title}</h1>');
    buffer.writeln('<div class="meta">');
    buffer.writeln('<strong>Date:</strong> ${recording.dateTime.toLocal().toString().substring(0, 16)}<br>');
    buffer.writeln('<strong>Duration:</strong> ${_formatDuration(recording.durationInSeconds)}<br>');
    buffer.writeln('<strong>Words:</strong> ${recording.wordCount}<br>');
    buffer.writeln('<strong>Folder:</strong> ${recording.folder}');
    buffer.writeln('</div>');

    if (recording.summary.isNotEmpty) {
      buffer.writeln('<h2>Executive Summary</h2>');
      buffer.writeln('<p>${recording.summary}</p>');
    }

    if (recording.keyPoints.isNotEmpty) {
      buffer.writeln('<h2>Key Discussion Points</h2>');
      buffer.writeln('<ul>');
      for (var point in recording.keyPoints) {
        buffer.writeln('<li>$point</li>');
      }
      buffer.writeln('</ul>');
    }

    if (recording.actionItems.isNotEmpty) {
      buffer.writeln('<h2>Action Items</h2>');
      buffer.writeln('<ul>');
      for (var item in recording.actionItems) {
        buffer.writeln('<li><input type="checkbox" /> $item</li>');
      }
      buffer.writeln('</ul>');
    }

    if (recording.transcript.isNotEmpty) {
      buffer.writeln('<h2>Diarized Transcript</h2>');
      buffer.writeln('<div class="transcript">${recording.transcript}</div>');
    }

    buffer.writeln('</body>');
    buffer.writeln('</html>');

    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/${_sanitizeFileName(recording.title)}.docx');
    await file.writeAsString(buffer.toString());
    return file;
  }

  /// Share a file natively
  Future<void> shareFile(File file, {String mimeType = 'application/octet-stream'}) async {
    final xFile = XFile(file.path, mimeType: mimeType);
    await Share.shareXFiles([xFile], text: 'Sharing ${file.path.split("/").last} from Patera Lekha.');
  }

  /// Share plain text directly
  Future<void> shareText(String text, {String subject = 'Meeting Info'}) async {
    await Share.share(text, subject: subject);
  }

  // --- UTILS ---

  static String _formatDuration(int seconds) {
    final int h = seconds ~/ 3600;
    final int m = (seconds % 3600) ~/ 60;
    final int s = seconds % 60;
    if (h > 0) {
      return '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    }
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  String _sanitizeFileName(String title) {
    return title.replaceAll(RegExp(r'[<>:"/\\|?*]'), '_').trim();
  }

  pw.Widget _pdfMetaTag(String text) {
    return pw.Container(
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: pw.BoxDecoration(
        color: PdfColors.indigo50,
        borderRadius: pw.BorderRadius.circular(4),
      ),
      child: pw.Text(
        text,
        style: const pw.TextStyle(fontSize: 8, color: PdfColors.indigo700, fontWeight: pw.FontWeight.bold),
      ),
    );
  }
}
