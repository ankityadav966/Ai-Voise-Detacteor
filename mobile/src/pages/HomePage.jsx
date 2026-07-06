import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import { fetchRecordings, setSearchQuery, setFavoriteFilter, setFolderFilter } from '../redux/historySlice';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const HomePage = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const recordings = useSelector((state) => state.history.recordings);

  useEffect(() => {
    dispatch(fetchRecordings());
  }, [dispatch]);

  const handleSearchChange = (text) => {
    dispatch(setSearchQuery(text));
    if (text.trim()) {
      navigation.navigate('History');
    }
  };

  const handleQuickAction = (action) => {
    if (action === 'Record') {
      navigation.navigate('Recording');
    } else if (action === 'History') {
      dispatch(setFavoriteFilter(false));
      dispatch(setFolderFilter('All'));
      navigation.navigate('History');
    } else if (action === 'Favorites') {
      dispatch(setFavoriteFilter(true));
      navigation.navigate('History');
    } else if (action === 'Meetings') {
      dispatch(setFavoriteFilter(false));
      dispatch(setFolderFilter('Meetings'));
      navigation.navigate('History');
    }
  };

  const totalRecordings = recordings.length;
  const totalDurationSeconds = recordings.reduce((sum, rec) => sum + (rec.durationInSeconds || 0), 0);
  const totalMinutes = (totalDurationSeconds / 60).toFixed(1);

  const totalActionItems = recordings.reduce((sum, rec) => sum + (rec.actionItems?.length || 0), 0);
  const totalDecisions = recordings.reduce((sum, rec) => sum + (rec.keyDecisions?.length || 0), 0);
  
  const confidences = recordings.map(rec => rec.meetingStats?.aiConfidence).filter(c => c !== undefined && c !== null);
  const averageConfidence = confidences.length > 0 
    ? Math.round((confidences.reduce((sum, val) => sum + val, 0) / confidences.length) * 100) 
    : 95;
    
  const sentiments = recordings.map(rec => rec.sentiment).filter(Boolean);
  const positiveCount = sentiments.filter(s => s === 'Positive' || s === 'Excited').length;
  const concernedCount = sentiments.filter(s => s === 'Concerned' || s === 'Negative').length;
  const neutralCount = sentiments.filter(s => s === 'Neutral').length;

  const formatDuration = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.logoRow}>
          <MaterialIcons name="blur-on" size={28} color="#6366F1" />
          <Text style={styles.logoText}>PATERA LEKHA</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.headerBtn}>
            <MaterialIcons name="person" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerBtn}>
            <MaterialIcons name="settings" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome card banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerGreeting}>Hello, {user?.name || 'User'}</Text>
          <Text style={styles.bannerDesc}>
            Record business conferences, hinges, and lectures. Instantly transcribe, diarize, and summarize in cloud.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{totalRecordings}</Text>
              <Text style={styles.statLabel}>Recordings</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{totalMinutes} m</Text>
              <Text style={styles.statLabel}>Total Minutes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{user ? 'Connected' : 'Offline'}</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Aggregated AI Insights Grid */}
        {recordings.length > 0 && (
          <View style={styles.aiDashboard}>
            <View style={styles.aiDashboardHeader}>
              <Text style={styles.aiDashboardTitle}>AI Dashboard Analytics</Text>
              <Text style={styles.aiDashboardSubtitle}>Aggregated business insights across all recorded meetings</Text>
            </View>

            <View style={styles.aiDashboardGrid}>
              <View style={styles.aiDashboardBox}>
                <Text style={styles.aiDashboardBoxLabel}>Decision Logging</Text>
                <Text style={styles.aiDashboardBoxVal}>{totalDecisions}</Text>
                <Text style={[styles.aiDashboardBoxSubtext, { color: '#10B981' }]}>Key choices recorded</Text>
              </View>

              <View style={styles.aiDashboardBox}>
                <Text style={styles.aiDashboardBoxLabel}>Action Items</Text>
                <Text style={styles.aiDashboardBoxVal}>{totalActionItems}</Text>
                <Text style={[styles.aiDashboardBoxSubtext, { color: '#6366F1' }]}>Tasks generated by AI</Text>
              </View>

              <View style={styles.aiDashboardBox}>
                <Text style={styles.aiDashboardBoxLabel}>Average AI Accuracy</Text>
                <Text style={[styles.aiDashboardBoxVal, { color: '#10B981' }]}>{averageConfidence}%</Text>
                <Text style={styles.aiDashboardBoxSubtext}>Diarization confidence</Text>
              </View>

              <View style={styles.aiDashboardBox}>
                <Text style={styles.aiDashboardBoxLabel}>Sentiment Tone</Text>
                <View style={styles.sentimentRow}>
                  <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 12 }}>😊 {positiveCount}</Text>
                  <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 12 }}>😐 {neutralCount}</Text>
                  <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>😟 {concernedCount}</Text>
                </View>
                <Text style={styles.aiDashboardBoxSubtext}>Overall meeting mood</Text>
              </View>
            </View>
          </View>
        )}

        {/* Search bar */}
        <View style={styles.searchBar}>
          <TextInput
            placeholder="Search transcripts, titles, or tags..."
            placeholderTextColor="#64748B"
            style={styles.searchInput}
            onChangeText={handleSearchChange}
          />
        </View>

        {/* Quick actions row */}
        <View style={styles.quickGrid}>
          <QuickButton icon="mic" label="Record" onClick={() => handleQuickAction('Record')} />
          <QuickButton icon="history" label="History" onClick={() => handleQuickAction('History')} />
          <QuickButton icon="star" label="Favorites" onClick={() => handleQuickAction('Favorites')} />
          <QuickButton icon="folder" label="Meetings" onClick={() => handleQuickAction('Meetings')} />
        </View>

        {/* Recent recordings */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Recordings</Text>
          <TouchableOpacity onPress={() => handleQuickAction('History')}>
            <Text style={styles.viewAllBtn}>View All</Text>
          </TouchableOpacity>
        </View>

        {recordings.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="mic-off" size={48} color="rgba(255, 255, 255, 0.05)" />
            <Text style={styles.emptyText}>No recent recordings.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {recordings.slice(0, 5).map((rec) => (
              <TouchableOpacity
                key={rec.id}
                onPress={() => navigation.navigate('Transcript', { recording: rec })}
                style={styles.card}
              >
                <View style={styles.cardIconBox}>
                  <MaterialIcons name="description" size={22} color="#8B5CF6" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{rec.title}</Text>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText}>{formatDate(rec.createdAt || rec.dateTime)}</Text>
                    <View style={styles.cardMetaDot} />
                    <Text style={styles.cardMetaText}>{formatDuration(rec.durationInSeconds)}</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity onPress={() => navigation.navigate('Recording')} style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <MaterialIcons name="mic" size={22} color="#FFF" style={{ marginRight: 6 }} />
        <Text style={styles.fabText}>Start Recording</Text>
      </TouchableOpacity>
    </View>
  );
};

const QuickButton = ({ icon, label, onClick }) => (
  <TouchableOpacity onPress={onClick} style={styles.quickBtn}>
    <View style={styles.quickCircle}>
      <MaterialIcons name={icon} size={24} color="#6366F1" />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: '#090D1A',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  banner: {
    backgroundColor: '#151C33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 24,
    marginBottom: 24,
  },
  bannerGreeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  bannerDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 16,
  },
  statBox: {
    flexDirection: 'column',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  aiDashboard: {
    backgroundColor: '#151C33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
  },
  aiDashboardHeader: {
    marginBottom: 16,
  },
  aiDashboardTitle: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiDashboardSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  aiDashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  aiDashboardBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    width: (width - 48 - 40 - 16) / 2, // Approximate half width minus paddings and gaps
    marginBottom: 16,
  },
  aiDashboardBoxLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  aiDashboardBoxVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  aiDashboardBoxSubtext: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  sentimentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  searchBar: {
    backgroundColor: '#151C33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  searchInput: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  quickBtn: {
    alignItems: 'center',
  },
  quickCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#151C33',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  viewAllBtn: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151C33',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
    marginBottom: 12,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#090D1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  cardMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default HomePage;
