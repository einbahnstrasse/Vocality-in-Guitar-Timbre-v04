---
name: web-port-direction
description: Experiment is a plain static site (no React) on GitHub Pages writing to a Google Sheet via Apps Script; decisions made 2026-10-04
type: project
---

Louis wants the experiment as a plain static site in the GitHub repo (einbahnstrasse/Vocality-in-Guitar-Timbre-v04), no React/app/build tooling. Built 2026-10-04: index.html, style.css, app.js, questions.js, config.js, audio/ (stimuli copied from media/), apps-script/Code.gs. The April 2026 React+Supabase scaffold was moved to archive/react-scaffold-2026-04/ (disposable).

Decisions Louis made (2026-10-04):
- Part 1 wording (revised 2026-10-04): top button "Test vocal sample"; options "Guitar melody A–D"; instructions "Choose which of the following guitar melodies most resembles the test vocal sample."
- Part 2 wording (revised 2026-10-04): "choose which guitar sound most closely matches the vowel sound"; the top button is labelled "Vowel sound" (not "test sample"). Replaces the patch's "more vocal" wording.
- Fixed question order and option order, like the Max patch (no randomization).
- Identify participants by LASTNAME FIRSTNAME, like the patch.
- Responses → Google Sheet via Apps Script web app (chosen as easiest). One row per session, upserted on every answer; status in progress/complete; detail_json has play counts, answer changes, time per question.

- Listening setup screen (added 2026-10-04): headphones vs speakers, type, connection, make/model (write-in, required if "Other"), volume set against calibration/reference_pink_noise.wav (pink noise at -29.5 dBFS mean = loudest stimulus), self-reported device volume 0–100%/unknown, and "did you change volume?" on review. Browsers cannot read OS volume; an on-site volume slider was rejected (extra gain stage).
- Stimuli loudness is uneven (mean -29 to -45 dBFS; Part 1 guitars 3–10 dB below their voice melody). Flagged to Louis, not changed — his call.

- Listening analytics (2026-10-04, SCRIPT_VERSION 4): per play button — plays, full listens, seconds heard; time per page (questions, setup, review; paused when hidden). "Listening" tab = one row per participant × question (17/participant) with <button>_plays/_full/_sec columns — Louis found 73 rows/participant (per button) too long and confusing. Summary columns on Responses. participant_id = LAST-First-YYYYMMDD-HHMMSS (readable, unique per session; retakes get a new id). Louis wants things easy to find in the sheet — prefer flat, readable columns over JSON.
- Apps Script redeploys are error-prone for Louis: edits need Deploy → Manage deployments → Edit → Version: New version; "An error occurred" = deploy failed (retry after reload / single-account window). Verify by curling the /exec URL for scriptVersion.

- Scale/reliability (2026-10-04, SCRIPT_VERSION 5): planned for thousands of participants worldwide. Script uses tryLock → {busy:true} with client jittered backoff; TextFinder row lookup; Listening rows written only on submit; doGet = write-test health check (ok:false at ≥80% capacity); error emails (≤1/hour) and daily summary via `setup` trigger. Uptime monitor (UptimeRobot keyword "ok":true) recommended — Louis's to set up.
- Louis REJECTED converting audio to FLAC ("the audio files we have are working") — keep the original WAVs; don't propose re-encoding again.

**Why:** rapid build, minimal moving parts; the earlier build context was lost.

**How to apply:** keep it framework-free; question/prompt edits go in questions.js, settings in config.js. Web Audio is used so Part 2's voice→guitar pair plays back-to-back on iOS.

Related: [experiment-design](experiment-design.md)
