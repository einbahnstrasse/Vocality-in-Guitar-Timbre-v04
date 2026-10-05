/**
 * Vocality in Guitar Timbre: response collector.
 *
 * Paste this into the Apps Script editor of a Google Sheet (Extensions → Apps Script),
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 *
 * Each participant gets one row, keyed by session id. The site re-sends the whole
 * response set after every answer, so the row is overwritten in place and always
 * holds the latest state ("in progress" until they submit, then "complete").
 */

// Bump this whenever the code changes; visiting the web app URL shows which version is live.
const SCRIPT_VERSION = 2;

const SHEET_NAME = 'Responses';
const QUESTION_COUNT = 17;

const HEADERS = [
  'updated', 'session_id', 'last_name', 'first_name', 'status',
  ...Array.from({ length: QUESTION_COUNT }, (_, i) => 'Q' + (i + 1)),
  'started_at', 'completed_at',
  'listening', 'device_type', 'connection', 'device_model',
  'volume_estimate_pct', 'reference_plays', 'volume_changed',
  'user_agent', 'site_version', 'detail_json',
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d.sessionId) return json_({ ok: false, error: 'missing sessionId' });

    const sheet = getSheet_();
    const answers = d.answers || {};
    const setup = d.setup || {};
    const row = [
      new Date(), d.sessionId, d.lastName || '', d.firstName || '', d.status || '',
      ...Array.from({ length: QUESTION_COUNT }, (_, i) => answers[i + 1] || ''),
      d.startedAt || '', d.completedAt || '',
      setup.listening || '', setup.type || '', setup.connection || '', setup.model || '',
      setup.volumeEstimate ?? '', d.referencePlays ?? '', d.volumeChanged || '',
      d.device || '', d.version || '', JSON.stringify(d.detail || {}),
    ];

    const last = sheet.getLastRow();
    const ids = last > 1 ? sheet.getRange(2, 2, last - 1, 1).getValues().map((r) => r[0]) : [];
    const i = ids.indexOf(d.sessionId);
    if (i >= 0) sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);

    return json_({ ok: true, scriptVersion: SCRIPT_VERSION });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Visiting the web app URL in a browser shows this. Useful to confirm the deployment works.
function doGet() {
  return json_({ ok: true, message: 'Vocality collector is running.', scriptVersion: SCRIPT_VERSION });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  // Write (or update) the header row so it always matches the columns below.
  const header = sheet.getRange(1, 1, 1, HEADERS.length);
  if (header.getValues()[0].join('\t') !== HEADERS.join('\t')) {
    header.setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
