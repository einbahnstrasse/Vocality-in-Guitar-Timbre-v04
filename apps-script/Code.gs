/**
 * Vocality in Guitar Timbre: response collector.
 *
 * Paste this into the Apps Script editor of a Google Sheet (Extensions → Apps Script),
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * After that, run `setup` once from the editor to turn on the daily summary email.
 *
 * Tabs:
 *   Responses  one row per participant: name, answers Q1–Q17, listening setup, summary.
 *              Updated after every answer ("in progress" until they submit, then "complete").
 *   Listening  one row per participant × question: answer, time on the question, and for
 *              each play button its plays, full listens and seconds heard. Written on submit.
 *   Status     the latest health check (see doGet).
 *
 * participant_id is LAST-First-YYYYMMDD-HHMMSS (session start), so a retake gets a new id.
 *
 * Monitoring:
 *   - Visiting the web app URL runs a health check: it writes to the sheet and reports
 *     {"ok":true,...}. An uptime monitor can watch for that text.
 *   - Errors are emailed to the script owner, at most once an hour.
 *   - `dailySummary` emails yesterday's numbers every morning (turned on by `setup`).
 */

// Bump this whenever the code changes; visiting the web app URL shows which version is live.
const SCRIPT_VERSION = 5;

const SHEET_NAME = 'Responses';
const QUESTION_COUNT = 17;
const CELL_LIMIT = 10000000;        // Google Sheets maximum, across all tabs
const CAPACITY_ALERT_PCT = 80;      // health check fails above this, so the monitor alerts

const HEADERS = [
  'updated', 'participant_id', 'last_name', 'first_name', 'status',
  ...Array.from({ length: QUESTION_COUNT }, (_, i) => 'Q' + (i + 1)),
  'started_at', 'completed_at',
  'listening', 'device_type', 'connection', 'device_model',
  'volume_estimate_pct', 'reference_plays', 'volume_changed',
  'user_agent', 'site_version', 'detail_json',
  'total_minutes', 'total_plays', 'full_listen_pct', 'setup_sec', 'review_sec',
];
const STATUS_COL = HEADERS.indexOf('status') + 1;

const LISTEN_SHEET_NAME = 'Listening';
const LISTEN_HEADERS = [
  'updated', 'participant_id', 'last_name', 'first_name',
  'question', 'part', 'test_file', 'answer', 'answer_changes', 'question_time_sec',
  ...['test', 'A', 'B', 'C', 'D'].flatMap((b) => [b + '_plays', b + '_full', b + '_sec']),
];

const STATUS_SHEET_NAME = 'Status';
const STATUS_HEADERS = ['last_health_check', 'script_version', 'participants', 'completed', 'capacity_used_pct'];

// ---------------------------------------------------------------- web app

function doPost(e) {
  const lock = LockService.getScriptLock();
  // Saves are handled one at a time. If the queue is long, tell the site to retry later
  // rather than failing; it keeps the answers on the participant's device meanwhile.
  if (!lock.tryLock(15000)) {
    countEvent_('busy');
    return json_({ ok: false, busy: true, error: 'busy' });
  }
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d.sessionId) return json_({ ok: false, error: 'missing sessionId' });

    const sheet = getSheet_(SHEET_NAME, HEADERS);
    const answers = d.answers || {};
    const setup = d.setup || {};
    const sum = d.summary || {};
    const now = new Date();
    const row = [
      now, d.sessionId, d.lastName || '', d.firstName || '', d.status || '',
      ...Array.from({ length: QUESTION_COUNT }, (_, i) => answers[i + 1] || ''),
      d.startedAt || '', d.completedAt || '',
      setup.listening || '', setup.type || '', setup.connection || '', setup.model || '',
      setup.volumeEstimate ?? '', d.referencePlays ?? '', d.volumeChanged || '',
      d.device || '', d.version || '', JSON.stringify(d.detail || {}),
      sum.totalMinutes ?? '', sum.totalPlays ?? '', sum.fullListenPct ?? '', sum.setupSec ?? '', sum.reviewSec ?? '',
    ];

    const r = findRows_(sheet, d.sessionId)[0];
    const wasComplete = r ? sheet.getRange(r, STATUS_COL).getValue() === 'complete' : false;
    if (r) {
      sheet.getRange(r, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
      countEvent_('started');
    }
    if (d.status === 'complete') {
      if (!wasComplete) countEvent_('completed');
      if (Array.isArray(d.rows)) writeListening_(d, now);
    }

    return json_({ ok: true, scriptVersion: SCRIPT_VERSION });
  } catch (err) {
    countEvent_('errors');
    notifyError_('Saving a response failed', err);
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Health check. Visiting the web app URL writes a timestamp to the Status tab, so a success
// means the sheet is reachable and writable, not just that the script runs.
function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const responses = getSheet_(SHEET_NAME, HEADERS);
    const participants = Math.max(responses.getLastRow() - 1, 0);
    const completed = participants
      ? responses.getRange(2, STATUS_COL, participants, 1).createTextFinder('complete').matchEntireCell(true).findAll().length
      : 0;
    const capacity = capacityPct_(ss);
    const status = getSheet_(STATUS_SHEET_NAME, STATUS_HEADERS);
    status.getRange(2, 1, 1, STATUS_HEADERS.length)
      .setValues([[new Date(), SCRIPT_VERSION, participants, completed, capacity]]);

    const full = capacity >= CAPACITY_ALERT_PCT;
    return json_({
      ok: !full,
      message: full ? `Spreadsheet is ${capacity}% full: start a new one soon.` : 'Vocality collector is running.',
      scriptVersion: SCRIPT_VERSION,
      participants,
      completed,
      capacityUsedPct: capacity,
    });
  } catch (err) {
    notifyError_('Health check failed', err);
    return json_({ ok: false, error: String(err), scriptVersion: SCRIPT_VERSION });
  }
}

// ---------------------------------------------------------------- monitoring

// Run once from the Apps Script editor (choose "setup" in the function menu, then Run).
// Turns on the daily summary email and sends a test email to confirm it works.
function setup() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'dailySummary')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailySummary').timeBased().everyDays(1).atHour(8).create();
  MailApp.sendEmail(ownerEmail_(), 'Vocality test: monitoring is on',
    'You will get a summary of the previous day\'s sessions every morning around 8:00 ' +
    `(${Session.getScriptTimeZone()}), and an email whenever saving fails (at most one per hour).\n\n` +
    SpreadsheetApp.getActiveSpreadsheet().getUrl());
}

// Emailed every morning by the trigger that `setup` creates.
function dailySummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  const yesterday = dayKey_(new Date(Date.now() - 24 * 3600 * 1000));
  const s = JSON.parse(props.getProperty('stats:' + yesterday) || '{}');
  const responses = getSheet_(SHEET_NAME, HEADERS);
  const participants = Math.max(responses.getLastRow() - 1, 0);
  const capacity = capacityPct_(ss);

  const lines = [
    `Yesterday (${yesterday}):`,
    `  sessions started:     ${s.started || 0}`,
    `  sessions completed:   ${s.completed || 0}`,
    `  save errors:          ${s.errors || 0}`,
    `  saves delayed (busy): ${s.busy || 0}`,
    '',
    `All time: ${participants} participants.`,
    `Spreadsheet capacity used: ${capacity}%` + (capacity >= CAPACITY_ALERT_PCT ? '  <- start a new spreadsheet soon' : ''),
    '',
    ss.getUrl(),
  ];
  const subject = `Vocality test: ${s.started || 0} started, ${s.completed || 0} completed yesterday` +
    ((s.errors || 0) > 0 ? `, ${s.errors} errors` : '');
  MailApp.sendEmail(ownerEmail_(), subject, lines.join('\n'));

  // Drop counters older than two weeks.
  const cutoff = dayKey_(new Date(Date.now() - 14 * 24 * 3600 * 1000));
  Object.keys(props.getProperties())
    .filter((k) => k.startsWith('stats:') && k.slice(6) < cutoff)
    .forEach((k) => props.deleteProperty(k));
}

function countEvent_(name) {
  try {
    const props = PropertiesService.getScriptProperties();
    const key = 'stats:' + dayKey_(new Date());
    const s = JSON.parse(props.getProperty(key) || '{}');
    s[name] = (s[name] || 0) + 1;
    props.setProperty(key, JSON.stringify(s));
  } catch (err) { /* counting must never break saving */ }
}

// Emails the owner about a failure, at most once an hour.
function notifyError_(what, err) {
  try {
    const cache = CacheService.getScriptCache();
    if (cache.get('error-email-sent')) return;
    cache.put('error-email-sent', '1', 3600);
    MailApp.sendEmail(ownerEmail_(), 'Vocality test: ' + what,
      `${what} at ${new Date()}:\n\n${err && err.stack ? err.stack : err}\n\n` +
      'Further errors in the next hour will not be emailed. Daily totals arrive in the morning summary.\n\n' +
      SpreadsheetApp.getActiveSpreadsheet().getUrl());
  } catch (e) { /* never let reporting break saving */ }
}

// ---------------------------------------------------------------- sheet helpers

// Replaces this participant's rows in the Listening tab. Rows are found by participant id,
// so sorting or filtering the tab is safe.
function writeListening_(d, now) {
  const sheet = getSheet_(LISTEN_SHEET_NAME, LISTEN_HEADERS);
  const rows = findRows_(sheet, d.sessionId).sort((a, b) => b - a);
  // Delete bottom-up, in contiguous runs.
  for (let i = 0; i < rows.length; ) {
    let j = i;
    while (j + 1 < rows.length && rows[j + 1] === rows[j] - 1) j++;
    sheet.deleteRows(rows[j], rows[i] - rows[j] + 1);
    i = j + 1;
  }
  const fixed = { updated: now, participant_id: d.sessionId, last_name: d.lastName || '', first_name: d.firstName || '' };
  const values = d.rows.map((r) => LISTEN_HEADERS.map((h) => (h in fixed ? fixed[h] : r[h] ?? '')));
  if (values.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, values.length, LISTEN_HEADERS.length).setValues(values);
  }
}

// Row numbers whose participant_id (column B) matches exactly.
function findRows_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 2, last - 1, 1)
    .createTextFinder(String(id)).matchEntireCell(true).findAll()
    .map((cell) => cell.getRow());
}

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  // Write (or update) the header row so it always matches the columns.
  const header = sheet.getRange(1, 1, 1, headers.length);
  if (header.getValues()[0].join('\t') !== headers.join('\t')) {
    header.setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Share of the 10-million-cell limit in use. Empty grid cells count too.
function capacityPct_(ss) {
  const cells = ss.getSheets().reduce((n, s) => n + s.getMaxRows() * s.getMaxColumns(), 0);
  return Math.round((cells / CELL_LIMIT) * 1000) / 10;
}

function dayKey_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function ownerEmail_() {
  return Session.getEffectiveUser().getEmail();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
