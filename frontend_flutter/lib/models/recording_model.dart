class RecordingModel {
  final String id;
  final String title;
  final String audioUrl;
  final int durationInSeconds;
  final String transcript;
  final String summary;
  final List<String> keyPoints;
  final List<String> actionItems;
  final String folder;
  final bool isFavorite;
  final int wordCount;
  final DateTime dateTime;

  RecordingModel({
    required this.id,
    required this.title,
    required this.audioUrl,
    required this.durationInSeconds,
    this.transcript = '',
    this.summary = '',
    this.keyPoints = const [],
    this.actionItems = const [],
    this.folder = 'General',
    this.isFavorite = false,
    this.wordCount = 0,
    required this.dateTime,
  });

  factory RecordingModel.fromJson(Map<String, dynamic> json) {
    // Parse key points list
    List<String> parsedKeyPoints = [];
    if (json['keyPoints'] != null) {
      if (json['keyPoints'] is List) {
        parsedKeyPoints = List<String>.from(json['keyPoints'] as List);
      }
    }

    // Parse action items list
    List<String> parsedActionItems = [];
    if (json['actionItems'] != null) {
      if (json['actionItems'] is List) {
        parsedActionItems = List<String>.from(json['actionItems'] as List);
      }
    }

    return RecordingModel(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled Recording',
      audioUrl: json['audioUrl'] as String? ?? '',
      durationInSeconds: json['durationInSeconds'] as int? ?? 0,
      transcript: json['transcript'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      keyPoints: parsedKeyPoints,
      actionItems: parsedActionItems,
      folder: json['folder'] as String? ?? 'General',
      isFavorite: json['isFavorite'] as bool? ?? false,
      wordCount: json['wordCount'] as int? ?? 0,
      dateTime: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String) 
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'audioUrl': audioUrl,
      'durationInSeconds': durationInSeconds,
      'transcript': transcript,
      'summary': summary,
      'keyPoints': keyPoints,
      'actionItems': actionItems,
      'folder': folder,
      'isFavorite': isFavorite,
      'wordCount': wordCount,
      'createdAt': dateTime.toIso8601String(),
    };
  }

  RecordingModel copyWith({
    String? id,
    String? title,
    String? audioUrl,
    int? durationInSeconds,
    String? transcript,
    String? summary,
    List<String>? keyPoints,
    List<String>? actionItems,
    String? folder,
    bool? isFavorite,
    int? wordCount,
    DateTime? dateTime,
  }) {
    return RecordingModel(
      id: id ?? this.id,
      title: title ?? this.title,
      audioUrl: audioUrl ?? this.audioUrl,
      durationInSeconds: durationInSeconds ?? this.durationInSeconds,
      transcript: transcript ?? this.transcript,
      summary: summary ?? this.summary,
      keyPoints: keyPoints ?? this.keyPoints,
      actionItems: actionItems ?? this.actionItems,
      folder: folder ?? this.folder,
      isFavorite: isFavorite ?? this.isFavorite,
      wordCount: wordCount ?? this.wordCount,
      dateTime: dateTime ?? this.dateTime,
    );
  }
}
