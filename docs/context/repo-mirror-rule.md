---
name: repo-mirror-rule
description: Louis's standing rule — mirror all memory/context into the repo (docs/context/) and write a handoff doc per session (docs/handoffs/)
type: feedback
---

Write and mirror all memory and context to the repo, and use handoff documents for sessions where possible (Louis, 2026-10-04).

**Why:** the April 2026 build context was lost when an old laptop was sold — no transcripts or memory survived on any backup. Context must live with the code.

**How to apply:**
- Every time a memory file here is created/updated/deleted, make the same change in `docs/context/` in the repo (same file names; index in `docs/context/README.md`).
- At the end of each session (or at a major milestone), write or update `docs/handoffs/YYYY-MM-DD-<topic>.md`: state, decisions, open items, gotchas.
- At session start, read `CLAUDE.md`, `docs/context/`, and the newest handoff.
- The repo is PUBLIC and GitHub Pages serves every file: mirrored copies must contain no email addresses, sheet URLs, participant data, or other private details. Strip frontmatter bookkeeping (originSessionId etc.).

Related: [web-port-direction](web-port-direction.md), [working-preferences](working-preferences.md)
