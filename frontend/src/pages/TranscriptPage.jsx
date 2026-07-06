import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  deleteRecording,
  updateTranscript,
  regenerateAiAnalysis,
} from '../redux/historySlice';
import documentService from '../services/documentService';
import apiClient from '../services/apiClient';
import { DatabaseHelper } from '../services/storage';
import { usePlayer } from '../context/PlayerContext';
import * as MdIcons from 'react-icons/md';

const TranscriptPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const { play, currentRecording, isPlaying, pause, resume } = usePlayer();

  const [activeRecording, setActiveRecording] = useState(() => {
    return location.state?.recording || null;
  });

  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'keyPoints' | 'tasks' | 'transcript'
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
      <div style={styles.processingContainer}>
        <div style={styles.spinner} />
        <h2 style={styles.processingTitle}>Loading Recording...</h2>
      </div>
    );
  }

  if (error || !activeRecording) {
    return (
      <div style={styles.errorContainer}>
        <p>{error || 'Recording details not found.'}</p>
        <button onClick={() => navigate('/home')}>Return Home</button>
      </div>
    );
  }

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
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
        alert('Transcript updated successfully!');
      } catch (err) {
        alert('Failed to update transcript.');
      } finally {
        setIsRegenerating(false);
      }
    } else {
      setIsEditing(true);
    }
  };

  const handleDeleteConfirm = () => {
    setShowMenuModal(false);
    const confirm = window.confirm('Delete this recording permanently?');
    if (confirm) {
      setIsRegenerating(true);
      dispatch(deleteRecording(activeRecording.id))
        .unwrap()
        .then(() => {
          navigate('/home');
        })
        .catch(() => {
          alert('Delete failed.');
          setIsRegenerating(false);
        });
    }
  };

  const handleRegenerateAnalysis = async () => {
    setShowMenuModal(false);
    setIsRegenerating(true);
    try {
      const response = await dispatch(regenerateAiAnalysis(activeRecording.id)).unwrap();
      setActiveRecording(response);
      alert('AI analysis regenerated successfully!');
    } catch (err) {
      alert('Regeneration failed.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadTranscript = async (type) => {
    if (!activeRecording || !activeRecording.transcript) {
      alert("No transcript is available to download. Please record and transcribe the audio first.");
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
      alert("File downloaded successfully!");
    } catch (e) {
      console.error(e);
      alert("Unable to download the requested file. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExport = async (type) => {
    setShowExportModal(false);
    
    if (!activeRecording) {
      alert("No recording was found. Please record a conversation first.");
      return;
    }

    if (type === 'audio') {
      handleDownloadAudio();
      return;
    }

    if (!activeRecording.transcript) {
      alert("The transcript has not been generated yet.");
      return;
    }

    const isMissingKey = activeRecording.summary && activeRecording.summary.includes('no AI API key is configured');
    if (isMissingKey || !activeRecording.summary) {
      alert("The AI Summary has not been generated yet.");
    }

    try {
      if (type === 'pdf') {
        await documentService.generatePdf(activeRecording);
      } else if (type === 'docx') {
        await documentService.generateDocx(activeRecording);
      } else if (type === 'txt') {
        await documentService.generateTxt(activeRecording);
      }
      alert("File downloaded successfully!");
    } catch (e) {
      console.error(e);
      alert("Unable to download the requested file. Please try again.");
    }
  };

  const handleDownloadAudio = async () => {
    try {
      const audioUrl = activeRecording.audioUrl;
      if (!audioUrl) {
        alert("No recording was found. Please record a conversation first.");
        return;
      }
      setIsDownloading(true);
      const settings = DatabaseHelper.getSettings();
      const baseUrl = apiClient.defaults.baseURL || settings.apiUrl || 'http://localhost:9990';
      const fileUrl = audioUrl.startsWith('http') ? audioUrl : `${baseUrl}${audioUrl}`;
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const filename = audioUrl.split('/').pop() || 'audio.m4a';
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      alert("Voice downloaded successfully!");
    } catch (e) {
      console.error(e);
      alert("Unable to download the requested file. Please try again.");
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
      <div style={styles.processingContainer}>
        <div style={styles.spinner} />
        <h2 style={styles.processingTitle}>Regenerating AI Analysis...</h2>
        <p style={styles.processingDesc}>
          Updating summaries, key points, and action items...
        </p>
      </div>
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

      // Ignore divider lines
      if (line.startsWith('---') || line === '--------------------') {
        continue;
      }

      // Check if line is a timestamp like [00:04]
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

      // Check if line starts with Speaker
      const speakerMatch = line.match(/^(Speaker \d+|Speaker Unknown)/i);
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1];
        continue;
      }

      // Otherwise, it is dialogue text for the current segment
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
      
      // Check if line is the start of Action Items
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
      
      // Check if line is a Speaker label (e.g. Speaker 1:)
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
        // Strip bullet characters
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
  const characterCount = activeRecording.transcript?.length || 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.headerBtn} aria-label="Back">
          <MdIcons.MdArrowBack size={24} />
        </button>
        <span style={styles.headerTitle}>{activeRecording.title}</span>
        
        <div style={styles.headerRight}>
          <button onClick={handlePlayToggle} style={{...styles.headerBtn, backgroundColor: '#6366F1', color: 'white'}} title={isPlaying && currentRecording?.id === activeRecording.id ? "Pause Audio" : "Play Audio"}>
            {isPlaying && currentRecording?.id === activeRecording.id ? <MdIcons.MdPause size={22} /> : <MdIcons.MdPlayArrow size={22} />}
            <span style={{marginLeft: '4px', fontSize: '14px', fontWeight: 'bold'}}>{isPlaying && currentRecording?.id === activeRecording.id ? 'Pause' : 'Play Voice'}</span>
          </button>
          <button onClick={handleDownloadAudio} style={{...styles.headerBtn, marginLeft: '8px'}} title="Download Voice">
            <MdIcons.MdFileDownload size={22} color="#10B981" />
          </button>
          <button onClick={handleToggleEditMode} style={{...styles.headerBtn, marginLeft: '8px'}} title={isEditing ? 'Save' : 'Edit'}>
            {isEditing ? <MdIcons.MdSave size={22} color="#10B981" /> : <MdIcons.MdEdit size={22} />}
          </button>
          <button onClick={() => setShowExportModal(true)} style={{...styles.headerBtn, marginLeft: '8px'}} title="Export">
            <MdIcons.MdShare size={22} />
          </button>
          <button onClick={() => setShowMenuModal(true)} style={{...styles.headerBtn, marginLeft: '8px'}} title="More">
            <MdIcons.MdMoreVert size={22} />
          </button>
        </div>
      </div>

      {/* Metadata Bar */}
      <div style={styles.metadataBar}>
        <div style={styles.metaTag}>
          <MdIcons.MdCalendarToday size={13} color="#6366F1" style={{ marginRight: '6px' }} />
          <span>{formatDate(activeRecording.createdAt || activeRecording.dateTime)}</span>
        </div>
        <div style={styles.metaTag}>
          <MdIcons.MdAccessTime size={13} color="#6366F1" style={{ marginRight: '6px' }} />
          <span>{formatDuration(activeRecording.durationInSeconds)}</span>
        </div>
        <div style={styles.metaTag}>
          <MdIcons.MdShortText size={13} color="#6366F1" style={{ marginRight: '6px' }} />
          <span>{activeRecording.wordCount || 0} words</span>
        </div>
        {activeRecording.sentiment && (
          <div style={{
            ...styles.metaTag,
            backgroundColor: activeRecording.sentiment === 'Positive' || activeRecording.sentiment === 'Excited' ? 'rgba(16, 185, 129, 0.15)' :
                             activeRecording.sentiment === 'Concerned' || activeRecording.sentiment === 'Negative' ? 'rgba(239, 68, 68, 0.15)' :
                             'rgba(99, 102, 241, 0.15)',
            color: activeRecording.sentiment === 'Positive' || activeRecording.sentiment === 'Excited' ? '#10B981' :
                   activeRecording.sentiment === 'Concerned' || activeRecording.sentiment === 'Negative' ? '#EF4444' :
                   '#6366F1',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}>
            <MdIcons.MdMood size={13} style={{ marginRight: '4px' }} />
            <span>{activeRecording.sentiment}</span>
          </div>
        )}
      </div>

      {/* Custom Tabs */}
      <div style={styles.tabsRow}>
        <TabButton title="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
        <TabButton title="Key Points" active={activeTab === 'keyPoints'} onClick={() => setActiveTab('keyPoints')} />
        <TabButton title="Decisions" active={activeTab === 'decisions'} onClick={() => setActiveTab('decisions')} />
        <TabButton title="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
        <TabButton title="Q&A" active={activeTab === 'qna'} onClick={() => setActiveTab('qna')} />
        <TabButton title="Transcript" active={activeTab === 'transcript'} onClick={() => setActiveTab('transcript')} />
      </div>

      {/* Content Area */}
      <div style={styles.content}>
        {activeTab === 'summary' && (
          <div style={styles.tabContent}>
            {/* Meeting Statistics Dashboard Panel */}
            {activeRecording.meetingStats && (
              <div style={{ ...styles.cardBox, marginBottom: '20px', background: 'linear-gradient(135deg, #1A234D 0%, #111833 100%)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#6366F1', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  AI Meeting Insights & Metrics
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>AI Confidence</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10B981' }}>
                      {Math.round((activeRecording.meetingStats.aiConfidence || 0.95) * 100)}%
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Speakers Detected</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFFFFF' }}>
                      {activeRecording.meetingStats.numberOfSpeakers || 2}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Total Words</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFFFFF' }}>
                      {activeRecording.wordCount || 0}
                    </div>
                  </div>
                </div>

                {/* Speaking Time breakdown */}
                {activeRecording.meetingStats.speakingTimePerSpeaker && activeRecording.meetingStats.speakingTimePerSpeaker.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '10px' }}>Speaking Time Distribution</div>
                    {activeRecording.meetingStats.speakingTimePerSpeaker.map((speakerStat, idx) => (
                      <div key={idx} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '500', color: '#FFFFFF' }}>{speakerStat.speaker}</span>
                          <span style={{ fontWeight: 'bold', color: '#6366F1' }}>{speakerStat.duration}</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: speakerStat.duration.includes('%') ? speakerStat.duration : `${speakerStat.duration}%`,
                            backgroundColor: idx % 2 === 0 ? '#6366F1' : '#10B981',
                            borderRadius: '3px'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={styles.tabHeaderRow}>
              <h3 style={styles.tabTitle}>Executive Summary</h3>
              <button onClick={() => handleCopyToClipboard(activeRecording.summary)} style={styles.copyBtn} title="Copy Summary">
                <MdIcons.MdContentCopy size={18} />
              </button>
            </div>
            {(() => {
              if (!activeRecording.summary) {
                return (
                  <div style={styles.cardBox}>
                    <p style={styles.summaryText}>No summary generated for this recording.</p>
                  </div>
                );
              }

              const speakerCount = activeRecording.meetingStats?.numberOfSpeakers || 1;
              const isSingleSpeaker = speakerCount <= 1;
              const parsedSummary = parseSummaryToSections(activeRecording.summary);

              if (parsedSummary.speakers.length === 0) {
                return (
                  <div style={styles.cardBox}>
                    <p style={styles.summaryText}>{activeRecording.summary}</p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '20px', backgroundColor: isSingleSpeaker ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)', border: `1px solid ${isSingleSpeaker ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`, width: 'fit-content' }}>
                    {isSingleSpeaker ? (
                      <>
                        <MdIcons.MdPerson size={16} color="#10B981" />
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#10B981' }}>Single Speaker Detected</span>
                      </>
                    ) : (
                      <>
                        <MdIcons.MdPeople size={16} color="#6366F1" />
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6366F1' }}>Multi-Speaker Conversation ({speakerCount} Speakers)</span>
                      </>
                    )}
                  </div>

                  {parsedSummary.speakers.map((sp, idx) => {
                    const avatarColor = getSpeakerColor(sp.name);
                    const shortName = sp.name.replace('Speaker ', '');
                    return (
                      <div key={idx} style={{ ...styles.cardBox, display: 'flex', gap: '16px', alignItems: 'flex-start', borderLeft: `4px solid ${avatarColor}` }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '15px', color: 'white', flexShrink: 0 }}>
                          {shortName.substring(0, 2)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span style={{ fontSize: '15px', fontWeight: 'bold', color: avatarColor, marginBottom: '6px' }}>{sp.name}</span>
                          <p style={{ ...styles.summaryText, fontSize: '14px', margin: 0 }}>{sp.text}</p>
                        </div>
                      </div>
                    );
                  })}

                  {parsedSummary.actionItems.length > 0 && (
                    <>
                      <h3 style={{ ...styles.tabTitle, marginTop: '16px' }}>Action Items</h3>
                      <div style={styles.cardBox}>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.9)' }}>
                          {parsedSummary.actionItems.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: '8px', fontSize: '14px', lineHeight: '1.6' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {activeRecording.meetingOverview && (
              <>
                <h3 style={{ ...styles.tabTitle, marginTop: '24px' }}>Meeting Overview</h3>
                <div style={styles.cardBox}>
                  <p style={styles.summaryText}>{activeRecording.meetingOverview}</p>
                </div>
              </>
            )}

            {activeRecording.risks && activeRecording.risks.length > 0 && (
              <>
                <h3 style={{ ...styles.tabTitle, marginTop: '24px', color: '#EF4444' }}>Potential Risks & Blockers</h3>
                <div style={{ ...styles.cardBox, borderLeft: '4px solid #EF4444' }}>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#F3F4F6' }}>
                    {activeRecording.risks.map((risk, index) => (
                      <li key={index} style={{ marginBottom: '8px', fontSize: '13px' }}>⚠️ {risk}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {activeRecording.deadlines && activeRecording.deadlines.length > 0 && (
              <>
                <h3 style={{ ...styles.tabTitle, marginTop: '24px', color: '#10B981' }}>Deadlines & Milestones</h3>
                <div style={{ ...styles.cardBox, borderLeft: '4px solid #10B981' }}>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#F3F4F6' }}>
                    {activeRecording.deadlines.map((dl, index) => (
                      <li key={index} style={{ marginBottom: '8px', fontSize: '13px' }}>📅 {dl}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'keyPoints' && (
          <div style={styles.tabContent}>
            <h3 style={styles.tabTitle}>Key Discussion Points</h3>
            {!activeRecording.keyPoints || activeRecording.keyPoints.length === 0 ? (
              <div style={styles.emptyCardBox}>
                {activeRecording.summary === 'AI Summary is unavailable because no AI API key is configured.'
                  ? 'AI Analysis is unavailable because no AI API key is configured.'
                  : 'No key points extracted.'}
              </div>
            ) : (
              activeRecording.keyPoints.map((point, index) => (
                <div key={index} style={styles.keyPointCard}>
                  <div style={styles.keyPointDot} />
                  <p style={styles.keyPointText}>{point}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'decisions' && (
          <div style={styles.tabContent}>
            <h3 style={styles.tabTitle}>Key Decisions</h3>
            {!activeRecording.keyDecisions || activeRecording.keyDecisions.length === 0 ? (
              <div style={styles.emptyCardBox}>
                {activeRecording.summary === 'AI Summary is unavailable because no AI API key is configured.'
                  ? 'AI Analysis is unavailable because no AI API key is configured.'
                  : 'No decisions recorded.'}
              </div>
            ) : (
              activeRecording.keyDecisions.map((dec, index) => (
                <div key={index} style={styles.keyPointCard}>
                  <MdIcons.MdGavel size={18} color="#10B981" style={{ marginRight: '12px', marginTop: '3px', flexShrink: 0 }} />
                  <p style={styles.keyPointText}>{dec}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div style={styles.tabContent}>
            <h3 style={styles.tabTitle}>Action Tasks & Assignees</h3>
            {!activeRecording.actionItems || activeRecording.actionItems.length === 0 ? (
              <div style={styles.emptyCardBox}>
                {activeRecording.summary === 'AI Summary is unavailable because no AI API key is configured.'
                  ? 'AI Analysis is unavailable because no AI API key is configured.'
                  : 'No action items detected.'}
              </div>
            ) : (
              activeRecording.actionItems.map((task, index) => {
                const isChecked = !!checkedTasks[index];
                return (
                  <div
                    key={index}
                    onClick={() => toggleTaskChecked(index)}
                    style={styles.taskCard}
                  >
                    <button style={styles.checkboxBtn}>
                      {isChecked ? (
                        <MdIcons.MdCheckBox size={22} color="#6366F1" />
                      ) : (
                        <MdIcons.MdCheckBoxOutlineBlank size={22} color="#94A3B8" />
                      )}
                    </button>
                    <span
                      style={{
                        ...styles.taskText,
                        textDecoration: isChecked ? 'line-through' : 'none',
                        color: isChecked ? '#94A3B8' : 'rgba(255, 255, 255, 0.85)',
                      }}
                    >
                      {task}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'qna' && (
          <div style={styles.tabContent}>
            <h3 style={styles.tabTitle}>Questions & Answers</h3>
            {!activeRecording.questionsAndAnswers || activeRecording.questionsAndAnswers.length === 0 ? (
              <div style={styles.emptyCardBox}>
                {activeRecording.summary === 'AI Summary is unavailable because no AI API key is configured.'
                  ? 'AI Analysis is unavailable because no AI API key is configured.'
                  : 'No questions extracted.'}
              </div>
            ) : (
              activeRecording.questionsAndAnswers.map((qa, index) => (
                <div key={index} style={{ ...styles.cardBox, marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <MdIcons.MdHelpOutline size={18} color="#6366F1" style={{ marginRight: '8px' }} />
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#6366F1' }}>Question</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#FFFFFF', marginBottom: '12px', fontWeight: '500' }}>{qa.question}</p>
                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                    <MdIcons.MdCheckCircleOutline size={18} color="#10B981" style={{ marginRight: '8px' }} />
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#10B981' }}>Answer & Resolution</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.5' }}>{qa.answer}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div style={{ ...styles.tabContent, display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={styles.tabHeaderRow}>
              <h3 style={{ ...styles.tabTitle, color: isEditing ? '#10B981' : '#FFFFFF' }}>
                {isEditing ? 'Editing Transcript...' : 'Formatted Transcript'}
              </h3>
              {!isEditing && (
                <button onClick={() => handleCopyToClipboard(activeRecording.transcript)} style={styles.copyBtn} title="Copy Transcript">
                  <MdIcons.MdContentCopy size={18} />
                </button>
              )}
            </div>

            <div style={styles.transcriptBox}>
              {isEditing ? (
                <textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  style={styles.transcriptTextarea}
                />
              ) : parsedChat.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                      {parsedChat.map((msg, idx) => {
                        const avatarColor = getSpeakerColor(msg.speaker);
                        const isEven = idx % 2 === 0;
                        const shortName = msg.speaker.replace('Speaker ', '');
                        return (
                          <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', alignSelf: isEven ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                            {isEven && (
                              <div style={{ width: '36px', height: '36px', borderRadius: '18px', backgroundColor: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', flexShrink: 0, marginTop: '4px', color: 'white', border: '2px solid rgba(255,255,255,0.1)' }}>
                                {shortName.substring(0, 2)}
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isEven ? 'flex-start' : 'flex-end' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: avatarColor }}>{msg.speaker}</span>
                                {msg.timestamp && <span style={{ fontSize: '11px', color: '#94A3B8' }}>{msg.timestamp}</span>}
                                {msg.confidence && <span style={{ fontSize: '11px', color: '#94A3B8', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>{msg.confidence}%</span>}
                              </div>
                              <div style={{ backgroundColor: isEven ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.15)', padding: '12px 16px', borderRadius: '14px', borderTopLeftRadius: isEven ? '4px' : '14px', borderTopRightRadius: isEven ? '14px' : '4px', border: `1px solid ${isEven ? 'rgba(255,255,255,0.08)' : 'rgba(99, 102, 241, 0.3)'}`, color: 'rgba(255, 255, 255, 0.95)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                                {msg.text}
                              </div>
                            </div>
                            {!isEven && (
                              <div style={{ width: '36px', height: '36px', borderRadius: '18px', backgroundColor: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', flexShrink: 0, marginTop: '4px', color: 'white', border: '2px solid rgba(255,255,255,0.1)' }}>
                                {shortName.substring(0, 2)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={styles.transcriptText}>
                      {activeRecording.transcript || 'No transcript recorded.'}
                    </p>
                  )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                disabled={!activeRecording.transcript}
                onClick={() => handleDownloadTranscript('pdf')}
                style={{
                  backgroundColor: activeRecording.transcript ? '#EF4444' : '#334155',
                  cursor: activeRecording.transcript ? 'pointer' : 'not-allowed',
                  opacity: activeRecording.transcript ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'background-color 0.2s'
                }}
              >
                <MdIcons.MdPictureAsPdf size={18} />
                Download PDF
              </button>
              <button
                disabled={!activeRecording.transcript}
                onClick={() => handleDownloadTranscript('docx')}
                style={{
                  backgroundColor: activeRecording.transcript ? '#3B82F6' : '#334155',
                  cursor: activeRecording.transcript ? 'pointer' : 'not-allowed',
                  opacity: activeRecording.transcript ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'background-color 0.2s'
                }}
              >
                <MdIcons.MdDescription size={18} />
                Download DOCX
              </button>
              <button
                disabled={!activeRecording.transcript}
                onClick={() => handleDownloadTranscript('txt')}
                style={{
                  backgroundColor: activeRecording.transcript ? '#10B981' : '#334155',
                  cursor: activeRecording.transcript ? 'pointer' : 'not-allowed',
                  opacity: activeRecording.transcript ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'background-color 0.2s'
                }}
              >
                <MdIcons.MdTextFields size={18} />
                Download TXT
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preparing Download overlay */}
      {isDownloading && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.bottomSheet, alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div style={styles.spinner} />
            <h2 style={{ ...styles.processingTitle, marginTop: '20px' }}>Preparing Download...</h2>
          </div>
        </div>
      )}

      {/* Export bottom sheet */}
      {showExportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div style={styles.bottomSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.bottomSheetHeader}>
              <span style={styles.bottomSheetTitle}>Export Transcript</span>
              <button onClick={() => setShowExportModal(false)} style={styles.closeBtn}>
                <MdIcons.MdClose size={22} />
              </button>
            </div>
            <div style={styles.modalDivider} />

            <button onClick={() => handleExport('pdf')} style={styles.bottomSheetItem}>
              <MdIcons.MdPictureAsPdf size={20} color="#6366F1" style={{ marginRight: '16px' }} />
              <span>Export as PDF</span>
            </button>
            <button onClick={() => handleExport('docx')} style={styles.bottomSheetItem}>
              <MdIcons.MdDescription size={20} color="#6366F1" style={{ marginRight: '16px' }} />
              <span>Export as Word (DOCX)</span>
            </button>
            <button onClick={() => handleExport('txt')} style={styles.bottomSheetItem}>
              <MdIcons.MdTextFields size={20} color="#6366F1" style={{ marginRight: '16px' }} />
              <span>Export as Plain Text (TXT)</span>
            </button>
            <button onClick={() => handleExport('audio')} style={styles.bottomSheetItem}>
              <MdIcons.MdHeadset size={20} color="#10B981" style={{ marginRight: '16px' }} />
              <span>Download Original Audio</span>
            </button>
          </div>
        </div>
      )}

      {/* Popover Menu */}
      {showMenuModal && (
        <div style={styles.modalOverlay} onClick={() => setShowMenuModal(false)}>
          <div style={styles.menuPopover} onClick={(e) => e.stopPropagation()}>
            <button onClick={handleRegenerateAnalysis} style={styles.menuItem}>
              <MdIcons.MdRefresh size={18} color="#6366F1" style={{ marginRight: '10px' }} />
              <span>Regenerate AI</span>
            </button>
            <button onClick={handleDeleteConfirm} style={styles.menuItem}>
              <MdIcons.MdDeleteOutline size={18} color="#EF4444" style={{ marginRight: '10px' }} />
              <span style={{ color: '#EF4444' }}>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ title, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      ...styles.tabBtn,
      borderBottomColor: active ? '#6366F1' : 'transparent',
      color: active ? '#6366F1' : '#94A3B8',
      fontWeight: active ? 'bold' : '500',
    }}
  >
    {title}
  </button>
);

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#090D1A',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: '40px',
  },
  header: {
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
  },
  headerBtn: {
    color: '#FFFFFF',
    padding: '8px',
    display: 'inline-flex',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    flex: 1,
    marginLeft: '8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  metadataBar: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: 'rgba(21, 28, 51, 0.5)',
  },
  metaTag: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabsRow: {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  tabBtn: {
    flex: 1,
    padding: '12px 0',
    textAlign: 'center',
    fontSize: '13px',
    borderBottom: '3px solid transparent',
  },
  content: {
    flex: 1,
    maxWidth: '960px',
    width: '100%',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  tabContent: {
    width: '100%',
  },
  tabHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  tabTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  copyBtn: {
    color: '#94A3B8',
    padding: '4px',
    display: 'flex',
  },
  cardBox: {
    backgroundColor: '#151C33',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
  },
  summaryText: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.9)',
    whiteSpace: 'pre-wrap',
  },
  emptyCardBox: {
    backgroundColor: '#151C33',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: '14px',
  },
  keyPointCard: {
    display: 'flex',
    alignItems: 'flex-start',
    backgroundColor: '#151C33',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid rgba(255, 255, 255, 0.02)',
  },
  keyPointDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#6366F1',
    marginRight: '12px',
    marginTop: '6px',
    flexShrink: 0,
  },
  keyPointText: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  taskCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#151C33',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '12px',
    cursor: 'pointer',
  },
  checkboxBtn: {
    padding: 0,
    marginRight: '12px',
    display: 'flex',
    color: '#94A3B8',
  },
  taskText: {
    fontSize: '14px',
  },
  transcriptBox: {
    flex: 1,
    backgroundColor: '#151C33',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    padding: '16px',
    minHeight: '260px',
  },
  transcriptText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.85)',
    whiteSpace: 'pre-wrap',
  },
  transcriptTextarea: {
    width: '100%',
    height: '100%',
    minHeight: '240px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#FFFFFF',
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'none',
    outline: 'none',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 9999,
  },
  bottomSheet: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#151C33',
    borderTopLeftRadius: '20px',
    borderTopRightRadius: '20px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  bottomSheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomSheetTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  closeBtn: {
    color: '#94A3B8',
    padding: '4px',
  },
  modalDivider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    margin: '16px 0',
  },
  bottomSheetItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 0',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: '500',
    textAlign: 'left',
  },
  menuPopover: {
    position: 'absolute',
    top: '60px',
    right: '16px',
    backgroundColor: '#151C33',
    borderRadius: '8px',
    padding: '8px',
    width: '160px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'left',
  },
  processingContainer: {
    height: '100vh',
    width: '100vw',
    backgroundColor: '#090D1A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.05)',
    borderTopColor: '#6366F1',
    borderRadius: '50%',
    animation: 'spinner 1.2s linear infinite',
    marginBottom: '24px',
  },
  processingTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  processingDesc: {
    fontSize: '13px',
    color: '#94A3B8',
    marginTop: '8px',
  },
  errorContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    backgroundColor: '#090D1A',
  },
};

export default TranscriptPage;
