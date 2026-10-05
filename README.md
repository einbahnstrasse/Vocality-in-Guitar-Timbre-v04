# Vocality-in-Guitar-Timbre-v04

![License](https://img.shields.io/badge/license-MIT-brightgreen)
![Version](https://img.shields.io/badge/version-4.0.0-blue)
![Platform](https://img.shields.io/badge/platform-web%20%7C%20mobile-orange)

Mobile web version of the *Vocality in Guitar Timbre* listening test, ported from the Max patch
`V.3_Vocality_in_Guitar_Timbre.maxpat`. A plain static site (HTML/CSS/JS, no build step), hosted on
GitHub Pages, that records each participant's answers to a Google Sheet.

Experimental design by Jason Noble, with assistance from the ACTOR Vocality Working Group, now a part
of the Timbre & Orchestration Network (TONE) Partnership Project. Site designed and implemented by
Louis Goldford and Gabriel Couturier.

## The test

17 questions in a fixed order, as in the V.3 patch.

| Part | Questions | Top button | Options |
|---|---|---|---|
| 1 | 1–5 | test vocal sample: sung melody (`001`, `006`, `011`, `016`, `021`) | Guitar melody A–D: the four guitar versions that follow it |
| 2 | 6–17 | vowel sound: sung vowel `032`–`043` (voice1/2 × pitch B/G × ah/eh/u) | A/B/C: the vowel, then guitar plucked at 1 / 16 / 32 cm (string II for B, string III for G) |

Participant flow:

1. **Front page:** instructions, name, a "How your data is used" privacy notice, and credits.
2. **Listening setup:** headphones or speakers, what kind, connection (wired/Bluetooth), make/model,
   then a volume check against `calibration/reference_pink_noise.wav` (pink noise at the average level
   of the loudest stimulus) and an estimate of their device volume (0–100% or "don't know"). Browsers
   cannot read the system volume, so this is self-reported.
3. **Questions:** play any sound any number of times, in any order; Previous/Next, numbered dots, and
   an **All questions** overview to jump around and change answers.
4. **All questions / submit:** shows unanswered questions and asks whether they changed their volume
   during the test.
5. **Done.**

Every page has a light/dark mode toggle (it follows the device setting until changed).

## Files

```
index.html     page, screens, privacy notice text, credits
style.css      styling (light and dark)
app.js         playback, navigation, saving
questions.js   the 17 questions and their prompt text
config.js      settings: Google Sheet URL, reference sound, audio folder, gap between paired sounds
audio/         the stimuli (copied from media/Vocality_in_Guitar_Timbre_V.3)
calibration/   volume reference sound
apps-script/   Code.gs: the Google Sheet collector (the copy in Google is pasted from this)
archive/       the April 2026 React scaffold, kept for reference only
.nojekyll      tells GitHub Pages to serve the files as they are
tests/         node tests/apps-script.test.mjs: checks Code.gs against an imitation of Google Sheets
docs/context/  project context and decisions (mirrored from Claude Code's memory)
docs/handoffs/ one handoff note per work session: what changed, open items
CLAUDE.md      instructions Claude Code reads at the start of every session
```

Wording is edited in `questions.js` (question prompts and button labels) and `index.html` (front page,
setup questions, privacy notice).

## Run locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. To test on a phone, use your computer's local IP address (same
Wi-Fi network). With `SHEET_URL` empty in `config.js`, answers are printed to the browser console
instead of saved.

## Publish (GitHub Pages)

Commit everything (including `audio/`) and push. Then in the GitHub repo: **Settings → Pages →
Deploy from a branch → `master` / root**. The site appears at
`https://einbahnstrasse.github.io/Vocality-in-Guitar-Timbre-v04/`, usually within a minute of a push;
browsers may show the previous version for up to 10 minutes.

## The Google Sheet

### What it contains

Every session gets a readable `participant_id`: `LAST-First-YYYYMMDD-HHMMSS` (when the session
started, participant's local time), so a retake shows up as a separate id.

- **Responses**: one row per participant, updated after every answer, so unfinished sessions are
  kept. `status` (`in progress`, then `complete` on submit), `Q1`–`Q17` (chosen letter), the listening
  setup, and a summary: `total_minutes`, `total_plays`, `full_listen_pct` (share of plays heard to
  the end), `setup_sec`, `review_sec`. `detail_json` holds the raw data behind both tabs.
- **Listening**: one row per participant × question (17 per participant), written when they submit:
  `answer`, `answer_changes`, `question_time_sec`, and for each play button (`test`, `A`–`D`) three
  columns: `_plays` (times pressed), `_full` (plays heard to the end) and `_sec` (seconds heard).
  `test` is the top button; Part 2 has no `D`, so those cells are blank.
- **Status**: the time and result of the latest health check (see Monitoring).

Time on a page only counts while it is visible: a hidden tab or a locked phone pauses it. A play is
"full" if it reached the end; it is cut short by another button, a second tap, or leaving the question.

### Working in the sheet

- **Sorting and filtering rows is safe**: rows are matched by `participant_id`.
- **Don't insert, delete, or move columns** in Responses or Listening. The script writes values by
  position, so the data would land in the wrong columns. Do analysis in another tab or a copy.
- **Keep the tabs' names**. A renamed or deleted tab is recreated empty by the next save.
- **Keep the sheet private**: the privacy notice tells participants only the research team can see it.
  Anyone with edit access to the sheet can also edit the script.

### Deleting data

- **Test data before launch:** delete data rows only (row 2 down) in Responses and Listening; keep the
  header rows and the tabs. If you're mid-test in a browser, tap **Start a new participant** on the
  Done page first: an unsubmitted session re-sends everything with its next answer and would reappear.
  A submitted session is not sent again.
- **A participant asks to be removed:** filter by their `participant_id` (or name) and delete their
  row in Responses and their 17 rows in Listening.

Deleting rows doesn't affect the daily summary, which counts what happened each day.

### Where the script lives

The script is bound to the spreadsheet: it doesn't appear as a separate file in Google Drive. Open it
from the sheet with **Extensions → Apps Script**, or from **script.google.com → My Projects**. Copying
the spreadsheet copies the script but not its deployment (the site keeps saving to the original);
deleting the spreadsheet deletes the script and saving stops.

### First-time setup (about 5 minutes)

1. Create a new Google Sheet (e.g. "Vocality responses").
2. **Extensions → Apps Script.** Delete the sample code and paste in all of `apps-script/Code.gs`. Save.
3. **Deploy → New deployment.** Click the gear icon, choose **Web app**, then set:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
4. Click **Deploy** and approve the permissions prompt. Google warns that the app is unverified
   because you wrote it yourself: choose *Advanced → Go to … (unsafe)*.
5. Copy the **Web app URL** (ends in `/exec`) and paste it into `SHEET_URL` in `config.js`.
6. Turn on the emails: in the Apps Script editor, pick **`setup`** in the function menu next to
   **Run**, click **Run**, and approve the permissions. A "monitoring is on" email confirms it.
   This is the only function you ever run by hand; the others run when the site sends data.
7. Check it works: open the web app URL in a browser and you should see `{"ok":true,...}`. Then take
   the test once and submit; your rows appear in Responses and Listening.

### Updating the script

1. Paste the new `apps-script/Code.gs` over the old code in the Apps Script editor and save.
2. **Deploy → Manage deployments → pencil icon → Version: New version → Deploy.** Choosing *New
   version* is required: saving alone doesn't change what is live. Editing the existing deployment
   keeps the same URL; *Deploy → New deployment* would create a new URL that `config.js` doesn't use.
3. Open the web app URL: `scriptVersion` should show the new number (`SCRIPT_VERSION` in `Code.gs`).

A dialog saying "An error occurred" means the deploy failed: reload the page and try again. Signing
in to the browser with only the Google account that owns the sheet helps.

## Monitoring

- **Health check:** visiting the web app URL writes to the Status tab and returns `{"ok":true,...}`.
  It returns `"ok":false` if the sheet can't be written or is more than 80% full (Google Sheets holds
  10 million cells, roughly 20,000 participants at this layout).
- **Uptime monitor (recommended):** a free service such as UptimeRobot can load the web app URL every
  5 minutes and email you if the response doesn't contain `"ok":true` (use a *keyword* monitor).
- **Error emails:** if saving fails, the script owner gets an email, at most one per hour.
- **Daily summary:** every morning around 8:00 (the script's time zone), yesterday's sessions started
  and completed, errors, busy delays, and capacity used.
- **Busy periods:** saves are handled one at a time; when the queue is long the site waits and retries,
  keeping answers on the participant's device meanwhile. If the final submit still can't get through,
  the participant sees their answers with a copy button, and the site keeps retrying in the background.
