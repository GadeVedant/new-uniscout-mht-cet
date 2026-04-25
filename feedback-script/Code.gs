/**
 * UniScout Feedback Collector
 * 
 * SETUP:
 * 1. Go to script.google.com → New project
 * 2. Paste this entire file
 * 3. Update SHEET_ID and NOTIFY_EMAIL below
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the web app URL → paste into VITE_FEEDBACK_SCRIPT_URL in your .env
 */

const SHEET_ID = '1pjoaK15TuB5WJhKQI3AzjqxNkadydZTAv8vVyrpPZa4';
const NOTIFY_EMAIL = 'your@email.com'; // ← replace with your actual email

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Feedback')
      || SpreadsheetApp.openById(SHEET_ID).insertSheet('Feedback');

    // Add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Type', 'Message', 'Page', 'Received At']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.type || 'unknown',
      data.message || '',
      data.page || '/',
      new Date().toISOString(),
    ]);

    // Email notification for bugs (optional — remove if noisy)
    if (data.type === 'bug') {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: `🐞 UniScout Bug Report — ${data.page}`,
        body: `Page: ${data.page}\n\nMessage:\n${data.message}\n\nTimestamp: ${data.timestamp}`,
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Health check — visit the web app URL in browser to confirm it's live
function doGet(e) {
  // If query params present, treat as a feedback submission
  if (e && e.parameter && e.parameter.message) {
    try {
      const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      const sheet = spreadsheet.getSheetByName('Sheet1') 
        || spreadsheet.getSheets()[0]; // fallback to first tab

      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Timestamp', 'Type', 'Message', 'Page', 'Received At']);
        sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      }

      sheet.appendRow([
        e.parameter.timestamp || new Date().toISOString(),
        e.parameter.type || 'unknown',
        e.parameter.message || '',
        e.parameter.page || '/',
        new Date().toISOString(),
      ]);

      if (e.parameter.type === 'bug') {
        MailApp.sendEmail({
          to: NOTIFY_EMAIL,
          subject: `🐞 UniScout Bug Report — ${e.parameter.page}`,
          body: `Page: ${e.parameter.page}\n\nMessage:\n${e.parameter.message}\n\nTimestamp: ${e.parameter.timestamp}`,
        });
      }

      return ContentService
        .createTextOutput('OK')
        .setMimeType(ContentService.MimeType.TEXT);
    } catch (err) {
      return ContentService
        .createTextOutput('Error: ' + err.message)
        .setMimeType(ContentService.MimeType.TEXT);
    }
  }

  // Plain health check
  return ContentService
    .createTextOutput('UniScout feedback endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}
