import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient';

// Helper: safe JSON conversion
const parseJsonArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return [];
  }
};

/**
 * Fetch all user recordings
 */
export const fetchRecordings = createAsyncThunk(
  'history/fetchRecordings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/api/recordings');
      if (response.data && response.data.success === true) {
        return response.data.recordings.map((rec) => ({
          ...rec,
          keyPoints: parseJsonArray(rec.keyPoints),
          actionItems: parseJsonArray(rec.actionItems),
        }));
      }
      return rejectWithValue(response.data?.message || 'Failed to fetch recordings');
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

/**
 * Toggle Favorite status
 */
export const toggleFavorite = createAsyncThunk(
  'history/toggleFavorite',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/api/recordings/${id}/favorite`);
      if (response.data && response.data.success === true) {
        return { id, isFavorite: response.data.isFavorite };
      }
      return rejectWithValue('Failed to toggle favorite');
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

/**
 * Delete Recording
 */
export const deleteRecording = createAsyncThunk(
  'history/deleteRecording',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/api/recordings/${id}`);
      if (response.data && response.data.success === true) {
        return id;
      }
      return rejectWithValue('Failed to delete recording');
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

/**
 * Rename Recording
 */
export const renameRecording = createAsyncThunk(
  'history/renameRecording',
  async ({ id, title }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/api/recordings/${id}/rename`, { title });
      if (response.data && response.data.success === true) {
        return { id, title };
      }
      return rejectWithValue('Failed to rename recording');
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

/**
 * Update Folder
 */
export const updateFolder = createAsyncThunk(
  'history/updateFolder',
  async ({ id, folder }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/api/recordings/${id}/folder`, { folder });
      if (response.data && response.data.success === true) {
        return { id, folder };
      }
      return rejectWithValue('Failed to move recording folder');
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

/**
 * Update Transcript manual edits
 */
export const updateTranscript = createAsyncThunk(
  'history/updateTranscript',
  async ({ id, transcript }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/api/recordings/${id}/transcript`, { transcript });
      if (response.data && response.data.success === true) {
        const rec = response.data.recording;
        return {
          ...rec,
          keyPoints: parseJsonArray(rec.keyPoints),
          actionItems: parseJsonArray(rec.actionItems),
        };
      }
      return rejectWithValue('Failed to save transcript');
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

/**
 * Regenerate AI Analysis
 */
export const regenerateAiAnalysis = createAsyncThunk(
  'history/regenerateAiAnalysis',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/api/recordings/${id}/regenerate`);
      if (response.data && response.data.success === true) {
        const rec = response.data.recording;
        return {
          ...rec,
          keyPoints: parseJsonArray(rec.keyPoints),
          actionItems: parseJsonArray(rec.actionItems),
        };
      }
      return rejectWithValue('Failed to regenerate analysis');
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

const historySlice = createSlice({
  name: 'history',
  initialState: {
    recordings: [],
    loading: false,
    error: null,
    searchQuery: '',
    folderFilter: 'All',
    favoriteFilter: false,
  },
  reducers: {
    setSearchQuery(state, action) {
      state.searchQuery = action.payload;
    },
    setFolderFilter(state, action) {
      state.folderFilter = action.payload;
    },
    setFavoriteFilter(state, action) {
      state.favoriteFilter = action.payload;
    },
    addRecording(state, action) {
      const rec = action.payload;
      state.recordings.unshift({
        ...rec,
        keyPoints: parseJsonArray(rec.keyPoints),
        actionItems: parseJsonArray(rec.actionItems),
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecordings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecordings.fulfilled, (state, action) => {
        state.loading = false;
        state.recordings = action.payload;
      })
      .addCase(fetchRecordings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const item = state.recordings.find((r) => r.id === action.payload.id);
        if (item) {
          item.isFavorite = action.payload.isFavorite;
        }
      })
      .addCase(deleteRecording.fulfilled, (state, action) => {
        state.recordings = state.recordings.filter((r) => r.id !== action.payload);
      })
      .addCase(renameRecording.fulfilled, (state, action) => {
        const item = state.recordings.find((r) => r.id === action.payload.id);
        if (item) {
          item.title = action.payload.title;
        }
      })
      .addCase(updateFolder.fulfilled, (state, action) => {
        const item = state.recordings.find((r) => r.id === action.payload.id);
        if (item) {
          item.folder = action.payload.folder;
        }
      })
      .addCase(updateTranscript.fulfilled, (state, action) => {
        const idx = state.recordings.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) {
          state.recordings[idx] = action.payload;
        }
      })
      .addCase(regenerateAiAnalysis.fulfilled, (state, action) => {
        const idx = state.recordings.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) {
          state.recordings[idx] = action.payload;
        }
      });
  },
});

export const {
  setSearchQuery,
  setFolderFilter,
  setFavoriteFilter,
  addRecording,
} = historySlice.actions;

const selectRecordings = (state) => state.history.recordings;
const selectSearchQuery = (state) => state.history.searchQuery;
const selectFolderFilter = (state) => state.history.folderFilter;
const selectFavoriteFilter = (state) => state.history.favoriteFilter;

export const selectFilteredHistory = createSelector(
  [selectRecordings, selectSearchQuery, selectFolderFilter, selectFavoriteFilter],
  (recordings, searchQuery, folderFilter, favoriteFilter) => {
    let list = [...recordings];
    if (favoriteFilter) {
      list = list.filter((r) => r.isFavorite === true);
    }
    if (folderFilter !== 'All') {
      list = list.filter((r) => r.folder === folderFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.transcript && r.transcript.toLowerCase().includes(q)) ||
          (r.summary && r.summary.toLowerCase().includes(q))
      );
    }
    return list;
  }
);

export const selectFoldersList = createSelector(
  [selectRecordings],
  (recordings) => {
    const list = recordings.map((r) => r.folder || 'General');
    const unique = [...new Set(list)].filter((f) => f !== 'General');
    return ['General', ...unique];
  }
);

export const selectHistoryState = (state) => state.history;

export default historySlice.reducer;
