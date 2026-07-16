import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';

import {
  deleteRecording,
  updateTranscript,
  regenerateAiAnalysis,
} from '../redux/historySlice';
import documentService from '../services/documentService';
import apiClient from '../services/apiClient';
import { DatabaseHelper } from '../services/storage';
import { usePlayer } from '../context/PlayerContext';

const TranscriptScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { id, recording: initialRecording } = route.params || {};
  const { play, currentRecording, isPlaying, pause, resume } = usePlayer();

  const [activeRecording, setActiveRecording] = useState(() => {
    return initialRecording || null;
  });

  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'keyPoints' | 'decisions' | 'tasks' | 'qna' | 'transcript'
  const [isEditing, setIsEditing] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(!activeRecording);
  const [error, setError] = useState(null);

  // Modals
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);

  // Checked tasks local map
  const [checkedTasks, setCheckedTasks] = useState({});

  useEffect(() => {
    const fetchRecording = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/api/recordings/${id}`);
        if (response.data && response.data.success) {
          const rec = response.data.recording;
          const parsedRec = {
            ...rec,
            keyPoints: Array.isArray(rec.keyPoints) ? rec.keyPoints : JSON.parse(rec.keyPoints || '[]'),
            actionItems: Array.isArray(rec.actionItems) ? rec.actionItems : JSON.parse(rec.actionItems || '[]'),
            keyDecisions: Array.isArray(rec.keyDecisions) ? rec.keyDecisions : JSON.parse(rec.keyDecisions || '[]'),
            questionsAndAnswers: Array.isArray(rec.questionsAndAnswers) ? rec.questionsAndAnswers : JSON.parse(rec.questionsAndAnswers || '[]'),
            meetingStats: typeof rec.meetingStats === 'object' ? rec.meetingStats : JSON.parse(rec.meetingStats || '{}'),
            risks: Array.isArray(rec.risks) ? rec.risks : JSON.parse(rec.risks || '[]'),
            deadlines: Array.isArray(rec.deadlines) ? rec.deadlines : JSON.parse(rec.deadlines || '[]'),
          };
          setActiveRecording(parsedRec);
          setTranscriptText(parsedRec.transcript || '');
          setError(null);
        } else {
          setError('Failed to load recording details.');
        }
      } catch (err) {
        console.error('Error fetching recording:', err);
        setError(err.response?.data?.message || 'Error fetching recording details.');
      } finally {
        setLoading(false);
      }
    };

    if (!activeRecording) {
      fetchRecording();
    } else {
      setTranscriptText(activeRecording.transcript || '');
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#6366F1" style={{ marginBottom: 24 }} />
        <Text style={styles.processingTitle}>Loading Recording...</Text>
      </View>
    );
  }

  if (error || !activeRecording) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Recording details not found.'}</Text>
        <TouchableOpacity style={styles.returnBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.returnBtnText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCopyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Copied to clipboard!');
  };

  const toggleTaskChecked = (index) => {
    setCheckedTasks({
      ...checkedTasks,
      [index]: !checkedTasks[index],
    });
  };

  const handleToggleEditMode = async () => {
    if (isEditing) {
      setIsRegenerating(true);
      try {
        const response = await dispatch(
          updateTranscript({ id: activeRecording.id, transcript: transcriptText })
        ).unwrap();

        setActiveRecording(response);
        setIsEditing(false);
        Alert.alert('Success', 'Transcript updated successfully!');
      } catch (err) {
        Alert.alert('Error', 'Failed to update transcript.');
      } finally {
        setIsRegenerating(false);
      }
    } else {
      setIsEditing(true);
    }
  };

  const handleDeleteConfirm = () => {
    setShowMenuModal(false);
    Alert.alert(
      'Delete Recording',
      'Delete this recording permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setIsRegenerating(true);
            dispatch(deleteRecording(activeRecording.id))
              .unwrap()
              .then(() => {
                navigation.navigate('Home');
              })
              .catch(() => {
                Alert.alert('Error', 'Delete failed.');
                setIsRegenerating(false);
              });
          }
        }
      ]
    );
  };

  const handleRegenerateAnalysis = async () => {
    setShowMenuModal(false);
    setIsRegenerating(true);
    try {
      const response = await dispatch(regenerateAiAnalysis(activeRecording.id)).unwrap();
      setActiveRecording(response);
      Alert.alert('Success', 'AI analysis regenerated successfully!');
    } catch (err) {
      Alert.alert('Error', 'Regeneration failed.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadTranscript = async (type) => {
    if (!activeRecording || !activeRecording.transcript) {
      Alert.alert("Error", "No transcript is available to export.");
      return;
    }

    setIsDownloading(true);
    try {
      const dateObj = new Date(activeRecording.createdAt || activeRecording.dateTime);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const customTitle = `transcript_${yyyy}-${mm}-${dd}`;

      const downloadData = {
        ...activeRecording,
        title: customTitle
      };

      if (type === 'pdf') {
        await documentService.generatePdf(downloadData);
      } else if (type === 'docx') {
        await documentService.generateDocx(downloadData);
      } else if (type === 'txt') {
        await documentService.generateTxt(downloadData);
      }
      Alert.alert("Success", "File exported successfully!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to export the requested file.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExport = async (type) => {
    setShowExportModal(false);

    if (!activeRecording) {
      Alert.alert("Error", "No recording was found.");
      return;
    }

    if (type === 'audio') {
      handleDownloadAudio();
      return;
    }

    if (!activeRecording.transcript) {
      Alert.alert("Error", "The transcript has not been generated yet.");
      return;
    }

    const isMissingKey = activeRecording.summary && activeRecording.summary.includes('no AI API key is configured');
    if (isMissingKey || !activeRecording.summary) {
      Alert.alert("Warning", "The AI Summary has not been generated yet.");
    }

    try {
      if (type === 'pdf') {
        await documentService.generatePdf(activeRecording);
      } else if (type === 'docx') {
        await documentService.generateDocx(activeRecording);
      } else if (type === 'txt') {
        await documentService.generateTxt(activeRecording);
      }
      Alert.alert("Success", "File exported successfully!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to export the requested file.");
    }
  };

  const handleDownloadAudio = async () => {
    try {
      const audioUrl = activeRecording.audioUrl;
      if (!audioUrl) {
        Alert.alert("Error", "No recording was found.");
        return;
      }
      setIsDownloading(true);
      const settings = await DatabaseHelper.getSettings();
      const baseUrl = apiClient.defaults.baseURL || settings.apiUrl || 'http://localhost:9990';
      const fileUrl = audioUrl.startsWith('http') ? audioUrl : `${baseUrl}${audioUrl}`;

      // In React Native, rather than downloading files directly, we share the file path URL
      await Sharing.shareAsync(fileUrl, {
        dialogTitle: 'Share Audio Link',
      });

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to share the audio file link.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePlayToggle = () => {
    if (currentRecording && currentRecording.id === activeRecording.id && isPlaying) {
      pause();
    } else if (currentRecording && currentRecording.id === activeRecording.id && !isPlaying) {
      resume();
    } else {
      play(activeRecording);
    }
  };

  const formatDuration = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
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

  if (isRegenerating) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#6366F1" style={{ marginBottom: 24 }} />
        <Text style={styles.processingTitle}>Regenerating AI Analysis...</Text>
        <Text style={styles.processingDesc}>
          Updating summaries, key points, and action items...
        </Text>
      </View>
    );
  }

  const getSpeakerColor = (speakerName) => {
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    let hash = 0;
    for (let i = 0; i < speakerName.length; i++) {
      hash = speakerName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const parseTranscriptToChat = (text) => {
    if (!text) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const chat = [];

    let currentTimestamp = null;
    let currentSpeaker = null;
    let currentText = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('---') || line === '--------------------') {
        continue;
      }

      const timestampMatch = line.match(/^\[\d{2}:\d{2}(?::\d{2})?\]$/);
      if (timestampMatch) {
        if (currentSpeaker && currentText.length > 0) {
          chat.push({
            speaker: currentSpeaker,
            text: currentText.join('\n').trim(),
            timestamp: currentTimestamp
          });
        }
        currentTimestamp = line;
        currentSpeaker = null;
        currentText = [];
        continue;
      }

      const speakerMatch = line.match(/^(Speaker \d+|Speaker Unknown)/i);
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1];
        continue;
      }

      if (currentSpeaker) {
        currentText.push(line);
      } else {
        currentSpeaker = 'Speaker Unknown';
        currentText.push(line);
      }
    }

    if (currentSpeaker && currentText.length > 0) {
      chat.push({
        speaker: currentSpeaker,
        text: currentText.join('\n').trim(),
        timestamp: currentTimestamp
      });
    }

    return chat;
  };

  const parseSummaryToSections = (summaryText) => {
    if (!summaryText) return { speakers: [], actionItems: [] };

    const lines = summaryText.split('\n').map(l => l.trim());
    const speakers = [];
    const actionItems = [];

    let currentSpeaker = null;
    let currentText = [];
    let inActionItems = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      if (line.toLowerCase().startsWith('action items')) {
        if (currentSpeaker && currentText.length > 0) {
          speakers.push({
            name: currentSpeaker,
            text: currentText.join('\n').trim()
          });
        }
        currentSpeaker = null;
        currentText = [];
        inActionItems = true;
        continue;
      }

      const speakerMatch = line.match(/^(Speaker \d+|Speaker Unknown):\s*$/i);
      if (speakerMatch) {
        if (currentSpeaker && currentText.length > 0) {
          speakers.push({
            name: currentSpeaker,
            text: currentText.join('\n').trim()
          });
        }
        currentSpeaker = speakerMatch[1];
        currentText = [];
        inActionItems = false;
        continue;
      }

      if (inActionItems) {
        const cleanedItem = line.replace(/^[•\*\-\s]+/, '').trim();
        if (cleanedItem) {
          actionItems.push(cleanedItem);
        }
      } else {
        if (currentSpeaker) {
          currentText.push(line);
        } else {
          currentSpeaker = 'General Summary';
          currentText.push(line);
        }
      }
    }

    if (currentSpeaker && currentText.length > 0) {
      speakers.push({
        name: currentSpeaker,
        text: currentText.join('\n').trim()
      });
    }

    return { speakers, actionItems };
  };

  const parsedChat = activeTab === 'transcript' && !isEditing ? parseTranscriptToChat(activeRecording.transcript) : [];

  const TabButton = ({ title, active, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tabBtn,
        active && styles.tabBtnActive
      ]}
    >
      <Text
        style={[
          styles.tabBtnText,
          active && styles.tabBtnTextActive
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {activeRecording.title}
        </Text>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handlePlayToggle} style={styles.headerPlayBtn}>
            <MaterialIcons
              name={isPlaying && currentRecording?.id === activeRecording.id ? 'pause' : 'play-arrow'}
              size={18}
              color="white"
            />
            <Text style={styles.headerPlayText}>
              {isPlaying && currentRecording?.id === activeRecording.id ? 'Pause' : 'Play Voice'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownloadAudio} style={styles.headerBtn}>
            <MaterialIcons name="file-download" size={22} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleEditMode} style={styles.headerBtn}>
            <MaterialIcons
              name={isEditing ? 'save' : 'edit'}
              size={22}
              color={isEditing ? '#10B981' : '#FFFFFF'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.headerBtn}>
            <MaterialIcons name="share" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMenuModal(true)} style={styles.headerBtn}>
            <MaterialIcons name="more-vert" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Metadata Bar */}
      <View style={styles.metadataBar}>
        <View style={styles.metaTag}>
          <MaterialIcons name="calendar-today" size={13} color="#6366F1" style={{ marginRight: 6 }} />
          <Text style={styles.metaTagText}>{formatDate(activeRecording.createdAt || activeRecording.dateTime)}</Text>
        </View>
        <View style={styles.metaTag}>
          <MaterialIcons name="access-time" size={13} color="#6366F1" style={{ marginRight: 6 }} />
          <Text style={styles.metaTagText}>{formatDuration(activeRecording.durationInSeconds)}</Text>
        </View>
        <View style={styles.metaTag}>
          <MaterialIcons name="short-text" size={13} color="#6366F1" style={{ marginRight: 6 }} />
          <Text style={styles.metaTagText}>{activeRecording.wordCount || 0} words</Text>
        </View>
        {activeRecording.sentiment && (
          <View style={[
            styles.metaTag,
            {
              backgroundColor: activeRecording.sentiment === 'Positive' || activeRecording.sentiment === 'Excited' ? 'rgba(16, 185, 129, 0.15)' :
                activeRecording.sentiment === 'Concerned' || activeRecording.sentiment === 'Negative' ? 'rgba(239, 68, 68, 0.15)' :
                  'rgba(99, 102, 241, 0.15)',
            }
          ]}>
            <MaterialIcons
              name="mood"
              size={13}
              color={activeRecording.sentiment === 'Positive' || activeRecording.sentiment === 'Excited' ? '#10B981' :
                activeRecording.sentiment === 'Concerned' || activeRecording.sentiment === 'Negative' ? '#EF4444' :
                  '#6366F1'}
              style={{ marginRight: 4 }}
            />
            <Text style={[
              styles.metaTagText,
              {
                color: activeRecording.sentiment === 'Positive' || activeRecording.sentiment === 'Excited' ? '#10B981' :
                  activeRecording.sentiment === 'Concerned' || activeRecording.sentiment === 'Negative' ? '#EF4444' :
                    '#6366F1',
                fontWeight: 'bold',
              }
            ]}>
              {activeRecording.sentiment}
            </Text>
          </View>
        )}
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          <TabButton title="Summary" active={activeTab === 'summary'} onPress={() => setActiveTab('summary')} />
          <TabButton title="Key Points" active={activeTab === 'keyPoints'} onPress={() => setActiveTab('keyPoints')} />
          <TabButton title="Decisions" active={activeTab === 'decisions'} onPress={() => setActiveTab('decisions')} />
          <TabButton title="Tasks" active={activeTab === 'tasks'} onPress={() => setActiveTab('tasks')} />
          <TabButton title="Q&A" active={activeTab === 'qna'} onPress={() => setActiveTab('qna')} />
          <TabButton title="Transcript" active={activeTab === 'transcript'} onPress={() => setActiveTab('transcript')} />
        </ScrollView>
      </View>

      {/* Content Area */}
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'summary' && (
          <View style={styles.tabContent}>
            {/* Meeting Statistics Dashboard Panel */}
            {activeRecording.meetingStats && (
              <View style={[styles.cardBox, styles.cardDashboard]}>
                <Text style={styles.dashboardTitle}>
                  AI Meeting Insights & Metrics
                </Text>
                <View style={styles.dashboardGrid}>
                  <View style={styles.dashboardMetricBox}>
                    <Text style={styles.metricLabel}>AI Confidence</Text>
                    <Text style={[styles.metricValue, { color: '#10B981' }]}>
                      {Math.round((activeRecording.meetingStats.aiConfidence || 0.95) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.dashboardMetricBox}>
                    <Text style={styles.metricLabel}>Speakers Detected</Text>
                    <Text style={styles.metricValue}>
                      {activeRecording.meetingStats.numberOfSpeakers || 2}
                    </Text>
                  </View>
                  <View style={styles.dashboardMetricBox}>
                    <Text style={styles.metricLabel}>Total Words</Text>
                    <Text style={styles.metricValue}>
                      {activeRecording.wordCount || 0}
                    </Text>
                  </View>
                </View>

                {/* Speaking Time breakdown */}
                {activeRecording.meetingStats.speakingTimePerSpeaker && activeRecording.meetingStats.speakingTimePerSpeaker.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.breakdownTitle}>Speaking Time Distribution</Text>
                    {activeRecording.meetingStats.speakingTimePerSpeaker.map((speakerStat, idx) => {
                      const pctStr = speakerStat.duration.includes('%') ? speakerStat.duration : `${speakerStat.duration}%`;
                      return (
                        <View key={idx} style={{ marginBottom: 12 }}>
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownSpeaker}>{speakerStat.speaker}</Text>
                            <Text style={styles.breakdownPct}>{speakerStat.duration}</Text>
                          </View>
                          <View style={styles.progressBarBg}>
                            <View style={[
                              styles.progressBarFill,
                              {
                                width: pctStr,
                                backgroundColor: idx % 2 === 0 ? '#6366F1' : '#10B981',
                              }
                            ]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            <View style={styles.tabHeaderRow}>
              <Text style={styles.tabTitle}>Executive Summary</Text>
              <TouchableOpacity onPress={() => handleCopyToClipboard(activeRecording.summary)} style={styles.copyBtn}>
                <MaterialIcons name="content-copy" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {(() => {
              if (!activeRecording.summary) {
                return (
                  <View style={styles.cardBox}>
                    <Text style={styles.summaryText}>No summary generated for this recording.</Text>
                  </View>
                );
              }

              const speakerCount = activeRecording.meetingStats?.numberOfSpeakers || 1;
              const isSingleSpeaker = speakerCount <= 1;
              const parsedSummary = parseSummaryToSections(activeRecording.summary);

              if (parsedSummary.speakers.length === 0) {
                return (
                  <View style={styles.cardBox}>
                    <Text style={styles.summaryText}>{activeRecording.summary}</Text>
                  </View>
                );
              }

              return (
                <View style={{ gap: 16 }}>
                  <View style={[
                    styles.speakerBadge,
                    {
                      backgroundColor: isSingleSpeaker ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                      borderColor: isSingleSpeaker ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)'
                    }
                  ]}>
                    <MaterialIcons
                      name={isSingleSpeaker ? 'person' : 'people'}
                      size={16}
                      color={isSingleSpeaker ? '#10B981' : '#6366F1'}
                    />
                    <Text style={[styles.speakerBadgeText, { color: isSingleSpeaker ? '#10B981' : '#6366F1' }]}>
                      {isSingleSpeaker ? 'Single Speaker Detected' : `Multi-Speaker Conversation (${speakerCount} Speakers)`}
                    </Text>
                  </View>

                  {parsedSummary.speakers.map((sp, idx) => {
                    const avatarColor = getSpeakerColor(sp.name);
                    const shortName = sp.name.replace('Speaker ', '');
                    return (
                      <View key={idx} style={[styles.cardBox, styles.speakerCardRow, { borderLeftWidth: 4, borderLeftColor: avatarColor }]}>
                        <View style={[styles.speakerAvatar, { backgroundColor: avatarColor }]}>
                          <Text style={styles.speakerAvatarText}>{shortName.substring(0, 2)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.speakerNameTitle, { color: avatarColor }]}>{sp.name}</Text>
                          <Text style={styles.summaryText}>{sp.text}</Text>
                        </View>
                      </View>
                    );
                  })}

                  {parsedSummary.actionItems.length > 0 && (
                    <View>
                      <Text style={[styles.tabTitle, { marginTop: 16, marginBottom: 12 }]}>Action Items</Text>
                      <View style={styles.cardBox}>
                        {parsedSummary.actionItems.map((item, idx) => (
                          <View key={idx} style={styles.actionItemRow}>
                            <Text style={styles.actionItemDot}>•</Text>
                            <Text style={styles.actionItemText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })()}

            {activeRecording.meetingOverview && (
              <View style={{ marginTop: 24 }}>
                <Text style={[styles.tabTitle, { marginBottom: 12 }]}>Meeting Overview</Text>
                <View style={styles.cardBox}>
                  <Text style={styles.summaryText}>{activeRecording.meetingOverview}</Text>
                </View>
              </View>
            )}

            {activeRecording.risks && activeRecording.risks.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text style={[styles.tabTitle, { color: '#EF4444', marginBottom: 12 }]}>Potential Risks & Blockers</Text>
                <View style={[styles.cardBox, { borderLeftWidth: 4, borderLeftColor: '#EF4444' }]}>
                  {activeRecording.risks.map((risk, index) => (
                    <Text key={index} style={styles.listAlertText}>⚠️ {risk}</Text>
                  ))}
                </View>
              </View>
            )}

            {activeRecording.deadlines && activeRecording.deadlines.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text style={[styles.tabTitle, { color: '#10B981', marginBottom: 12 }]}>Deadlines & Milestones</Text>
                <View style={[styles.cardBox, { borderLeftWidth: 4, borderLeftColor: '#10B981' }]}>
                  {activeRecording.deadlines.map((dl, index) => (
                    <Text key={index} style={styles.listAlertText}>📅 {dl}</Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'keyPoints' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Key Discussion Points</Text>
            {!activeRecording.keyPoints || activeRecording.keyPoints.length === 0 ? (
              <View style={styles.emptyCardBox}>
                <Text style={styles.emptyText}>
                  {activeRecording.summary === 'AI Summary is unavailable because no AI API key is configured.'
                    ? 'AI Analysis is unavailable because no AI API key is configured.'
                    : 'No key points extracted.'}
                </Text>
              </View>
            ) : (
              activeRecording.keyPoints.map((point, index) => (
                <View key={index} style={styles.keyPointCard}>
                  <View style={styles.keyPointDot} />
                  <Text style={styles.keyPointText}>{point}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'decisions' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Key Decisions</Text>
            {!activeRecording.keyDecisions || activeRecording.keyDecisions.length === 0 ? (
              <View style={styles.emptyCardBox}>
                <Text style={styles.emptyText}>
                  {activeRecording.summary === 'AI Summary is unavailable because no AI API key is configured.'
                    ? 'AI Analysis is unavailable because no AI API key is configured.'
                    : 'No decisions recorded.'}
                </Text>
              </View>
            ) : (
              activeRecording.keyDecisions.map((dec, index) => (
                <View key={index} style={styles.keyPointCard}>
                  <MaterialIcons name="gavel" size={18} color="#10B981" style={{ marginRight: 12, marginTop: 3 }} />
                  <Text style={styles.keyPointText}>{dec}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'tasks' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Action Tasks & Assignees</Text>
            {!activeRecording.actionItems || activeRecording.actionItems.length === 0 ? (
              <View style={styles.emptyCardBox}>
                <Text style={styles.emptyText}>
                  {activeRecording.summary === 'AI Summary is unavailable because no AI API key is configured.'
                    ? 'AI Analysis is unavailable because no AI API key is configured.'
                    : 'No action items detected.'}
                </Text>
              </View>
            ) : (
              activeRecording.actionItems.map((task, index) => {
                const isChecked = !!checkedTasks[index];
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => toggleTaskChecked(index)}
                    style={styles.taskCard}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={isChecked ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={isChecked ? '#6366F1' : '#94A3B8'}
                      style={{ marginRight: 12 }}
                    />
                    <Text
                      style={[
                        styles.taskText,
                        {
                          textDecorationLine: isChecked ? 'line-through' : 'none',
                          color: isChecked ? '#94A3B8' : 'rgba(255, 255, 255, 0.85)',
                        }
                      ]}
                    >
                      {task}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'qna' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Questions & Answers</Text>
            {!activeRecording.questionsAndAnswers || activeRecording.questionsAndAnswers.length === 0 ? (
              <View style={styles.emptyCardBox}>
                <Text style={styles.emptyText}>
                  {activeRecording.summary === 'AI Summary is unavailable because no AI API key is configured.'
                    ? 'AI Analysis is unavailable because no AI API key is configured.'
                    : 'No questions extracted.'}
                </Text>
              </View>
            ) : (
              activeRecording.questionsAndAnswers.map((qa, index) => (
                <View key={index} style={[styles.cardBox, { marginBottom: 12 }]}>
                  <View style={styles.qnaHeaderRow}>
                    <MaterialIcons name="help-outline" size={18} color="#6366F1" style={{ marginRight: 8 }} />
                    <Text style={styles.questionLabel}>Question</Text>
                  </View>
                  <Text style={styles.questionText}>{qa.question}</Text>
                  <View style={styles.cardDivider} />
                  <View style={styles.qnaHeaderRow}>
                    <MaterialIcons name="check-circle-outline" size={18} color="#10B981" style={{ marginRight: 8 }} />
                    <Text style={styles.answerLabel}>Answer & Resolution</Text>
                  </View>
                  <Text style={styles.answerText}>{qa.answer}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'transcript' && (
          <View style={[styles.tabContent, { flex: 1 }]}>
            <View style={styles.tabHeaderRow}>
              <Text style={[styles.tabTitle, { color: isEditing ? '#10B981' : '#FFFFFF' }]}>
                {isEditing ? 'Editing Transcript...' : 'Formatted Transcript'}
              </Text>
              {!isEditing && (
                <TouchableOpacity onPress={() => handleCopyToClipboard(activeRecording.transcript)} style={styles.copyBtn}>
                  <MaterialIcons name="content-copy" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.transcriptViewBox}>
              {isEditing ? (
                <TextInput
                  multiline
                  value={transcriptText}
                  onChangeText={setTranscriptText}
                  style={styles.transcriptTextarea}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  textAlignVertical="top"
                />
              ) : parsedChat.length > 0 ? (
                <View style={styles.chatTimelineContainer}>
                  {parsedChat.map((msg, idx) => {
                    const avatarColor = getSpeakerColor(msg.speaker);
                    const isEven = idx % 2 === 0;
                    const shortName = msg.speaker.replace('Speaker ', '');
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.chatBubbleRow,
                          { alignSelf: isEven ? 'flex-start' : 'flex-end' }
                        ]}
                      >
                        {isEven && (
                          <View style={[styles.chatAvatar, { backgroundColor: avatarColor }]}>
                            <Text style={styles.chatAvatarText}>{shortName.substring(0, 2)}</Text>
                          </View>
                        )}
                        <View style={[styles.chatTextContainer, { alignItems: isEven ? 'flex-start' : 'flex-end' }]}>
                          <View style={styles.chatHeaderRow}>
                            <Text style={[styles.chatSpeakerName, { color: avatarColor }]}>{msg.speaker}</Text>
                            {msg.timestamp && <Text style={styles.chatTimestamp}>{msg.timestamp}</Text>}
                          </View>
                          <View style={[
                            styles.chatBubble,
                            {
                              backgroundColor: isEven ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.15)',
                              borderColor: isEven ? 'rgba(255,255,255,0.08)' : 'rgba(99, 102, 241, 0.3)',
                              borderTopLeftRadius: isEven ? 4 : 14,
                              borderTopRightRadius: isEven ? 14 : 4,
                            }
                          ]}>
                            <Text style={styles.chatBubbleText}>{msg.text}</Text>
                          </View>
                        </View>
                        {!isEven && (
                          <View style={[styles.chatAvatar, { backgroundColor: avatarColor }]}>
                            <Text style={styles.chatAvatarText}>{shortName.substring(0, 2)}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.summaryText}>
                  {activeRecording.transcript || 'No transcript recorded.'}
                </Text>
              )}
            </View>

            <View style={styles.downloadRow}>
              <TouchableOpacity
                disabled={!activeRecording.transcript}
                onPress={() => handleDownloadTranscript('pdf')}
                style={[
                  styles.downloadBtn,
                  { backgroundColor: activeRecording.transcript ? '#EF4444' : '#334155' }
                ]}
              >
                <MaterialIcons name="picture-as-pdf" size={18} color="white" />
                <Text style={styles.downloadBtnText}>Export PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!activeRecording.transcript}
                onPress={() => handleDownloadTranscript('docx')}
                style={[
                  styles.downloadBtn,
                  { backgroundColor: activeRecording.transcript ? '#3B82F6' : '#334155' }
                ]}
              >
                <MaterialIcons name="description" size={18} color="white" />
                <Text style={styles.downloadBtnText}>Export DOCX</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!activeRecording.transcript}
                onPress={() => handleDownloadTranscript('txt')}
                style={[
                  styles.downloadBtn,
                  { backgroundColor: activeRecording.transcript ? '#10B981' : '#334155' }
                ]}
              >
                <MaterialIcons name="text-fields" size={18} color="white" />
                <Text style={styles.downloadBtnText}>Export TXT</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Preparing Download overlay loading */}
      {isDownloading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingOverlayText}>Preparing Export...</Text>
        </View>
      )}

      {/* Export Bottom Sheet Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExportModal(false)}
        >
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Export Transcript</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider} />

            <TouchableOpacity onPress={() => handleExport('pdf')} style={styles.bottomSheetItem}>
              <MaterialIcons name="picture-as-pdf" size={20} color="#6366F1" style={{ marginRight: 16 }} />
              <Text style={styles.bottomSheetItemText}>Export as PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleExport('docx')} style={styles.bottomSheetItem}>
              <MaterialIcons name="description" size={20} color="#6366F1" style={{ marginRight: 16 }} />
              <Text style={styles.bottomSheetItemText}>Export as Word (DOCX)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleExport('txt')} style={styles.bottomSheetItem}>
              <MaterialIcons name="text-fields" size={20} color="#6366F1" style={{ marginRight: 16 }} />
              <Text style={styles.bottomSheetItemText}>Export as Plain Text (TXT)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleExport('audio')} style={styles.bottomSheetItem}>
              <MaterialIcons name="headset" size={20} color="#10B981" style={{ marginRight: 16 }} />
              <Text style={styles.bottomSheetItemText}>Share Original Audio Link</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Popover Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity
          style={styles.menuPopoverOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.menuPopover}>
            <TouchableOpacity onPress={handleRegenerateAnalysis} style={styles.menuItem}>
              <MaterialIcons name="refresh" size={18} color="#6366F1" style={{ marginRight: 10 }} />
              <Text style={styles.menuItemText}>Regenerate AI</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteConfirm} style={styles.menuItem}>
              <MaterialIcons name="delete-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D1A',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 4,
  },
  headerPlayText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  metadataBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(21, 28, 51, 0.5)',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  metaTagText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tabBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#6366F1',
  },
  tabBtnText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: '#6366F1',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    width: '100%',
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  copyBtn: {
    padding: 6,
  },
  cardBox: {
    backgroundColor: '#151C33',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 16,
  },
  cardDashboard: {
    backgroundColor: '#111833',
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  dashboardTitle: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  dashboardGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dashboardMetricBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  metricLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 12,
    marginBottom: 4,
  },
  breakdownSpeaker: {
    fontWeight: '500',
    color: '#FFFFFF',
    fontSize: 12,
  },
  breakdownPct: {
    fontWeight: 'bold',
    color: '#6366F1',
    fontSize: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  emptyCardBox: {
    backgroundColor: '#151C33',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  speakerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  speakerBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  speakerCardRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  speakerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerAvatarText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: 'white',
  },
  speakerNameTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionItemRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  actionItemDot: {
    marginRight: 8,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  actionItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  listAlertText: {
    fontSize: 13,
    marginBottom: 8,
    color: '#F3F4F6',
  },
  keyPointCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#151C33',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  keyPointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    marginRight: 12,
    marginTop: 6,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151C33',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  taskText: {
    flex: 1,
    fontSize: 14,
  },
  qnaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  questionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  questionText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 12,
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 12,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  answerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  transcriptViewBox: {
    backgroundColor: '#151C33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    minHeight: 260,
  },
  transcriptTextarea: {
    width: '100%',
    minHeight: 240,
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    padding: 0,
  },
  chatTimelineContainer: {
    gap: 20,
    paddingVertical: 10,
  },
  chatBubbleRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    maxWidth: '85%',
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 4,
  },
  chatAvatarText: {
    fontWeight: 'bold',
    fontSize: 13,
    color: 'white',
  },
  chatTextContainer: {
    flexDirection: 'column',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chatSpeakerName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  chatTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  chatBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chatBubbleText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 14,
    lineHeight: 22,
  },
  downloadRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 90,
  },
  downloadBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  loadingOverlayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bottomSheet: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#151C33',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 16,
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  bottomSheetItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  menuPopoverOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuPopover: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#151C33',
    borderRadius: 8,
    padding: 8,
    width: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  processingContainer: {
    flex: 1,
    backgroundColor: '#090D1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  processingDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#090D1A',
    padding: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
  returnBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default TranscriptScreen;
