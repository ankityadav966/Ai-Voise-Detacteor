import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { deleteRecording, updateTranscript, regenerateAiAnalysis } from '../redux/historySlice';
import apiClient from '../services/apiClient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

const TranscriptPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const [activeRecording, setActiveRecording] = useState(() => {
    return route.params?.recording || null;
  });

  const [activeTab, setActiveTab] = useState('summary');
  const [isEditing, setIsEditing] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loading, setLoading] = useState(!activeRecording);
  const [error, setError] = useState(null);
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState({});

  useEffect(() => {
    const fetchRecording = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/api/recordings/${route.params?.id || activeRecording?.id}`);
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
  }, [route.params?.id]);

  if (loading) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#6366F1" style={styles.spinner} />
        <Text style={styles.processingTitle}>Loading Recording...</Text>
      </View>
    );
  }

  if (error || !activeRecording) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Recording details not found.'}</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.btnPrimaryText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCopyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Success', 'Copied to clipboard!');
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
    Alert.alert('Delete Recording', 'Delete this recording permanently?', [
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
    ]);
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

  if (isRegenerating) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#6366F1" style={styles.spinner} />
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{activeRecording.title}</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleToggleEditMode} style={styles.headerBtn}>
            {isEditing ? <MaterialIcons name="save" size={22} color="#10B981" /> : <MaterialIcons name="edit" size={22} color="#FFF" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMenuModal(true)} style={styles.headerBtn}>
            <MaterialIcons name="more-vert" size={22} color="#FFF" />
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
      </View>

      {/* Custom Tabs */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          <TabButton title="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
          <TabButton title="Key Points" active={activeTab === 'keyPoints'} onClick={() => setActiveTab('keyPoints')} />
          <TabButton title="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
          <TabButton title="Q&A" active={activeTab === 'qna'} onClick={() => setActiveTab('qna')} />
          <TabButton title="Transcript" active={activeTab === 'transcript'} onClick={() => setActiveTab('transcript')} />
        </ScrollView>
      </View>

      {/* Content Area */}
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'summary' && (
          <View style={styles.tabContent}>
            {activeRecording.meetingStats && (
              <View style={[styles.cardBox, { marginBottom: 20, backgroundColor: '#1A234D' }]}>
                <Text style={styles.insightsTitle}>AI Meeting Insights & Metrics</Text>
                <View style={styles.insightsGrid}>
                  <View style={styles.insightsBox}>
                    <Text style={styles.insightsLabel}>AI Confidence</Text>
                    <Text style={[styles.insightsValue, { color: '#10B981' }]}>
                      {Math.round((activeRecording.meetingStats.aiConfidence || 0.95) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.insightsBox}>
                    <Text style={styles.insightsLabel}>Speakers Detected</Text>
                    <Text style={styles.insightsValue}>
                      {activeRecording.meetingStats.numberOfSpeakers || 2}
                    </Text>
                  </View>
                  <View style={styles.insightsBox}>
                    <Text style={styles.insightsLabel}>Total Words</Text>
                    <Text style={styles.insightsValue}>
                      {activeRecording.wordCount || 0}
                    </Text>
                  </View>
                </View>
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
                  {parsedSummary.speakers.map((sp, idx) => {
                    const avatarColor = getSpeakerColor(sp.name);
                    const shortName = sp.name.replace('Speaker ', '');
                    return (
                      <View key={idx} style={[styles.cardBox, { flexDirection: 'row', gap: 16, borderLeftWidth: 4, borderLeftColor: avatarColor }]}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: avatarColor, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontWeight: 'bold', fontSize: 15, color: 'white' }}>{shortName.substring(0, 2)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: 'bold', color: avatarColor, marginBottom: 6 }}>{sp.name}</Text>
                          <Text style={styles.summaryText}>{sp.text}</Text>
                        </View>
                      </View>
                    );
                  })}

                  {parsedSummary.actionItems.length > 0 && (
                    <>
                      <Text style={[styles.tabTitle, { marginTop: 16 }]}>Action Items</Text>
                      <View style={styles.cardBox}>
                        {parsedSummary.actionItems.map((item, idx) => (
                          <Text key={idx} style={{ marginBottom: 8, fontSize: 14, lineHeight: 22, color: 'rgba(255,255,255,0.9)' }}>• {item}</Text>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {activeTab === 'keyPoints' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Key Discussion Points</Text>
            {!activeRecording.keyPoints || activeRecording.keyPoints.length === 0 ? (
              <View style={styles.emptyCardBox}>
                <Text style={styles.emptyCardText}>No key points extracted.</Text>
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

        {activeTab === 'tasks' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Action Tasks & Assignees</Text>
            {!activeRecording.actionItems || activeRecording.actionItems.length === 0 ? (
              <View style={styles.emptyCardBox}>
                <Text style={styles.emptyCardText}>No action items detected.</Text>
              </View>
            ) : (
              activeRecording.actionItems.map((task, index) => {
                const isChecked = !!checkedTasks[index];
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => toggleTaskChecked(index)}
                    style={styles.taskCard}
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
                <Text style={styles.emptyCardText}>No questions extracted.</Text>
              </View>
            ) : (
              activeRecording.questionsAndAnswers.map((qa, index) => (
                <View key={index} style={[styles.cardBox, { marginBottom: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <MaterialIcons name="help-outline" size={18} color="#6366F1" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#6366F1' }}>Question</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#FFFFFF', marginBottom: 12, fontWeight: '500' }}>{qa.question}</Text>
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 12 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <MaterialIcons name="check-circle-outline" size={18} color="#10B981" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#10B981' }}>Answer & Resolution</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 20 }}>{qa.answer}</Text>
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

            <View style={styles.transcriptBox}>
              {isEditing ? (
                <TextInput
                  value={transcriptText}
                  onChangeText={setTranscriptText}
                  style={styles.transcriptTextarea}
                  multiline
                  textAlignVertical="top"
                />
              ) : parsedChat.length > 0 ? (
                    <View style={{ gap: 20, paddingVertical: 10 }}>
                      {parsedChat.map((msg, idx) => {
                        const avatarColor = getSpeakerColor(msg.speaker);
                        const isEven = idx % 2 === 0;
                        const shortName = msg.speaker.replace('Speaker ', '');
                        return (
                          <View key={idx} style={{ flexDirection: 'row', gap: 12, alignSelf: isEven ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                            {isEven && (
                              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: avatarColor, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 14, color: 'white' }}>{shortName.substring(0, 2)}</Text>
                              </View>
                            )}
                            <View style={{ alignItems: isEven ? 'flex-start' : 'flex-end' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: avatarColor }}>{msg.speaker}</Text>
                                {msg.timestamp && <Text style={{ fontSize: 11, color: '#94A3B8' }}>{msg.timestamp}</Text>}
                              </View>
                              <View style={{ backgroundColor: isEven ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.15)', padding: 12, borderRadius: 14, borderTopLeftRadius: isEven ? 4 : 14, borderTopRightRadius: isEven ? 14 : 4, borderWidth: 1, borderColor: isEven ? 'rgba(255,255,255,0.08)' : 'rgba(99, 102, 241, 0.3)' }}>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: 14, lineHeight: 22 }}>
                                  {msg.text}
                                </Text>
                              </View>
                            </View>
                            {!isEven && (
                              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: avatarColor, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 14, color: 'white' }}>{shortName.substring(0, 2)}</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.transcriptText}>
                      {activeRecording.transcript || 'No transcript recorded.'}
                    </Text>
                  )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Popover Menu Modal */}
      <Modal visible={showMenuModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMenuModal(false)} activeOpacity={1}>
          <View style={styles.menuPopover}>
            <TouchableOpacity onPress={handleRegenerateAnalysis} style={styles.menuItem}>
              <MaterialIcons name="refresh" size={18} color="#6366F1" style={{ marginRight: 10 }} />
              <Text style={{ color: '#FFF', fontSize: 14 }}>Regenerate AI</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteConfirm} style={styles.menuItem}>
              <MaterialIcons name="delete-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <Text style={{ color: '#EF4444', fontSize: 14 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const TabButton = ({ title, active, onClick }) => (
  <TouchableOpacity
    onPress={onClick}
    style={[
      styles.tabBtn,
      {
        borderBottomColor: active ? '#6366F1' : 'transparent',
      }
    ]}
  >
    <Text style={{
      color: active ? '#6366F1' : '#94A3B8',
      fontWeight: active ? 'bold' : '500',
    }}>
      {title}
    </Text>
  </TouchableOpacity>
);

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
    paddingHorizontal: 16,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(21, 28, 51, 0.5)',
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaTagText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
  },
  content: {
    padding: 24,
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
    color: '#FFF',
  },
  copyBtn: {
    padding: 4,
  },
  cardBox: {
    backgroundColor: '#151C33',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  insightsTitle: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  insightsBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    flex: 1,
    minWidth: 100,
  },
  insightsLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  insightsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  emptyCardBox: {
    backgroundColor: '#151C33',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyCardText: {
    color: '#94A3B8',
    fontSize: 14,
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
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.85)',
    flex: 1,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151C33',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  taskText: {
    fontSize: 14,
    flex: 1,
  },
  transcriptBox: {
    backgroundColor: '#151C33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    minHeight: 260,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  transcriptTextarea: {
    width: '100%',
    minHeight: 240,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  menuPopover: {
    backgroundColor: '#151C33',
    borderRadius: 8,
    padding: 8,
    width: 160,
    marginRight: 16,
    marginTop: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  processingContainer: {
    flex: 1,
    backgroundColor: '#090D1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  spinner: {
    marginBottom: 24,
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
  },
  errorText: {
    color: '#EF4444',
  },
  btnPrimary: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnPrimaryText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default TranscriptPage;
