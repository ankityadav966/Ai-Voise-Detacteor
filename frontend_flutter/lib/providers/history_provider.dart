import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/recording_model.dart';
import 'auth_provider.dart';

class HistoryNotifier extends StateNotifier<List<RecordingModel>> {
  final Ref _ref;

  HistoryNotifier(this._ref) : super([]) {
    // Auto fetch when logged in
    _ref.listen(authProvider, (previous, next) {
      if (next != null) {
        fetchRecordings();
      } else {
        state = [];
      }
    });
    
    // Initial fetch if already logged in on startup
    final isLoggedIn = _ref.read(authProvider) != null;
    if (isLoggedIn) {
      fetchRecordings();
    }
  }

  /// Query recordings list from Express API
  Future<void> fetchRecordings({String? search, String? folder, bool? favorite}) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.get('/api/recordings', queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (folder != null && folder != 'All') 'folder': folder,
        if (favorite != null && favorite == true) 'favorite': 'true',
      });

      if (response.data['success'] == true) {
        final list = (response.data['recordings'] as List)
            .map((e) => RecordingModel.fromJson(e as Map<String, dynamic>))
            .toList();
        state = list;
      }
    } catch (e) {
      // Offline fallback: keep current in-memory state or log
      print('[HistoryProvider] Error fetching: $e');
    }
  }

  /// Add new processed item to top of list
  void addRecording(RecordingModel recording) {
    state = [recording, ...state];
  }

  /// Delete recording
  Future<bool> deleteRecording(String id) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.delete('/api/recordings/$id');
      if (response.data['success'] == true) {
        state = state.where((item) => item.id != id).toList();
        return true;
      }
    } catch (_) {}
    return false;
  }

  /// Rename recording
  Future<bool> renameRecording(String id, String newTitle) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.put('/api/recordings/$id', data: {'title': newTitle});
      if (response.data['success'] == true) {
        final updated = RecordingModel.fromJson(response.data['recording']);
        state = state.map((item) => item.id == id ? updated : item).toList();
        return true;
      }
    } catch (_) {}
    return false;
  }

  /// Toggle favorite
  Future<bool> toggleFavorite(String id) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.put('/api/recordings/$id/favorite');
      if (response.data['success'] == true) {
        final updated = RecordingModel.fromJson(response.data['recording']);
        state = state.map((item) => item.id == id ? updated : item).toList();
        return true;
      }
    } catch (_) {}
    return false;
  }

  /// Move folder tag
  Future<bool> updateFolder(String id, String newFolder) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.put('/api/recordings/$id', data: {'folder': newFolder});
      if (response.data['success'] == true) {
        final updated = RecordingModel.fromJson(response.data['recording']);
        state = state.map((item) => item.id == id ? updated : item).toList();
        return true;
      }
    } catch (_) {}
    return false;
  }

  /// Edit manual transcript corrections
  Future<bool> updateTranscript(String id, String newTranscript) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.put('/api/recordings/$id', data: {'transcript': newTranscript});
      if (response.data['success'] == true) {
        final updated = RecordingModel.fromJson(response.data['recording']);
        state = state.map((item) => item.id == id ? updated : item).toList();
        return true;
      }
    } catch (_) {}
    return false;
  }

  /// Regenerate AI Summary
  Future<RecordingModel?> regenerateAiAnalysis(String id) async {
    final client = _ref.read(apiClientProvider).dio;
    try {
      final response = await client.post('/api/recordings/$id/regenerate');
      if (response.data['success'] == true) {
        final updated = RecordingModel.fromJson(response.data['recording']);
        state = state.map((item) => item.id == id ? updated : item).toList();
        return updated;
      }
    } catch (_) {}
    return null;
  }
}

final historyProvider = StateNotifierProvider<HistoryNotifier, List<RecordingModel>>((ref) {
  return HistoryNotifier(ref);
});

// Helper filters
final searchFilterQueryProvider = StateProvider<String>((ref) => '');
final favoriteFilterProvider = StateProvider<bool>((ref) => false);
final folderFilterProvider = StateProvider<String>((ref) => 'All');

final filteredHistoryProvider = Provider<List<RecordingModel>>((ref) {
  final history = ref.watch(historyProvider);
  final searchQuery = ref.watch(searchFilterQueryProvider).toLowerCase();
  final showOnlyFavorites = ref.watch(favoriteFilterProvider);
  final selectedFolder = ref.watch(folderFilterProvider);

  return history.where((recording) {
    if (showOnlyFavorites && !recording.isFavorite) {
      return false;
    }
    if (selectedFolder != 'All' && recording.folder != selectedFolder) {
      return false;
    }
    if (searchQuery.isNotEmpty) {
      final matchesTitle = recording.title.toLowerCase().contains(searchQuery);
      final matchesTranscript = recording.transcript.toLowerCase().contains(searchQuery);
      final matchesSummary = recording.summary.toLowerCase().contains(searchQuery);
      return matchesTitle || matchesTranscript || matchesSummary;
    }
    return true;
  }).toList();
});

final foldersListProvider = Provider<List<String>>((ref) {
  final history = ref.watch(historyProvider);
  final Set<String> folders = {'General', 'Meetings', 'Notes', 'Personal'};
  for (var rec in history) {
    if (rec.folder.isNotEmpty) {
      folders.add(rec.folder);
    }
  }
  return folders.toList();
});
