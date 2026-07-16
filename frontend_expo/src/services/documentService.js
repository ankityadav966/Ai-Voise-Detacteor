import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

class DocumentService {
  /**
   * Format duration in seconds to MM:SS or HH:MM:SS
   */
  _formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Sanitize file title for disk safety
   */
  _sanitizeFileName(title) {
    return title.replace(/[<>:"/\\|?*]/g, '_').trim();
  }

  /**
   * Helper: Share a local file path
   */
  async _triggerShare(fileUri, dialogTitle) {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      alert("Sharing is not available on this device.");
      return;
    }
    await Sharing.shareAsync(fileUri, {
      dialogTitle: dialogTitle || 'Export File',
      mimeType: 'application/octet-stream',
    });
  }

  /**
   * Generate and print/share a PDF document
   */
  async generatePdf(recording) {
    try {
      const dateText = new Date(recording.createdAt || recording.dateTime).toLocaleString();
      const durationText = this._formatDuration(recording.durationInSeconds);

      const overviewHtml = recording.meetingOverview
        ? `<h2>MEETING OVERVIEW</h2>
           <p>${recording.meetingOverview}</p>`
        : '';

      const keyPointsHtml = recording.keyPoints && recording.keyPoints.length > 0
        ? `<h2>KEY DISCUSSION POINTS</h2>
           <ul>
             ${recording.keyPoints.map(point => `<li>${point}</li>`).join('')}
           </ul>`
        : '';

      const actionItemsHtml = recording.actionItems && recording.actionItems.length > 0
        ? `<h2>ACTION ITEMS</h2>
           <ul class="task-list">
             ${recording.actionItems.map(item => `<li><span class="checkbox"></span> ${item}</li>`).join('')}
           </ul>`
        : '';

      const decisionsHtml = recording.keyDecisions && recording.keyDecisions.length > 0
        ? `<h2>KEY DECISIONS</h2>
           <ul>
             ${recording.keyDecisions.map(dec => `<li><strong>[Decided]</strong> ${dec}</li>`).join('')}
           </ul>`
        : '';

      const risksHtml = recording.risks && recording.risks.length > 0
        ? `<h2>RISKS & BLOCKERS</h2>
           <ul style="color: #c2410c;">
             ${recording.risks.map(risk => `<li>⚠️ ${risk}</li>`).join('')}
           </ul>`
        : '';

      const deadlinesHtml = recording.deadlines && recording.deadlines.length > 0
        ? `<h2>DEADLINES & MILESTONES</h2>
           <ul>
             ${recording.deadlines.map(deadline => `<li>📅 ${deadline}</li>`).join('')}
           </ul>`
        : '';

      const qnaHtml = recording.questionsAndAnswers && recording.questionsAndAnswers.length > 0
        ? `<h2>QUESTIONS & ANSWERS</h2>
           ${recording.questionsAndAnswers.map(qa => `
             <div style="margin-bottom: 12px; font-size: 12px;">
               <div style="font-weight: bold; color: #1e1b4b;">Q: ${qa.question}</div>
               <div style="color: #475569; margin-top: 2px; padding-left: 12px;">A: ${qa.answer}</div>
             </div>
           `).join('')}`
        : '';

      const transcriptHtml = recording.transcript
        ? `<h2>DIARIZED TRANSCRIPT</h2>
           <div class="transcript">${recording.transcript}</div>`
        : '';

      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>${recording.title}</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 20px; line-height: 1.5; background: white; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e0e7ff; padding-bottom: 8px; margin-bottom: 20px; font-size: 10px; color: #4f46e5; font-weight: bold; }
              .date { color: #64748b; font-weight: normal; }
              h1 { font-size: 20px; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
              .meta-container { display: flex; margin-bottom: 20px; flex-wrap: wrap; }
              .meta-tag { background-color: #e0e7ff; color: #4338ca; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-right: 10px; margin-bottom: 6px; }
              h2 { font-size: 13px; color: #3730a3; margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
              p { font-size: 11px; color: #334155; line-height: 1.6; white-space: pre-wrap; }
              ul { padding-left: 16px; font-size: 11px; color: #334155; }
              li { margin-bottom: 4px; }
              .task-list { list-style-type: none; padding-left: 0; }
              .task-list li { display: flex; align-items: flex-start; margin-bottom: 6px; }
              .checkbox { width: 10px; height: 10px; border: 1px solid #64748b; border-radius: 2px; margin-right: 8px; margin-top: 3px; flex-shrink: 0; }
              .transcript { font-size: 10px; color: #334155; white-space: pre-wrap; background-color: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <div class="header">
              <span>PATERA LEKHA AI MEETING ASSISTANT</span>
              <span class="date">${dateText}</span>
            </div>
            <h1>${recording.title}</h1>
            <div class="meta-container">
              <span class="meta-tag">Duration: ${durationText}</span>
              <span class="meta-tag">Words: ${recording.wordCount || 0}</span>
              <span class="meta-tag">Sentiment: ${recording.sentiment || 'Neutral'}</span>
              <span class="meta-tag">Folder: ${recording.folder || 'General'}</span>
            </div>
            
            <h2>EXECUTIVE SUMMARY</h2>
            <p>${recording.summary || 'No summary generated.'}</p>

            ${overviewHtml}
            ${keyPointsHtml}
            ${actionItemsHtml}
            ${decisionsHtml}
            ${risksHtml}
            ${deadlinesHtml}
            ${qnaHtml}
            ${transcriptHtml}
          </body>
        </html>
      `;

      // Generate PDF via expo-print
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Rename output file to match recording title
      const newPath = `${FileSystem.documentDirectory}${this._sanitizeFileName(recording.title)}.pdf`;
      await FileSystem.moveAsync({
        from: uri,
        to: newPath
      });

      await this._triggerShare(newPath, `Share PDF: ${recording.title}`);
    } catch (e) {
      console.error('Error generating PDF', e);
      throw new Error('Failed to generate PDF document.');
    }
  }

  /**
   * Generate and share plain TXT file
   */
  async generateTxt(recording) {
    try {
      const dateText = new Date(recording.createdAt || recording.dateTime).toLocaleString();
      const durationText = this._formatDuration(recording.durationInSeconds);

      let buffer = `=== ${recording.title.toUpperCase()} ===\n`;
      buffer += `Date: ${dateText}\n`;
      buffer += `Duration: ${durationText}\n`;
      buffer += `Word Count: ${recording.wordCount || 0}\n`;
      buffer += `Sentiment: ${recording.sentiment || 'Neutral'}\n`;
      buffer += `Folder: ${recording.folder || 'General'}\n`;
      buffer += `\n========================================\n\n`;

      buffer += `EXECUTIVE SUMMARY:\n`;
      buffer += `${recording.summary || 'No summary generated.'}\n\n`;

      if (recording.meetingOverview) {
        buffer += `========================================\n\n`;
        buffer += `MEETING OVERVIEW:\n`;
        buffer += `${recording.meetingOverview}\n\n`;
      }

      if (recording.keyPoints && recording.keyPoints.length > 0) {
        buffer += `========================================\n\n`;
        buffer += `KEY POINTS:\n`;
        recording.keyPoints.forEach(point => {
          buffer += `- ${point}\n`;
        });
        buffer += `\n`;
      }

      if (recording.actionItems && recording.actionItems.length > 0) {
        buffer += `========================================\n\n`;
        buffer += `ACTION ITEMS:\n`;
        recording.actionItems.forEach(item => {
          buffer += `[ ] ${item}\n`;
        });
        buffer += `\n`;
      }

      if (recording.keyDecisions && recording.keyDecisions.length > 0) {
        buffer += `========================================\n\n`;
        buffer += `KEY DECISIONS:\n`;
        recording.keyDecisions.forEach(dec => {
          buffer += `* [Decided] ${dec}\n`;
        });
        buffer += `\n`;
      }

      if (recording.risks && recording.risks.length > 0) {
        buffer += `========================================\n\n`;
        buffer += `RISKS & BLOCKERS:\n`;
        recording.risks.forEach(risk => {
          buffer += `! ${risk}\n`;
        });
        buffer += `\n`;
      }

      if (recording.deadlines && recording.deadlines.length > 0) {
        buffer += `========================================\n\n`;
        buffer += `DEADLINES & MILESTONES:\n`;
        recording.deadlines.forEach(dl => {
          buffer += `@ ${dl}\n`;
        });
        buffer += `\n`;
      }

      if (recording.questionsAndAnswers && recording.questionsAndAnswers.length > 0) {
        buffer += `========================================\n\n`;
        buffer += `QUESTIONS & ANSWERS:\n`;
        recording.questionsAndAnswers.forEach(qa => {
          buffer += `Q: ${qa.question}\n`;
          buffer += `A: ${qa.answer}\n\n`;
        });
        buffer += `\n`;
      }

      if (recording.transcript) {
        buffer += `========================================\n\n`;
        buffer += `TRANSCRIPT:\n`;
        buffer += `${recording.transcript}\n`;
      }

      const filename = `${this._sanitizeFileName(recording.title)}.txt`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, buffer, { encoding: FileSystem.EncodingType.UTF8 });
      await this._triggerShare(fileUri, `Share TXT: ${recording.title}`);
    } catch (e) {
      console.error('Error generating TXT', e);
      throw new Error('Failed to generate TXT document.');
    }
  }

  /**
   * Generate and share Microsoft Word compatible HTML/DOCX file
   */
  async generateDocx(recording) {
    try {
      const dateText = new Date(recording.createdAt || recording.dateTime).toLocaleString();
      const durationText = this._formatDuration(recording.durationInSeconds);

      const overviewHtml = recording.meetingOverview
        ? `<h2>Meeting Overview</h2>
           <p>${recording.meetingOverview}</p>`
        : '';

      const keyPointsHtml = recording.keyPoints && recording.keyPoints.length > 0
        ? `<h2>Key Discussion Points</h2>
           <ul>
             ${recording.keyPoints.map(point => `<li>${point}</li>`).join('')}
           </ul>`
        : '';

      const actionItemsHtml = recording.actionItems && recording.actionItems.length > 0
        ? `<h2>Action Items</h2>
           <ul>
             ${recording.actionItems.map(item => `<li><input type="checkbox" /> ${item}</li>`).join('')}
           </ul>`
        : '';

      const decisionsHtml = recording.keyDecisions && recording.keyDecisions.length > 0
        ? `<h2>Key Decisions</h2>
           <ul>
             ${recording.keyDecisions.map(dec => `<li>[Decided] ${dec}</li>`).join('')}
           </ul>`
        : '';

      const risksHtml = recording.risks && recording.risks.length > 0
        ? `<h2>Risks & Blockers</h2>
           <ul>
             ${recording.risks.map(risk => `<li>⚠️ ${risk}</li>`).join('')}
           </ul>`
        : '';

      const deadlinesHtml = recording.deadlines && recording.deadlines.length > 0
        ? `<h2>Deadlines & Milestones</h2>
           <ul>
             ${recording.deadlines.map(dl => `<li>📅 ${dl}</li>`).join('')}
           </ul>`
        : '';

      const qnaHtml = recording.questionsAndAnswers && recording.questionsAndAnswers.length > 0
        ? `<h2>Questions & Answers</h2>
           <ul>
             ${recording.questionsAndAnswers.map(qa => `<li><strong>Q: ${qa.question}</strong><br>A: ${qa.answer}</li>`).join('')}
           </ul>`
        : '';

      const transcriptHtml = recording.transcript
        ? `<h2>Diarized Transcript</h2>
           <div class="transcript">${recording.transcript}</div>`
        : '';

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <title>${recording.title}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }
              p { white-space: pre-wrap; }
              h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
              h2 { color: #2563eb; margin-top: 24px; }
              .meta { color: #6b7280; font-size: 0.9em; margin-bottom: 20px; }
              .transcript { background-color: #f3f4f6; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-size: 0.95em; }
              ul { padding-left: 20px; }
              li { margin-bottom: 6px; }
            </style>
          </head>
          <body>
            <h1>${recording.title}</h1>
            <div class="meta">
              <strong>Date:</strong> ${dateText}<br>
              <strong>Duration:</strong> ${durationText}<br>
              <strong>Words:</strong> ${recording.wordCount || 0}<br>
              <strong>Sentiment:</strong> ${recording.sentiment || 'Neutral'}<br>
              <strong>Folder:</strong> ${recording.folder || 'General'}
            </div>
            
            <h2>Executive Summary</h2>
            <p>${recording.summary || 'No summary generated.'}</p>

            ${overviewHtml}
            ${keyPointsHtml}
            ${actionItemsHtml}
            ${decisionsHtml}
            ${risksHtml}
            ${deadlinesHtml}
            ${qnaHtml}
            ${transcriptHtml}
          </body>
        </html>
      `;

      const filename = `${this._sanitizeFileName(recording.title)}.docx`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, htmlContent, { encoding: FileSystem.EncodingType.UTF8 });
      await this._triggerShare(fileUri, `Share Word: ${recording.title}`);
    } catch (e) {
      console.error('Error generating DOCX', e);
      throw new Error('Failed to generate DOCX document.');
    }
  }

  /**
   * Share file / text using native Sharing module
   */
  async shareData(recording) {
    try {
      const shareText = `Check out the transcript for "${recording.title}" from Patera Lekha AI.`;

      // Since URL sharing differs on mobile, we share the summary text directly
      await Sharing.shareAsync(null, {
        dialogTitle: recording.title,
        mimeType: 'text/plain',
        UTI: 'public.plain-text',
        // In React Native/Expo, we share strings or files. If sharing plain text, we can use React Native's Share API.
        // We'll export the plain text summary as a temp file to share nicely.
        // Or simply delegate to generateTxt.
      });
    } catch (e) {
      console.error('Share failed', e);
    }
  }
}

export default new DocumentService();
