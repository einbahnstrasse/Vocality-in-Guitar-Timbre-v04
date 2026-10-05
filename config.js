// Site settings. Edit these; nothing else needs to change for routine updates.
window.CONFIG = {
  // Paste the Google Apps Script "Web app" URL here (see README → "The Google Sheet" → "First-time setup").
  // Leave empty to run without saving (answers are logged to the browser console).
  SHEET_URL: 'https://script.google.com/macros/s/AKfycby2cnTBZqojHDYyH-yfbgr1xF2fKoRhxXvpnkd68FiuOYsg6BeOghb_oLKswPam639w/exec',

  // Sound used on the setup screen for setting a comfortable volume. Pink noise matched to the
  // average level of the loudest stimulus (031_III_32cm, -29.5 dBFS).
  CALIBRATION_FILE: 'calibration/reference_pink_noise.wav',

  // Folder holding the stimuli, relative to index.html.
  AUDIO_BASE: 'audio/',

  // Part 2: silence (seconds) between the voice and the guitar sample in each pair.
  PAIR_GAP_SEC: 0.25,

  // Written into every response row so results can be traced to a site version.
  VERSION: '4.0.0',
};
