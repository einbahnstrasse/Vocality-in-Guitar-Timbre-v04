# Vocality-in-Guitar-Timbre-v04

Mobile web version of the *Vocality in Guitar Timbre* listening test, ported from the Max patch
`V.3_Vocality_in_Guitar_Timbre.maxpat`. A plain static site (HTML/CSS/JS, no build step) that
records each participant's answers to a Google Sheet.

## The test

17 questions, fixed order, as in the V.3 patch.

| Part | Questions | Played alone | Options |
|---|---|---|---|
| 1 | 1–5 | sung melody (`001`, `006`, `011`, `016`, `021`) | A–D: the four guitar versions that follow it |
| 2 | 6–17 | sung vowel `032`–`043` (voice1/2 × pitch B/G × ah/eh/u) | A/B/C: voice, then guitar plucked at 1 / 16 / 32 cm (string II for B, string III for G) |

Participants can play every sound any number of times, move back and forth, change answers, and
review before submitting. Prompt text lives in `questions.js`.

## Files

```
index.html     page and screens
style.css      styling
app.js         playback, navigation, saving
questions.js   the 17 questions and their prompt text
config.js      settings: Google Sheet URL, audio folder, gap between paired sounds
audio/         the stimuli (copied from media/Vocality_in_Guitar_Timbre_V.3)
calibration/   volume reference sound
apps-script/   Code.gs: the Google Sheet collector
archive/       the April 2026 React scaffold, kept for reference only
```

## Run locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. To test on a phone, use your computer's local IP address
(same Wi-Fi network). With `SHEET_URL` empty, answers are printed to the browser console
instead of saved.

## Google Sheet setup (one time, about 5 minutes)

1. Create a new Google Sheet (e.g. "Vocality responses").
2. **Extensions → Apps Script.** Delete the sample code and paste in all of `apps-script/Code.gs`. Save.
3. **Deploy → New deployment.** Click the gear icon, choose **Web app**, then set:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
4. Click **Deploy** and approve the permissions prompt. Google warns that the app is unverified
   because you wrote it yourself: choose *Advanced → Go to … (unsafe)*.
5. Copy the **Web app URL** (ends in `/exec`) and paste it into `SHEET_URL` in `config.js`.
6. Check it works: open the URL in a browser and you should see `{"ok":true,...}`. Then take the
   test once; a `Responses` tab appears with your row.

7. Turn on the daily email: in the Apps Script editor, pick **`setup`** in the function menu next to
   **Run**, click **Run**, and approve the permissions. A "monitoring is on" email confirms it.

If you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → Version: New version → Deploy**
so the URL stays the same. A dialog saying "An error occurred" means the deploy failed: reload the
page and try again (signing in with only one Google account helps). Visiting the web app URL shows
`scriptVersion`, so you can confirm which version is live.

### Monitoring

- **Health check:** visiting the web app URL writes to the sheet and returns `{"ok":true,...}`. It
  returns `"ok":false` if the sheet can't be written or is more than 80% full (Google Sheets holds
  10 million cells, roughly 20,000 participants).
- **Uptime monitor (recommended):** a free service such as UptimeRobot can load the web app URL every
  5 minutes and email you if the response doesn't contain `"ok":true` (use a *keyword* monitor).
- **Error emails:** if saving fails, the script owner gets an email, at most one per hour.
- **Daily summary:** every morning, yesterday's sessions started/completed, errors, and capacity used.
- **Busy periods:** saves are handled one at a time; when the queue is long the site waits and
  retries, keeping answers on the participant's device meanwhile. If the final submit still can't
  get through, the participant sees their answers with a copy button, and the site keeps retrying.

Before the questions, a setup screen asks whether the participant is on headphones or speakers,
what kind, the connection (wired/Bluetooth), make/model, and has them set a comfortable volume
using `calibration/reference_pink_noise.wav` (pink noise at the average level of the loudest
stimulus). Browsers cannot read the system volume, so participants estimate it (0–100% or
"don't know"), and the review screen asks whether they changed the volume during the test.

The sheet has two tabs, both updated after every answer, so partial sessions are kept too:

Every session gets a readable `participant_id`: `LAST-First-YYYYMMDD-HHMMSS` (when the session
started, participant's local time), so a retake shows up as a separate id.

- **Responses**: one row per participant. `status` (`in progress`, then `complete` on submit),
  `Q1`–`Q17` (chosen letter), the listening setup, and a summary: `total_minutes`, `total_plays`,
  `full_listen_pct` (share of plays heard to the end), `setup_sec`, `review_sec`.
- **Listening**: one row per participant × question (17 per participant), written on submit: `answer`,
  `answer_changes`, `question_time_sec`, and for each play button (`test`, `A`–`D`) three columns:
  `_plays` (times pressed), `_full` (plays heard to the end) and `_sec` (seconds heard). `test` is the
  top button (test vocal sample / vowel sound); Part 2 has no `D`, so those cells are blank.
  Safe to sort and filter.

Time on a page only counts while it is visible (a hidden tab or locked phone pauses it).
`detail_json` keeps the raw data behind both tabs.

## Publish (GitHub Pages)

Commit everything (including `audio/`) and push. Then in the GitHub repo: **Settings → Pages →
Deploy from a branch → `master` / root**. The site appears at
`https://einbahnstrasse.github.io/Vocality-in-Guitar-Timbre-v04/`.
