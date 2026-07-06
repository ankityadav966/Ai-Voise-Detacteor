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
   * Trigger browser file download of Blob
   */
  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate and print a PDF document
   */
  async generatePdf(recording) {
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
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background: white; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e0e7ff; padding-bottom: 8px; margin-bottom: 20px; font-size: 10px; color: #4f46e5; font-weight: bold; }
            .date { color: #64748b; font-weight: normal; }
            h1 { font-size: 24px; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
            .meta-container { display: flex; margin-bottom: 24px; }
            .meta-tag { background-color: #e0e7ff; color: #4338ca; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-right: 10px; }
            h2 { font-size: 14px; color: #3730a3; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            p { font-size: 12px; color: #334155; line-height: 1.6; white-space: pre-wrap; }
            ul { padding-left: 20px; font-size: 12px; color: #334155; }
            li { margin-bottom: 6px; }
            .task-list { list-style-type: none; padding-left: 0; }
            .task-list li { display: flex; align-items: flex-start; margin-bottom: 8px; }
            .checkbox { width: 12px; height: 12px; border: 1px solid #64748b; border-radius: 2px; margin-right: 8px; margin-top: 3px; flex-shrink: 0; }
            .transcript { font-size: 11px; color: #334155; white-space: pre-wrap; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
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
            <span class="meta-tag">Words: ${recording.wordCount}</span>
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

    // Create a temporary hidden iframe and print it to save as PDF
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Trigger Print after loading content
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Remove iframe
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }

  /**
   * Generate and download plain TXT file
   */
  async generateTxt(recording) {
    const dateText = new Date(recording.createdAt || recording.dateTime).toLocaleString();
    const durationText = this._formatDuration(recording.durationInSeconds);

    let buffer = `=== ${recording.title.toUpperCase()} ===\n`;
    buffer += `Date: ${dateText}\n`;
    buffer += `Duration: ${durationText}\n`;
    buffer += `Word Count: ${recording.wordCount}\n`;
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

    const blob = new Blob([buffer], { type: 'text/plain;charset=utf-8' });
    const filename = `${this._sanitizeFileName(recording.title)}.txt`;
    this._triggerDownload(blob, filename);
  }

  /**
   * Generate and download Microsoft Word compatible HTML/DOCX file
   */
  async generateDocx(recording) {
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
            <strong>Words:</strong> ${recording.wordCount}<br>
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

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const filename = `${this._sanitizeFileName(recording.title)}.docx`;
    this._triggerDownload(blob, filename);
  }

  /**
   * Share file / text using Web Share API
   */
  async shareData(recording) {
    const shareText = `Check out transcript for ${recording.title} from Patera Lekha AI.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: recording.title,
          text: shareText,
          url: window.location.href,
        });
      } catch (e) {
        console.error('Share failed', e);
      }
    } else {
      // Fallback: Copy info link
      navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
      alert('Sharing details copied to clipboard!');
    }
  }
}

export default new DocumentService();
