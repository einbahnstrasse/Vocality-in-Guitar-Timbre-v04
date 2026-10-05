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

If you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** so the URL
stays the same.

Before the questions, a setup screen asks whether the participant is on headphones or speakers,
what kind, the connection (wired/Bluetooth), make/model, and has them set a comfortable volume
using `calibration/reference_pink_noise.wav` (pink noise at the average level of the loudest
stimulus). Browsers cannot read the system volume, so participants estimate it (0–100% or
"don't know"), and the review screen asks whether they changed the volume during the test.

Each participant gets **one row**, updated after every answer (`status` = `in progress`, then
`complete` on submit), so partial sessions are kept too. Columns `Q1`–`Q17` hold the chosen letter.
`detail_json` holds play counts per sound, answer changes and time per question.

## Publish (GitHub Pages)

Commit everything (including `audio/`) and push. Then in the GitHub repo: **Settings → Pages →
Deploy from a branch → `master` / root**. The site appears at
`https://einbahnstrasse.github.io/Vocality-in-Guitar-Timbre-v04/`.
