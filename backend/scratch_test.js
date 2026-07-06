const path = require('path');
const fs = require('fs');

const backendDir = __dirname;
require('dotenv').config({ path: path.join(backendDir, '.env') });

const { transcribeAudio } = require(path.join(backendDir, 'src/services/transcriptionService'));
const { analyzeTranscript, generateLocalFallbackSummary } = require(path.join(backendDir, 'src/services/aiService'));

// Automated Mock Conversations for diverse scenarios, including flat/non-diarized text
const mockTestScenarios = [
  {
    name: 'Flat Non-Diarized English Conversation',
    rawTranscript: `Hello bro. Hi. How are you? I'm good. What are you doing? Working.`,
    assertions: (result) => {
      const cleanText = result.professionalTranscript;
      assertContains(cleanText, 'Speaker 1');
      assertContains(cleanText, 'Speaker 2');
      assertNotContains(cleanText, 'Speaker Unknown');
      
      const segments = cleanText.split('--------------------');
      if (segments.length < 4) {
        throw new Error(`Flat text was not split into alternating turns! Found ${segments.length} segments.`);
      }
      console.log('Flat English test details: Segments generated =', segments.length);
    }
  },
  {
    name: 'Flat Non-Diarized Hindi Conversation',
    rawTranscript: `नमस्ते भाई। हाँ नमस्कार, क्या हाल चाल हैं? मैं ठीक हूँ भाई, तुम बताओ।`,
    assertions: (result) => {
      const cleanText = result.professionalTranscript;
      assertContains(cleanText, 'Speaker 1');
      assertContains(cleanText, 'Speaker 2');
      assertNotContains(cleanText, 'Speaker Unknown');
      
      const segments = cleanText.split('--------------------');
      if (segments.length < 3) {
        throw new Error(`Flat Hindi text was not split into alternating turns! Found ${segments.length} segments.`);
      }
      console.log('Flat Hindi test details: Segments generated =', segments.length);
    }
  },
  {
    name: 'Hindi 2-Speaker Turn-Taking & Unknown Speaker Correction',
    rawTranscript: `
[00:01]
Speaker 1
अरे भाई, तुम कल कहाँ थे?
[00:04]
Speaker Unknown
मैं तो घर पर ही था।
    `,
    assertions: (result) => {
      const cleanText = result.professionalTranscript;
      assertContains(cleanText, 'Speaker 1');
      assertContains(cleanText, 'Speaker 2');
      assertNotContains(cleanText, 'Speaker Unknown');
    }
  },
  {
    name: 'Merged Question & Answer Splitting',
    rawTranscript: `
[00:01]
Speaker 1
How are you? I am fine.
    `,
    assertions: (result) => {
      const cleanText = result.professionalTranscript;
      assertContains(cleanText, 'Speaker 1');
      assertContains(cleanText, 'Speaker 2');
      assertNotContains(cleanText, 'Speaker Unknown');
      const segments = cleanText.split('--------------------');
      if (segments.length < 2) {
        throw new Error('Merged segment was not split!');
      }
    }
  }
];

function assertContains(source, substring) {
  if (!source.includes(substring)) {
    throw new Error(`Assertion failed: Expected transcript to contain "${substring}"`);
  }
}

function assertNotContains(source, substring) {
  if (source.includes(substring)) {
    throw new Error(`Assertion failed: Expected transcript NOT to contain "${substring}"`);
  }
}

async function main() {
  try {
    console.log('=== RUNNING SEMANTIC SPEAKER DIARIZATION TEST SUITE ===\n');

    // 1. Run Mock Tests
    console.log('--- 1. Running Mock Transcript Scenarios ---');
    for (const scenario of mockTestScenarios) {
      console.log(`\nRunning Scenario: "${scenario.name}"...`);
      const result = generateLocalFallbackSummary(scenario.rawTranscript.trim());
      
      console.log('Clean Transcript Output:');
      console.log(result.professionalTranscript);
      console.log('Summary Output:');
      console.log(result.summary);

      // Run Assertions
      scenario.assertions(result);
      console.log(`Scenario "${scenario.name}": PASS`);
    }

    console.log('\n--- 2. Running Live Audio Integration ---');
    const uploadsDir = path.join(backendDir, 'uploads');
    const selectedFile = path.join(uploadsDir, 'audio-1782993278185-831091857.webm');
    
    console.log(`Using file: ${selectedFile}`);
    const rawTranscript = await transcribeAudio(selectedFile, '', 'detect');
    console.log('AssemblyAI Raw Output:\n', rawTranscript);

    const liveAnalysis = await analyzeTranscript(rawTranscript);
    console.log('\nLive AI Analysis Clean Transcript:\n', liveAnalysis.professionalTranscript);
    console.log('\nLive AI Analysis Summary:\n', liveAnalysis.summary);

    // Verify live format
    assertNotContains(liveAnalysis.professionalTranscript, 'Speaker Unknown');
    
    console.log('\nAll semantic diarization fallback checks PASSED successfully!');
  } catch (error) {
    console.error('\nTest suite execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
