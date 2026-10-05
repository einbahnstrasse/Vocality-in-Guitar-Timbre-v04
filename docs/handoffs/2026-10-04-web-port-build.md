# Handoff: 2026-10-04, web port built and launched for piloting

## Where things stand

The Max patch (`V.3_Vocality_in_Guitar_Timbre.maxpat`) has been ported to a static website, live on
GitHub Pages and saving to a Google Sheet. Apps Script **version 5** is deployed and passing its health
check. The April 2026 React/Supabase scaffold (built on a laptop that was later sold, with its context
lost) is kept in `archive/` for reference only.

Built this session, in order:

1. Decoded the patch: 17 questions; Part 1 (Q1–5) voice melody vs guitar melodies A–D; Part 2 (Q6–17)
   sung vowel vs guitar plucked at 1/16/32 cm (A/B/C). Details: `docs/context/experiment-design.md`.
2. Static site: registration → listening setup → questions → All questions/submit → done.
3. Google Sheet collector (Apps Script): Responses (1 row/participant), Listening (17 rows/participant,
   written on submit), Status (health check).
4. Listening setup screen: headphones/speakers, type, connection, model, volume reference
   (`calibration/reference_pink_noise.wav`), self-reported volume, "changed volume?" at the end.
5. Listening analytics: plays, full listens, seconds heard per button; time per page.
6. Readable `participant_id` = `LAST-First-YYYYMMDD-HHMMSS`.
7. Scale and reliability: busy handling with retries, error emails, daily summary, health check.
8. Wording changes (Part 1 "test vocal sample" / "Guitar melody A–D"; Part 2 "vowel sound"), light/dark
   toggle, All questions button, privacy notice, credits, README badges (MIT, 4.0.0, web | mobile).
9. Fixed a submit race: the Done page could say "saved" before the completed version was sent, and a
   closed tab then lost it (live symptom: row stuck at "in progress", no Listening rows). Saves now only
   count if nothing changed since sending, and use `keepalive`.

## Open items

- [ ] **Push the race fix.** `app.js` changed after the last push (`b70eed5`). Commit and push it, then
      re-test on the live site: submit, wait for "Your answers have been saved.", and check that the
      row is `complete` with 17 Listening rows.
- [ ] **Delete test rows** in the sheet, including the `ZZTEST-Claude-…` row and its 17 Listening rows
      sent while debugging.
- [ ] **Confirm `setup` was run** (a "monitoring is on" email). Without it there are no error emails or
      daily summaries.
- [ ] **Uptime monitor:** UptimeRobot keyword monitor on the web app URL for `"ok":true`.
- [ ] **Privacy notice:** add contact details; confirm its promises (sheet private to the team, names
      never published); add IRB/ethics-approved consent wording if required.
- [ ] **Colleague pilot:** optionally set `VERSION` in `config.js` to a pilot label so pilot rows can be
      filtered out, then restore it.
- [ ] Optional: Part 1 prompt is still the patch's "Which answer corresponds best?".

## Flagged, not acted on (researcher's call)

- Stimulus loudness is uneven: mean −29 to −45 dBFS; in Part 1 each guitar version is 3–10 dB quieter
  than its voice melody.
- What distinguishes Part 1's guitar versions A–D is unknown to the assistant.
- Bandwidth: each participant downloads up to ~61 MB of WAV over the test; GitHub Pages' soft limit is
  ~100 GB/month (~1,600 participants/month). FLAC was proposed and rejected; WAVs stay as they are.

## Gotchas

- **Apps Script deploys:** saving doesn't change what's live. Use Manage deployments → Edit → Version:
  **New version**. "An error occurred" means the deploy failed; reload and retry. Check `scriptVersion`
  at the web app URL.
- **Don't insert or move columns** in Responses or Listening: values are written by position.
- **Deleting rows mid-session:** an unsubmitted session in a browser re-sends with its next answer. Tap
  "Start a new participant" first.
- **Sheet header rows** are rewritten automatically to match `Code.gs`.
- **Local vs live:** GitHub Pages is case-sensitive and caches for about 10 minutes; `.nojekyll` is
  present. Saved progress (localStorage) is separate per address.
- **Testing:** `node tests/apps-script.test.mjs` for the script. Browser end-to-end tests used
  `puppeteer-core` with the system Chrome and a local stand-in for the sheet. They lived in a temporary
  folder and are not in the repo; recreate them if needed.
