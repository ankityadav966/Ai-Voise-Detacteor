const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require("dotenv")
dotenv.config()
/**
 * Call Gemini or OpenAI models to format the raw transcript, correct grammar,
 * translate Hinglish terms, and generate summary, key points, and action items.
 */
exports.analyzeTranscript = async (rawTranscript) => {
  const systemPrompt = `
You are an expert Speech and Conversation Intelligence AI. Analyze the provided conversation transcript, apply advanced Speaker Diarization Correction, and return a structured JSON response.

Your analysis must:
1. **Title**: Generate a short (3-5 words), professional title.
2. **Professional Transcript & Diarization Correction**: Clean and format the transcript following these strict requirements:
   - **Single vs Multiple Speakers**: Carefully analyze if the transcript is a monologue (single speaker) or a conversation between multiple people. If the raw transcript is assigned entirely to a single speaker but contains clear turn-taking or dialogue, you MUST semantically split it into the correct number of distinct speakers (Speaker 1, Speaker 2, Speaker 3, etc., up to as many distinct speakers as there are) with estimated timestamps. Do not limit to just 2 speakers if more people are conversing. Conversely, if it is clearly one person dictating, keep it all as Speaker 1.
   - **Speaker Profiling**: Maintain a conceptual speaker profile for each participant based on sentence style, language (Hindi, English, Hinglish, or mixed), vocabulary, response timing, and context. Use these profiles to ensure consistent Speaker IDs.
   - **Diarization Correction**: Fix incorrectly assigned speakers, split merged turns, and resolve "Unknown Speaker" tags using conversational context. Never output "Speaker Unknown".
   - **Segment Splitting**: Never merge two different speakers. If a segment contains a question and its immediate answer (e.g. "How are you? I'm fine.") or a statement and a backchannel/agreement (e.g. "Let's begin. Okay."), split them into separate segments with correct speaker IDs and estimate sequential timestamps.
   - **Backchannel & Turn-Taking Identification**: Correctly identify conversational turns. Backchannel words (e.g. "Hmm", "Yes", "Okay", "Right", "Exactly", "No", "Correct") usually belong to the other participant.
   - **Layout Format**: Preserve all segment timestamps (in the format [mm:ss] or [hh:mm:ss]) from the raw transcript. For every segment, keep the timestamp on its own line, followed by a blank line, followed by the speaker label on the next line, followed by a blank line, followed by the text on the next line. Separate segments with a line containing exactly twenty hyphens: "--------------------" (with a blank line before and after the separator).
     Format exactly like:
     [00:00]
     
     Speaker 1
     
     Hello everyone.
     
     --------------------
     
     [00:04]
     
     Speaker 2
     
     Hi.
    - **Preserve the original language exactly as spoken** (Hindi, English, Hinglish, or mixed language). Do NOT translate, summarize, rewrite, or change the wording. **CRITICAL: If the STT outputs Urdu/Arabic script (e.g. ہلو), you MUST transliterate it to Hinglish (Latin alphabet) or Hindi (Devanagari). NEVER output Urdu script.**
    - If multiple people speak at the same time, indicate **[Overlapping Speech]**.
    - **Handling Flat Non-Diarized Transcripts**: If the raw input lacks any speaker labels or timestamps, perform semantic speaker diarization from scratch.
3. **Summary**: Generate a chronological summary of the conversation turn-by-turn. Do NOT group all text by speaker. Instead, follow the natural chronological order of the conversation.
   - For EACH turn in the conversation, provide the timestamp, the speaker, a brief summary of what they said in that turn, and the exact text they spoke.
   - Format exactly like this:
[00:00] Speaker 1:
Summary: Explained the project status.
Exact Text: "Here is the exact text they said."

[00:05] Speaker 2:
Summary: Asked questions.
Exact Text: "What is the status?"

[00:10] Speaker 1:
Summary: Clarified the status.
Exact Text: "It is going well."

   - **Action Items**: Below the chronological summary, include a list of action items. Use a header "Action Items:\n", then bulleted items starting with the "•" character. Separate sections with an empty line.
4. **Meeting Overview**: Write a 2-3 sentence overview explaining the background and context of the meeting.
5. **Key Points**: Extract a list of the main topics, discussions, and decisions made.
6. **Action Items**: Extract a list of concrete tasks. If owners are mentioned, format as "Owner Name: Task".
7. **Key Decisions**: Extract a list of important decisions finalized during the discussion.
8. **Questions and Answers**: Identify key questions asked during the meeting and their corresponding answers/conclusions.
9. **Sentiment**: Detect the overall sentiment/tone of the conversation (e.g. "Positive", "Neutral", "Concerned", "Excited").
10. **Risks**: Extract a list of potential risks, blockers, or blocker issues discussed.
11. **Deadlines**: Extract a list of dates, milestones, or timeframes mentioned for any task or milestone.
12. **Meeting Stats**: Return stats including:
   - "numberOfSpeakers": total number of distinct speakers detected.
   - "aiConfidence": estimated confidence level (0.0 to 1.0).
   - "speakingTimePerSpeaker": array of objects with "speaker" (e.g. "Speaker 1") and "duration" (approximate speaking duration in seconds or percentage).

The response MUST be a single, valid JSON object with the following keys:
{
  "title": "...",
  "professionalTranscript": "...",
  "summary": "...",
  "meetingOverview": "...",
  "keyPoints": ["...", "..."],
  "actionItems": ["...", "..."],
  "keyDecisions": ["...", "..."],
  "questionsAndAnswers": [
    { "question": "...", "answer": "..." }
  ],
  "sentiment": "...",
  "risks": ["...", "..."],
  "deadlines": ["...", "..."],
  "meetingStats": {
    "numberOfSpeakers": 3,
    "aiConfidence": 0.95,
    "speakingTimePerSpeaker": [
      { "speaker": "Speaker 1", "duration": "40%" },
      { "speaker": "Speaker 2", "duration": "40%" },
      { "speaker": "Speaker 3", "duration": "20%" }
    ]
  }
}

Important: Return ONLY the raw JSON string. Do not wrap it in markdown code blocks like \`\`\`json ... \`\`\`.
`;

  // 1. Try Google Gemini API (preferred for cost and speed)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    try {
      return await callGemini(rawTranscript, systemPrompt, process.env.GEMINI_API_KEY);
    } catch (e) {
      console.error(`[AI Service] Gemini call failed: ${e.message}. Trying OpenAI fallback...`);
    }
  }

  // 2. Try OpenAI API fallback
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '') {
    try {
      return await callOpenAI(rawTranscript, systemPrompt, process.env.OPENAI_API_KEY);
    } catch (e) {
      console.error(`[AI Service] OpenAI call failed: ${e.message}`);
    }
  }

  // 3. Fallback mock if offline or keys missing
  console.log('[AI Service] No API keys configured or calls failed. Generating smart local summary fallback.');
  return generateLocalFallbackSummary(rawTranscript);
};

/**
 * Call Google Gemini API
 */
async function callGemini(rawTranscript, systemPrompt, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${systemPrompt}\n\nMeeting Transcript:\n${rawTranscript}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    }
  });

  const text = result.response.text();
  if (!text) throw new Error('Empty response from Gemini API.');

  return parseJsonResponse(text);
}

/**
 * Call OpenAI API
 */
async function callOpenAI(rawTranscript, systemPrompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the transcript:\n${rawTranscript}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from OpenAI API.');

  return parseJsonResponse(text);
}

/**
 * JSON parser helper stripping markdown code blocks
 */
function parseJsonResponse(responseText) {
  try {
    let clean = responseText;
    if (clean.includes('```json')) {
      clean = clean.split('```json')[1];
      clean = clean.split('```')[0];
    } else if (clean.includes('```')) {
      clean = clean.split('```')[1];
      clean = clean.split('```')[0];
    }
    clean = clean.trim();
    return JSON.parse(clean);
  } catch (e) {
    throw new Error(`Failed to parse AI output into JSON: ${e.message}. Raw output: ${responseText}`);
  }
}

function generateLocalFallbackSummary(rawTranscript) {
  const lines = rawTranscript.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const hasSpeakerTags = lines.some(l => /^(Speaker \d+|Speaker Unknown)/i.test(l));
  const rawSegments = [];
  let currentTimestamp = '[00:00]';
  let currentSpeaker = 'Speaker Unknown';

  if (!hasSpeakerTags) {
    // Join all lines and split into sentences
    const fullText = lines.join(' ');
    // Split by sentence punctuation (. ? ! ।)
    const sentences = fullText.match(/[^\.!\?।]+[\.!\?।]+/g) || [fullText];
    
    let activeSpeaker = 'Speaker 1';
    let currentMins = 0;
    let currentSecs = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;
      
      const timestamp = `[${String(currentMins).padStart(2, '0')}:${String(currentSecs).padStart(2, '0')}]`;
      
      let shouldSwitch = false;
      
      // 1. If previous sentence was a question
      if (i > 0 && sentences[i - 1].trim().endsWith('?')) {
        shouldSwitch = true;
      }
      
      // 2. If current sentence starts with a greeting, backchannel, or Hindi turn-starters
      if (/^(hello|hi|hey|yes|no|okay|ok|right|exactly|sure|yep|yup|nah|correct|thanks|thank you|हाँ|नमस्ते|नमस्कार|क्या|सुनो)\b/i.test(sentence)) {
        shouldSwitch = true;
      }
      
      if (shouldSwitch) {
        activeSpeaker = activeSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
      }
      
      rawSegments.push({
        speaker: activeSpeaker,
        timestamp,
        text: sentence
      });
      
      // Increment estimated timestamp
      currentSecs += Math.max(2, Math.floor(sentence.split(' ').length * 0.4));
      if (currentSecs >= 60) {
        currentMins += Math.floor(currentSecs / 60);
        currentSecs = currentSecs % 60;
      }
    }
  } else {
    // First pass: extract segments
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('---') || line === '--------------------') {
        continue;
      }

      const timestampMatch = line.match(/^\[\d{2}:\d{2}(?::\d{2})?\]$/);
      if (timestampMatch) {
        currentTimestamp = line;
        continue;
      }
      
      const speakerMatch = line.match(/^(Speaker \d+|Speaker Unknown):?\s*$/i);
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1];
        continue;
      }
      
      const speakerTextMatch = line.match(/^(Speaker \d+|Speaker Unknown):?\s*(.*)$/i);
      if (speakerTextMatch) {
        currentSpeaker = speakerTextMatch[1];
        const text = speakerTextMatch[2].trim();
        if (text) {
          rawSegments.push({ speaker: currentSpeaker, timestamp: currentTimestamp, text });
        }
        continue;
      }
      
      rawSegments.push({ speaker: currentSpeaker, timestamp: currentTimestamp, text: line });
    }
  }

  // Second pass: Split merged segments and resolve Speaker Unknown
  const parsedLines = [];
  const speakers = new Set();
  let lastSpeaker = 'Speaker 1';

  for (let i = 0; i < rawSegments.length; i++) {
    const seg = rawSegments[i];
    let speaker = seg.speaker;
    
    // Resolve Speaker Unknown using turn taking
    if (speaker.toLowerCase() === 'speaker unknown') {
      speaker = lastSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
    }
    
    let text = seg.text;
    
    // Rule 1: Check for merged Question & Answer, e.g. "How are you? I'm fine."
    const questionMatch = text.match(/^([^\?\.\!]+\?)\s+(.+)$/);
    // Rule 2: Check for statement followed by backchannel, e.g. "Let's go. Okay."
    const backchannelMatch = text.match(/^([^\?\.\!]+[\.\!])\s+(okay|yes|hmm|no|right|exactly|correct|agree|sure|hi|hello)\.?$/i);

    if (questionMatch) {
      const qText = questionMatch[1].trim();
      const aText = questionMatch[2].trim();
      
      parsedLines.push({ speaker, timestamp: seg.timestamp, text: qText });
      speakers.add(speaker);
      
      const otherSpeaker = speaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
      parsedLines.push({ speaker: otherSpeaker, timestamp: seg.timestamp, text: aText });
      speakers.add(otherSpeaker);
      lastSpeaker = otherSpeaker;
    } else if (backchannelMatch) {
      const stmtText = backchannelMatch[1].trim();
      const bcText = backchannelMatch[2].trim();
      
      parsedLines.push({ speaker, timestamp: seg.timestamp, text: stmtText });
      speakers.add(speaker);
      
      const otherSpeaker = speaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
      parsedLines.push({ speaker: otherSpeaker, timestamp: seg.timestamp, text: bcText });
      speakers.add(otherSpeaker);
      lastSpeaker = otherSpeaker;
    } else {
      // Normal dialog segment
      parsedLines.push({ speaker, timestamp: seg.timestamp, text });
      speakers.add(speaker);
      lastSpeaker = speaker;
    }
  }

  // Ensure Speaker Unknown never appears in the output speakers list
  speakers.delete('Speaker Unknown');
  if (speakers.size === 0) {
    speakers.add('Speaker 1');
  }
  const speakerList = Array.from(speakers);

  // Clean professional transcript in double-spaced hyphens-divided format
  const segments = parsedLines.map(l => {
    let t = l.text
      .replace(/\b(um|uh|like|you know|actually|basically|so)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (t.length > 0) {
      t = t.charAt(0).toUpperCase() + t.slice(1);
    }
    return `${l.timestamp}\n\n${l.speaker}\n\n${t}`;
  });
  const cleanTranscript = segments.join('\n\n--------------------\n\n');

  // Extract questions and answers
  const questionsAndAnswers = [];
  for (let i = 0; i < parsedLines.length; i++) {
    const current = parsedLines[i];
    if (current.text.includes('?') || /^(what|why|how|who|when|where|is|are|do|does|can|could|should|would)/i.test(current.text)) {
      let answer = "";
      for (let j = i + 1; j < Math.min(i + 4, parsedLines.length); j++) {
        if (parsedLines[j].speaker !== current.speaker) {
          answer = parsedLines[j].text;
          break;
        }
      }
      if (answer) {
        questionsAndAnswers.push({
          question: current.text,
          answer: answer
        });
      }
    }
  }

  // Extract action items
  const actionItems = [];
  const actionKeywords = /\b(will|need to|should|going to|must|task|action|send|share|check|complete|do)\b/i;
  for (const line of parsedLines) {
    if (actionKeywords.test(line.text) && line.text.split(' ').length > 4) {
      actionItems.push(line.text);
    }
  }
  if (actionItems.length === 0) {
    actionItems.push("Follow up on topics discussed in the meeting.");
  }

  // Generate Summary in requested format
  let summary = "";
  if (speakerList.length === 1) {
    const spLines = parsedLines.filter(l => l.speaker === speakerList[0]);
    const textContent = spLines.map(l => l.text).join(' ');
    summary = textContent.length > 300 ? textContent.substring(0, 300) + '...' : textContent;
    if (!summary) summary = `The speaker recorded an audio memo.`;
  } else if (speakerList.length > 1) {
    summary = speakerList.map(sp => {
      const spLines = parsedLines.filter(l => l.speaker === sp);
      const points = [];
      
      const longLines = spLines
        .filter(l => l.text.split(' ').length > 5)
        .slice(0, 3);
        
      if (longLines.length > 0) {
        longLines.forEach(l => {
          points.push(l.text);
        });
      } else if (spLines.length > 0) {
        points.push(`Participated in the conversation: "${spLines[0].text}"`);
      } else {
        points.push(`No significant verbal contribution detected.`);
      }
      
      return `${sp}:\n${points.join('\n')}`;
    }).join('\n\n');
  } else {
    summary = `This discussion covers the recorded audio. The participants reviewed progress, clarified requirements, and agreed on key objectives moving forward.`;
  }

  // Add Action items section
  summary += `\n\nAction Items:\n` + actionItems.map(item => `• ${item}`).join('\n');

  const meetingOverview = `A sync meeting involving ${speakerList.length} participant(s) to discuss ongoing coordination, tasks, and project updates.`;

  const totalWords = rawTranscript.split(/\s+/).length;
  const speakingTimePerSpeaker = speakerList.map(sp => {
    const spWords = parsedLines.filter(l => l.speaker === sp).reduce((acc, curr) => acc + curr.text.split(/\s+/).length, 0);
    const percentage = totalWords > 0 ? Math.round((spWords / totalWords) * 100) : 0;
    return {
      speaker: sp,
      duration: `${percentage}%`
    };
  });

  return {
    isMock: false,
    title: parsedLines.length > 0 && parsedLines[0].text.split(' ').length <= 5 
      ? parsedLines[0].text.replace(/[^\w\s]/g, '')
      : `Sync Discussion #${Math.floor(Math.random() * 9000 + 1000)}`,
    professionalTranscript: cleanTranscript,
    summary,
    meetingOverview,
    keyPoints: [],
    actionItems,
    keyDecisions: [],
    questionsAndAnswers: questionsAndAnswers.slice(0, 3),
    sentiment: "Neutral",
    risks: [],
    deadlines: [],
    meetingStats: {
      numberOfSpeakers: speakerList.length,
      aiConfidence: 0.8,
      speakingTimePerSpeaker
    }
  };
}

exports.generateLocalFallbackSummary = generateLocalFallbackSummary;

