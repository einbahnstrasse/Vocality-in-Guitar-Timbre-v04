# Working on this repo

Web version of the *Vocality in Guitar Timbre* listening test: a plain static site (no framework,
no build step) on GitHub Pages that saves responses to a Google Sheet through an Apps Script web app.
See `README.md` for how it works and how to operate it.

## Context and handoffs (standing rule)

All project memory and context is mirrored into this repo, and each session leaves a handoff.

- **At the start of a session:** read `docs/context/` (durable facts and decisions) and the newest file
  in `docs/handoffs/` (where the last session stopped, open items).
- **Whenever memory changes:** make the same change in `docs/context/` (one topic per file, index in
  `docs/context/README.md`).
- **At the end of a session or a major milestone:** write or update
  `docs/handoffs/YYYY-MM-DD-<topic>.md`: what changed, decisions, open items, gotchas.

**This repo is public and GitHub Pages serves every file in it.** Never put email addresses, the
spreadsheet's URL, participant data, credentials, or other private details in any file.

## Conventions

- Keep it framework-free: HTML, CSS, vanilla JS. Wording lives in `questions.js` and `index.html`;
  settings in `config.js`.
- Don't modify the stimuli in `audio/`.
- The maintainer commits and pushes; don't commit or push unless asked.
- After changing `apps-script/Code.gs`, bump `SCRIPT_VERSION`; the maintainer redeploys it by hand
  (README → "Updating the script"). Confirm what's live by fetching the web app URL in `config.js`
  and reading `scriptVersion`.
- `node tests/apps-script.test.mjs` exercises `Code.gs` against an in-memory imitation of Google Sheets.
