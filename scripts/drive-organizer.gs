/**
 * CargoLink — Google Apps Script: DG File Organizer
 *
 * INSTALLATION:
 * 1. Open the Google Sheet → Extensions → Apps Script
 * 2. Paste this entire file into the editor (replace any existing code)
 * 3. Save (Ctrl+S)
 * 4. Run "installTrigger" once:
 *      Click the function dropdown → select "installTrigger" → Run ▶
 *      Grant permissions when prompted
 * 5. Done. Every new form submission will automatically organize DG files.
 *
 * HOW IT WORKS:
 * When a form response arrives, the script:
 *  - Reads the submitter's name from the "שם מלא" column
 *  - Finds any Drive file URLs in the DG documents / MSDS columns
 *  - Creates a subfolder named after the person inside the form's upload folder
 *  - Moves all their uploaded files into that subfolder
 *
 * Column indices (0-based, matching the response sheet):
 *  0  = Timestamp
 *  1  = שם מלא (submitter name)
 *  22 = DG documents upload
 *  23 = MSDS documents upload
 */

// ── Column indices ───────────────────────────────────────────────────────────
var COL_FULL_NAME  = 1;   // B
var COL_DG_DOCS    = 22;  // W  — DG document uploads
var COL_MSDS_DOCS  = 23;  // X  — MSDS / safety document uploads

// ── Main trigger function ────────────────────────────────────────────────────

/**
 * Called automatically on every form submission.
 * @param {GoogleAppsScript.Events.SheetsOnFormSubmit} e
 */
function onFormSubmitOrganize(e) {
  try {
    var values = e.values; // 0-indexed array of strings

    var submitterName = (values[COL_FULL_NAME] || '').trim();
    if (!submitterName) {
      Logger.log('No submitter name found — skipping organization.');
      return;
    }

    // Collect all file URLs from both DG and MSDS columns
    var rawUrls = [
      values[COL_DG_DOCS]   || '',
      values[COL_MSDS_DOCS] || '',
    ];

    // Each cell can contain multiple comma-separated URLs (multi-file upload)
    var allUrls = [];
    rawUrls.forEach(function(cell) {
      cell.split(',').forEach(function(url) {
        var trimmed = url.trim();
        if (trimmed) allUrls.push(trimmed);
      });
    });

    if (allUrls.length === 0) {
      Logger.log('No file uploads for ' + submitterName + ' — nothing to organize.');
      return;
    }

    Logger.log('Organizing ' + allUrls.length + ' file(s) for: ' + submitterName);

    allUrls.forEach(function(url) {
      var fileId = extractFileId(url);
      if (!fileId) {
        Logger.log('Could not extract file ID from URL: ' + url);
        return;
      }

      try {
        var file = DriveApp.getFileById(fileId);

        // Get the parent folder (the form's upload folder)
        var parents = file.getParents();
        if (!parents.hasNext()) {
          Logger.log('File has no parent folder: ' + file.getName());
          return;
        }
        var uploadFolder = parents.next();

        // Find or create a subfolder named after the submitter
        var subfolder = getOrCreateSubfolder(uploadFolder, submitterName);

        // Move the file into the subfolder
        file.moveTo(subfolder);
        Logger.log('Moved "' + file.getName() + '" → ' + submitterName + '/');

      } catch (fileErr) {
        Logger.log('Error processing file ' + url + ': ' + fileErr.message);
      }
    });

  } catch (err) {
    Logger.log('onFormSubmitOrganize error: ' + err.message);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract a Google Drive file ID from various URL formats.
 * Handles:
 *  - https://drive.google.com/open?id=FILE_ID
 *  - https://drive.google.com/file/d/FILE_ID/view
 *  - https://drive.google.com/uc?id=FILE_ID
 */
function extractFileId(url) {
  var patterns = [
    /[?&]id=([^&\s]+)/,        // ?id=... or &id=...
    /\/file\/d\/([^/\s]+)/,    // /file/d/FILE_ID/
    /\/d\/([^/\s]+)\//,        // generic /d/FILE_ID/
  ];

  for (var i = 0; i < patterns.length; i++) {
    var match = url.match(patterns[i]);
    if (match && match[1]) return match[1];
  }

  return null;
}

/**
 * Find an existing subfolder by name inside parent, or create it.
 */
function getOrCreateSubfolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

// ── Trigger setup ────────────────────────────────────────────────────────────

/**
 * Run this ONCE to install the form-submit trigger.
 * Go to: function dropdown → installTrigger → Run ▶
 */
function installTrigger() {
  // Remove any existing triggers with the same function name to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'onFormSubmitOrganize') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create a new onFormSubmit trigger bound to this spreadsheet
  ScriptApp.newTrigger('onFormSubmitOrganize')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();

  Logger.log('Trigger installed successfully.');
  SpreadsheetApp.getUi().alert('הסקריפט הותקן בהצלחה!\n\nמעכשיו כל קובץ DG שמועלה בטופס יועבר אוטומטית לתיקיה על שם המגיש.');
}

/**
 * Test manually on the most recent form row.
 * Useful for verifying the script works on existing submissions.
 */
function testOnLastRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('תגובות לטופס 1');
  if (!sheet) {
    Logger.log('Sheet not found.');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('No data rows.');
    return;
  }

  var rowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  // Convert to strings (matching e.values format)
  var values = rowData.map(function(v) { return String(v); });

  // Simulate the event object
  onFormSubmitOrganize({ values: values });
  Logger.log('Test complete — check the Execution Log.');
}
