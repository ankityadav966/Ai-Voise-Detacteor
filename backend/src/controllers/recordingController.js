const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const { transcribeAudio } = require('../services/transcriptionService');
const { analyzeTranscript } = require('../services/aiService');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const parseRecording = (rec) => {
  if (!rec) return rec;
  return {
    ...rec,
    keyPoints: rec.keyPoints ? JSON.parse(rec.keyPoints) : [],
    actionItems: rec.actionItems ? JSON.parse(rec.actionItems) : [],
    keyDecisions: rec.keyDecisions ? JSON.parse(rec.keyDecisions) : [],
    questionsAndAnswers: rec.questionsAndAnswers ? JSON.parse(rec.questionsAndAnswers) : [],
    meetingStats: rec.meetingStats ? JSON.parse(rec.meetingStats) : {},
    risks: rec.risks ? JSON.parse(rec.risks) : [],
    deadlines: rec.deadlines ? JSON.parse(rec.deadlines) : [],
  };
};
/**
 * Upload Audio file and process with AI
 */
exports.createRecording = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No recording was found. Please record a conversation before generating a transcript or summary.' });
    }

    const { durationInSeconds, folder, transcript: localTranscript, speakersExpected } = req.body;
    const audioPath = req.file.path; // e.g. uploads/file-12345.m4a
    const absolutePath = path.resolve(audioPath);

    // 1. Trigger Audio Transcription
    const rawTranscript = await transcribeAudio(absolutePath, localTranscript, speakersExpected);

    // 2. Trigger AI summary & structural parsing
    const aiAnalysis = await analyzeTranscript(rawTranscript);

    // 3. Save to database
    const title = aiAnalysis.title || `Sync #${Date.now().toString().substring(8)}`;
    const transcript = aiAnalysis.professionalTranscript || rawTranscript;
    const summary = aiAnalysis.summary || '';
    const keyPoints = aiAnalysis.keyPoints || [];
    const actionItems = aiAnalysis.actionItems || [];
    const keyDecisions = aiAnalysis.keyDecisions || [];
    const questionsAndAnswers = aiAnalysis.questionsAndAnswers || [];
    const sentiment = aiAnalysis.sentiment || 'Neutral';
    const meetingStats = aiAnalysis.meetingStats || {};
    const meetingOverview = aiAnalysis.meetingOverview || '';
    const risks = aiAnalysis.risks || [];
    const deadlines = aiAnalysis.deadlines || [];
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;

    const parsedDuration = parseInt(durationInSeconds, 10);
    const safeDuration = isNaN(parsedDuration) ? 0 : Math.max(0, parsedDuration);

    const recording = await prisma.recording.create({
      data: {
        title,
        audioUrl: `/uploads/${path.basename(audioPath)}`,
        durationInSeconds: safeDuration,
        transcript,
        summary,
        keyPoints: JSON.stringify(keyPoints),
        actionItems: JSON.stringify(actionItems),
        keyDecisions: JSON.stringify(keyDecisions),
        questionsAndAnswers: JSON.stringify(questionsAndAnswers),
        sentiment,
        meetingStats: JSON.stringify(meetingStats),
        meetingOverview,
        risks: JSON.stringify(risks),
        deadlines: JSON.stringify(deadlines),
        folder: (folder && folder.trim()) || 'General',
        wordCount,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Recording uploaded and processed successfully.',
      recording: parseRecording(recording),
    });
  } catch (error) {
    // Delete file if processing failed to avoid orphaned items on disk
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * Fetch recordings with search, favorite, and folder filters
 */
exports.getRecordings = async (req, res, next) => {
  try {
    const { search, folder, favorite } = req.query;

    const where = {
      userId: req.user.id,
    };

    if (favorite === 'true') {
      where.isFavorite = true;
    }

    if (folder && folder !== 'All') {
      where.folder = folder;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { transcript: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const recordings = await prisma.recording.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, recordings: recordings.map(parseRecording) });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Specific Recording Details
 */
exports.getRecordingById = async (req, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID format.' });
    }

    const recording = await prisma.recording.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found.' });
    }

    res.status(200).json({ success: true, recording: parseRecording(recording) });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Recording (Edit title, tags, or manual transcript corrections)
 */
exports.updateRecording = async (req, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID format.' });
    }

    const { title, folder, transcript } = req.body;

    if (title === undefined && folder === undefined && transcript === undefined) {
      return res.status(400).json({ success: false, message: 'At least one field (title, folder, or transcript) must be provided to update.' });
    }

    if (title !== undefined && (!title || title.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Title cannot be empty.' });
    }

    const recording = await prisma.recording.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found.' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (folder !== undefined) updateData.folder = folder.trim() || 'General';
    
    if (transcript !== undefined) {
      updateData.transcript = transcript;
      updateData.wordCount = transcript.split(/\s+/).filter(Boolean).length;
    }

    const updated = await prisma.recording.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.status(200).json({ success: true, recording: parseRecording(updated) });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle Favorite status
 */
exports.toggleFavorite = async (req, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID format.' });
    }

    const recording = await prisma.recording.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found.' });
    }

    const updated = await prisma.recording.update({
      where: { id: req.params.id },
      data: { isFavorite: !recording.isFavorite },
    });

    res.status(200).json({ success: true, recording: parseRecording(updated) });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate AI summary / action items
 */
exports.regenerateAnalysis = async (req, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID format.' });
    }

    const recording = await prisma.recording.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found.' });
    }

    const aiAnalysis = await analyzeTranscript(recording.transcript);

    // If the analysis failed and returned a fallback mock object (due to missing API keys or API error),
    // we must not overwrite existing valid user data with empty fields/arrays.
    if (aiAnalysis && aiAnalysis.isMock) {
      return res.status(502).json({
        success: false,
        message: 'AI Service is currently unavailable. Please verify that your API keys are configured and try again.',
      });
    }

    const updated = await prisma.recording.update({
      where: { id: req.params.id },
      data: {
        title: aiAnalysis.title || recording.title,
        summary: aiAnalysis.summary || recording.summary,
        keyPoints: JSON.stringify(aiAnalysis.keyPoints || (recording.keyPoints ? JSON.parse(recording.keyPoints) : [])),
        actionItems: JSON.stringify(aiAnalysis.actionItems || (recording.actionItems ? JSON.parse(recording.actionItems) : [])),
        keyDecisions: JSON.stringify(aiAnalysis.keyDecisions || (recording.keyDecisions ? JSON.parse(recording.keyDecisions) : [])),
        questionsAndAnswers: JSON.stringify(aiAnalysis.questionsAndAnswers || (recording.questionsAndAnswers ? JSON.parse(recording.questionsAndAnswers) : [])),
        sentiment: aiAnalysis.sentiment || recording.sentiment,
        meetingStats: JSON.stringify(aiAnalysis.meetingStats || (recording.meetingStats ? JSON.parse(recording.meetingStats) : {})),
        meetingOverview: aiAnalysis.meetingOverview || recording.meetingOverview,
        risks: JSON.stringify(aiAnalysis.risks || (recording.risks ? JSON.parse(recording.risks) : [])),
        deadlines: JSON.stringify(aiAnalysis.deadlines || (recording.deadlines ? JSON.parse(recording.deadlines) : [])),
      },
    });

    res.status(200).json({
      success: true,
      message: 'AI summary analysis regenerated successfully.',
      recording: parseRecording(updated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Recording (Removes DB reference and audio file on disk)
 */
exports.deleteRecording = async (req, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID format.' });
    }

    const recording = await prisma.recording.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found.' });
    }

    // Delete local file if it exists
    const localPath = path.join(__dirname, '../..', recording.audioUrl);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (_) {}
    }

    await prisma.recording.delete({ where: { id: req.params.id } });

    res.status(200).json({ success: true, message: 'Recording deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
