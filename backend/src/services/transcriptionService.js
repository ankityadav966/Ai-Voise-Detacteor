const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require("dotenv")
dotenv.config()
/**
 * Transcribe local audio file using Deepgram or OpenAI Whisper
 */
exports.transcribeAudio = async (audioFilePath, localTranscript, speakersExpected) => {
  const fileExists = fs.existsSync(audioFilePath);
  if (!fileExists) {
    throw new Error(`Audio file not found on disk at: ${audioFilePath}`);
  }

  // 1. Try Gemini (Prioritized for Diarization and Transcription)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    try {
      return await transcribeGemini(audioFilePath, process.env.GEMINI_API_KEY);
    } catch (e) {
      console.error(`[Transcription] Gemini failed: ${e.message}`);
    }
  }

  // 2. Fallback to client-side real-time transcript if available
  if (localTranscript && localTranscript.trim()) {
    console.log('[Transcription] Using client-side speech preview transcript fallback.');
    return localTranscript.includes('Speaker ') 
      ? localTranscript.trim() 
      : `[System: No Diarization Model Configured - Raw Text]\n\n${localTranscript.trim()}`;
  }

  // 3. Complete Fallback for trial/offline sandbox runs
  console.log('[Transcription] No API keys configured and no client transcript. Returning empty text.');
  return 'No transcription available. Please check GEMINI_API_KEY or speak clearly while recording.';
};

/**
 * Call Gemini 1.5 API for Audio Transcription and Speaker Diarization
 */
async function transcribeGemini(audioFilePath, apiKey) {
  const audioBuffer = fs.readFileSync(audioFilePath);
  const ext = path.extname(audioFilePath).toLowerCase();
  
  let contentType = 'audio/wav';
  if (ext === '.m4a' || ext === '.mp4') {
    contentType = 'audio/mp4';
  } else if (ext === '.aac') {
    contentType = 'audio/aac';
  } else if (ext === '.mp3') {
    contentType = 'audio/mpeg';
  } else if (ext === '.webm') {
    contentType = 'audio/webm';
  } else if (ext === '.ogg') {
    contentType = 'audio/ogg';
  }

  const base64Audio = audioBuffer.toString('base64');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
You are an expert transcriptionist. Please transcribe the provided audio accurately. 
Crucially, perform speaker diarization: distinguish between different speakers (e.g., Speaker 1, Speaker 2).
For each turn, format it exactly like this:
[00:00]

Speaker 1

Text goes here.

--------------------

[00:10]

Speaker 2

Text goes here.
`;

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: contentType,
              data: base64Audio
            }
          },
          { text: prompt.trim() }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1
    }
  });

  const text = result.response.text();
  
  if (!text) {
    return 'Empty transcript returned from Gemini.';
  }

  return text;
}

